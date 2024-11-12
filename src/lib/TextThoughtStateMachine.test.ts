import { beforeEach, describe, expect, test, vi } from "vitest";
import { TextThoughtStateMachine } from "./TextThoughtStateMachine";

describe("TextThoughtStateMachine", () => {
	let mockDispatch: ReturnType<typeof vi.fn>;
	let stateMachine: TextThoughtStateMachine;

	beforeEach(() => {
		mockDispatch = vi.fn();
		stateMachine = new TextThoughtStateMachine({ dispatch: mockDispatch });
	});

	test("should switch between text and thought modes", () => {
		stateMachine.append("<plan>This is a thought</plan>This is text");

		expect(mockDispatch).toHaveBeenCalledTimes(2);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				type: "APPEND_THOUGHT",
				textDelta: "This is a thought",
			}),
		);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				type: "APPEND_TEXT",
				textDelta: "This is text",
			}),
		);
	});

	test("should handle incomplete tags at buffer end", () => {
		stateMachine.append("Text <pl");

		expect(mockDispatch).toHaveBeenCalledTimes(1);
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "APPEND_TEXT",
				textDelta: "Text ",
			}),
		);
		expect(stateMachine.buffer).toBe("<pl");
	});

	test("should ignore unrelated tags inside text", () => {
		stateMachine.append("Text <play>Action</play> More text");

		expect(mockDispatch).toHaveBeenCalledTimes(1);
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "APPEND_TEXT",
				textDelta: "Text <play>Action</play> More text",
			}),
		);
	});

	test("should ignore unrelated tags inside thought", () => {
		stateMachine.append("<plan>Do some <play>music</play></plan> Some text");

		expect(mockDispatch).toHaveBeenCalledTimes(2);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				type: "APPEND_THOUGHT",
				textDelta: "Do some <play>music</play>",
			}),
		);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				type: "APPEND_TEXT",
				textDelta: " Some text",
			}),
		);
	});

	test("should ignore unrelated leading tags", () => {
		stateMachine.append("<play>Action</play> is what we need");

		expect(mockDispatch).toHaveBeenCalledTimes(1);
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "APPEND_TEXT",
				textDelta: "<play>Action</play> is what we need",
			}),
		);
	});

	test("should handle comparison operators in text", () => {
		stateMachine.append("if x < y then do something");

		expect(mockDispatch).toHaveBeenCalledTimes(1);
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "APPEND_TEXT",
				textDelta: "if x < y then do something",
			}),
		);
	});

	test("should throw error when resetting with non-empty buffer", () => {
		stateMachine.append("Hello world<plan>Here's what we'll do</plan");
		expect(() => stateMachine.reset()).toThrow('Buffer was not empty: "</plan"');
	});

	test("should handle multiple plan tags in one buffer", () => {
		stateMachine.append("<plan>Thought 1</plan>Text<plan>Thought 2</plan>");

		expect(mockDispatch).toHaveBeenCalledTimes(3);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				type: "APPEND_THOUGHT",
				textDelta: "Thought 1",
			}),
		);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				type: "APPEND_TEXT",
				textDelta: "Text",
			}),
		);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			3,
			expect.objectContaining({
				type: "APPEND_THOUGHT",
				textDelta: "Thought 2",
			}),
		);
	});

	test("should handle starting with text, then a plan, then more text", () => {
		stateMachine.append("Initial text<plan>This is a thought</plan>More text");

		expect(mockDispatch).toHaveBeenCalledTimes(3);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				type: "APPEND_TEXT",
				textDelta: "Initial text",
			}),
		);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				type: "APPEND_THOUGHT",
				textDelta: "This is a thought",
			}),
		);
		expect(mockDispatch).toHaveBeenNthCalledWith(
			3,
			expect.objectContaining({
				type: "APPEND_TEXT",
				textDelta: "More text",
			}),
		);
	});
});
