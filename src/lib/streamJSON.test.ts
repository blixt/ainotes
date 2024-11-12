import { describe, expect, test } from "vitest";
import { expectAsyncIterable, expectInstanceOf, expectToBeFalsy } from "../test/helpers";
import { StreamingArray, StreamingJSON, StreamingObject, type UnparsedValue } from "./streamJSON";

describe("StreamingJSON", () => {
	// Helper function to create a StreamingJSON instance from a string
	function createStreamingJSON(chunks: string | string[]) {
		const stream = (async function* () {
			yield* chunks;
		})();
		return new StreamingJSON(stream);
	}

	describe("Simple parsing", () => {
		test("Parse a simple string", async () => {
			const json = createStreamingJSON('"Hello, World!"');
			const result = await json.value();
			expect(result).toBe("Hello, World!");
		});

		test("Parse a number", async () => {
			const json = createStreamingJSON("42.5");
			const result = await json.value();
			expect(result).toBe(42.5);
		});

		test("Parse a boolean", async () => {
			const json = createStreamingJSON("true");
			const result = await json.value();
			expect(result).toBe(true);
		});

		test("Parse null", async () => {
			const json = createStreamingJSON("null");
			const result = await json.value();
			expect(result).toBeNull();
		});
	});

	describe("String chunk parsing", () => {
		test("Parse a simple string using stringChunks", async () => {
			const json = createStreamingJSON('"Hello, World!"');
			const chunks = [];
			for await (const chunk of json.stringChunks()) {
				chunks.push(chunk);
			}
			expect(chunks.join("")).toBe("Hello, World!");
		});

		test("Parse a long string with different buffer sizes", async () => {
			const longString = "A".repeat(1000) + "B".repeat(1000) + "C".repeat(1000);
			const jsonString = `"${longString}"`;

			// Test with small buffer size
			const smallBufferStream = (async function* () {
				for (let i = 0; i < jsonString.length; i += 10) {
					yield jsonString.slice(i, i + 10);
				}
			})();
			const smallBufferJson = new StreamingJSON(smallBufferStream);
			let result = "";
			for await (const chunk of smallBufferJson.stringChunks()) {
				result += chunk;
			}
			expect(result).toBe(longString);

			// Test with large buffer size
			const largeBufferStream = (async function* () {
				for (let i = 0; i < jsonString.length; i += 500) {
					yield jsonString.slice(i, i + 500);
				}
			})();
			const largeBufferJson = new StreamingJSON(largeBufferStream);
			result = "";
			for await (const chunk of largeBufferJson.stringChunks()) {
				result += chunk;
			}
			expect(result).toBe(longString);
		});
	});

	describe("String escape sequence parsing", () => {
		test("Parse string with various escape sequences", async () => {
			const json = createStreamingJSON('"\\u0048\\u0065\\u006C\\u006C\\u006F, \\"World\\"! \\n\\t\\r\\b\\f"');
			const result = await json.string();
			expect(result).toBe('Hello, "World"! \n\t\r\b\f');
		});

		test("Parse string with escaped Unicode surrogate pairs", async () => {
			const json = createStreamingJSON('"\\uD834\\uDD1E"'); // Musical G-clef symbol
			const result = await json.string();
			expect(result).toBe("𝄞");
		});

		test("Parse string with mixed ASCII and Unicode escape sequences", async () => {
			const json = createStreamingJSON('"\\u00A9 2023 \\u00AE \\u2122 \\u20AC50"');
			const result = await json.string();
			expect(result).toBe("© 2023 ® ™ €50");
		});

		test("Parse string with escaped backslash followed by valid escape sequence", async () => {
			const json = createStreamingJSON('"This is a backslash \\\\ followed by a newline \\n"');
			const result = await json.string();
			expect(result).toBe("This is a backslash \\ followed by a newline \n");
		});

		test("Parse string with multiple consecutive escape sequences", async () => {
			const json = createStreamingJSON('"\\u0041\\u0042\\u0043\\t\\r\\n\\b\\f"');
			const result = await json.string();
			expect(result).toBe("ABC\t\r\n\b\f");
		});

		test("Parse string with escape sequences split across chunks", async () => {
			const jsonString = '"This string has a split escape sequence: \\u00';
			const jsonString2 = 'A9 at the chunk boundary"';
			const stream = (async function* () {
				yield jsonString;
				yield jsonString2;
			})();
			const json = new StreamingJSON(stream);
			const result = await json.string();
			expect(result).toBe("This string has a split escape sequence: © at the chunk boundary");
		});

		test("Throw error on invalid escape sequence", async () => {
			const json = createStreamingJSON('"Invalid escape: \\x"');
			await expect(json.string()).rejects.toThrow("Invalid escape sequence: \\x");
		});

		test("Throw error on incomplete Unicode escape sequence", async () => {
			const json = createStreamingJSON('"Incomplete Unicode: \\u00A"');
			await expect(json.string()).rejects.toThrow("Invalid Unicode escape sequence: \\u00A");
		});

		test("Parse a string with escape characters", async () => {
			const json = createStreamingJSON('"Hello,\\nWorld!\\t\\"Escaped\\"\\u0041"');
			const chunks = [];
			for await (const chunk of json.stringChunks()) {
				chunks.push(chunk);
			}
			expect(chunks.join("")).toBe('Hello,\nWorld!\t"Escaped"A');
		});
	});

	describe("Object parsing", () => {
		test("Parse a simple object using iterator", async () => {
			const json = createStreamingJSON('{"name": "Alice", "age": 30}');
			const obj = await json.object();
			expectInstanceOf(obj, StreamingObject);

			const entries = [];
			for await (const [key, unparsed] of obj) {
				entries.push([key, await unparsed.value()]);
			}

			expect(entries).toEqual([
				["name", "Alice"],
				["age", 30],
			]);
		});

		test("Parse a simple object using value method", async () => {
			const json = createStreamingJSON('{"name": "Alice", "age": 30}');
			const obj = await json.object();
			expectInstanceOf(obj, StreamingObject);

			const result = await obj.value();
			expect(result).toEqual({
				name: "Alice",
				age: 30,
			});
		});

		test("Parse a nested object using iterator", async () => {
			const json = createStreamingJSON('{"person": {"name": "Bob", "age": 25}}');
			const obj = await json.object();

			for await (const [key, unparsed] of obj) {
				expect(key).toBe("person");
				const personObj = await unparsed.object();
				expectInstanceOf(personObj, StreamingObject);

				const personEntries = [];
				for await (const [personKey, personUnparsed] of personObj) {
					personEntries.push([personKey, await personUnparsed.value()]);
				}

				expect(personEntries).toEqual([
					["name", "Bob"],
					["age", 25],
				]);
			}
		});

		test("Parse a nested object using value method", async () => {
			const json = createStreamingJSON('{"person": {"name": "Bob", "age": 25}}');
			const obj = await json.object();
			const result = await obj.value();

			expect(result).toEqual({
				person: {
					name: "Bob",
					age: 25,
				},
			});
		});
	});

	describe("Array parsing", () => {
		test("Parse a simple array using iterator", async () => {
			const json = createStreamingJSON('[1, "two", true]');
			const arr = await json.array();
			expectInstanceOf(arr, StreamingArray);

			const items = [];
			for await (const [index, unparsed] of arr) {
				items.push(await unparsed.value());
			}

			expect(items).toEqual([1, "two", true]);
		});

		test("Parse a simple array using value method", async () => {
			const json = createStreamingJSON('[1, "two", true]');
			const arr = await json.array();
			expectInstanceOf(arr, StreamingArray);

			const result = await arr.value();
			expect(result).toEqual([1, "two", true]);
		});

		test("Parse a nested array using iterator", async () => {
			const json = createStreamingJSON("[[1, 2], [3, 4]]");
			const arr = await json.array();

			const nestedArrays = [];
			for await (const [index, unparsed] of arr) {
				const nestedArr = await unparsed.array();
				expectInstanceOf(nestedArr, StreamingArray);

				const nestedItems = [];
				for await (const [nestedIndex, nestedUnparsed] of nestedArr) {
					nestedItems.push(await nestedUnparsed.value());
				}
				nestedArrays.push(nestedItems);
			}

			expect(nestedArrays).toEqual([
				[1, 2],
				[3, 4],
			]);
		});

		test("Parse a nested array using value method", async () => {
			const json = createStreamingJSON("[[1, 2], [3, 4]]");
			const arr = await json.array();
			const result = await arr.value();

			expect(result).toEqual([
				[1, 2],
				[3, 4],
			]);
		});
	});

	describe("Error handling", () => {
		test("Throw error on invalid JSON", async () => {
			const json = createStreamingJSON("{invalid}");
			await expect(json.value()).rejects.toThrow();
		});

		test("Throw error on unexpected end of input", async () => {
			const json = createStreamingJSON('{"key": ');
			const obj = await json.object();
			const result = await obj[Symbol.asyncIterator]().next();
			expectToBeFalsy(result.done);
			const [firstKey, firstValue] = result.value;
			await expect(firstValue.value()).rejects.toThrow();
		});

		test("Throw error when calling UnparsedValue.value() twice", async () => {
			const json = createStreamingJSON('{"key": "value"}');
			const obj = await json.object();
			const iterator = obj[Symbol.asyncIterator]();
			const result = await iterator.next();
			expectToBeFalsy(result.done);
			const [key, unparsed] = result.value;
			await unparsed.value();
			await expect(unparsed.value()).rejects.toThrow("UnparsedValue can only be parsed once");
		});
	});

	describe("Edge cases", () => {
		test("Parse empty object", async () => {
			const json = createStreamingJSON("{}");
			const obj = await json.object();
			expectAsyncIterable<[string, UnparsedValue]>(obj);
		});

		test("Parse empty array", async () => {
			const json = createStreamingJSON("[]");
			const arr = await json.array();
			expectAsyncIterable<[number, UnparsedValue]>(arr);
		});

		test("Parse object with unicode characters", async () => {
			const json = createStreamingJSON('{"emoji": "😊"}');
			const obj = await json.object();
			for await (const [key, unparsed] of obj) {
				expect(key).toBe("emoji");
				expect(await unparsed.value()).toBe("😊");
			}
		});

		test("Parse very long string", async () => {
			const longString = "a".repeat(10000);
			const json = createStreamingJSON(`"${longString}"`);
			const result = await json.value();
			expect(result).toBe(longString);
		});

		test("Parse deeply nested structure", async () => {
			const depth = 100;
			const jsonString = `${'{"value":'.repeat(depth)}null${"}".repeat(depth)}`;
			const json = createStreamingJSON(jsonString);

			let current: StreamingObject | null = await json.object();
			for (let i = 0; i < depth; i++) {
				expectInstanceOf(current, StreamingObject);
				for await (const [, unparsed] of current) {
					if (i === depth - 1) {
						current = await unparsed.null();
					} else {
						current = await unparsed.object();
					}
					break;
				}
			}

			expect(current).toBeNull();
		});
	});

	describe("State machine edge cases", () => {
		test.todo("Throw an error if trying to read a value while streaming a string", async () => {
			const json = createStreamingJSON(['"What is ', "true in this ", 'world?"']);
			const iter = json.stringChunks();
			await iter.next(); // skip first chunk
			expect(json.boolean()).rejects.toThrow("TODO: This should not be allowed");
		});

		test("Throw error when parsing value after object key", async () => {
			const json = createStreamingJSON('{"key" 123}');
			const obj = await json.object();
			await expect(obj[Symbol.asyncIterator]().next()).rejects.toThrow("Expected ':', but got '1'");
		});

		test("Throw error when parsing object key after value", async () => {
			const json = createStreamingJSON('{"key": 123 "anotherKey": 456}');
			const obj = await json.object();
			const iterator = obj[Symbol.asyncIterator]();
			await iterator.next(); // Consume the first key-value pair
			await expect(iterator.next()).rejects.toThrow("Expected one of ',', '}', but got '\"'");
		});

		test("Throw error when parsing value after array element without comma", async () => {
			const json = createStreamingJSON("[1 2]");
			const arr = await json.array();
			const iterator = arr[Symbol.asyncIterator]();
			await iterator.next(); // Consume the first element
			await expect(iterator.next()).rejects.toThrow("Expected one of ',', ']', but got '2'");
		});

		test("Throw error when parsing object after array start", async () => {
			const json = createStreamingJSON("[{]");
			const arr = await json.array();
			const iterator = arr[Symbol.asyncIterator]();
			await expect(
				iterator.next().then(async (result) => {
					expectToBeFalsy(result.done);
					const obj = await result.value[1].object();
					return obj.value();
				}),
			).rejects.toThrow("Expected '\"', but got ']'");
		});

		test("Throw error when parsing array after object start", async () => {
			const json = createStreamingJSON("{[}");
			const obj = await json.object();
			await expect(obj[Symbol.asyncIterator]().next()).rejects.toThrow("Expected '\"', but got '['");
		});

		test("Throw error when parsing value directly after object start", async () => {
			const json = createStreamingJSON("{123}");
			const obj = await json.object();
			await expect(obj[Symbol.asyncIterator]().next()).rejects.toThrow("Expected '\"', but got '1'");
		});

		test("Throw error when parsing multiple values at root level", async () => {
			const json = createStreamingJSON("{}[]");
			await json.object();
			await expect(json.array()).rejects.toThrow();
		});

		test("Throw error when parsing incomplete escape sequence at end of input", async () => {
			const json = createStreamingJSON('"abc\\');
			await expect(json.string()).rejects.toThrow("Incomplete escape code in string tried to read past end of stream");
		});

		test("Throw error when parsing incomplete Unicode escape sequence", async () => {
			const json = createStreamingJSON('"\\u123"');
			await expect(json.string()).rejects.toThrow("Invalid Unicode escape sequence");
		});

		test("Throw error when parsing invalid value type", async () => {
			const json = createStreamingJSON("undefined");
			await expect(json.value()).rejects.toThrow("Expected a value in JSON stream but instead got unexpected character 'u'");
		});

		test("Throw error when parsing incomplete true/false/null", async () => {
			const jsonTrue = createStreamingJSON("tru");
			await expect(jsonTrue.boolean()).rejects.toThrow("Expected 'e', but got end of stream");

			const jsonFalse = createStreamingJSON("fals");
			await expect(jsonFalse.boolean()).rejects.toThrow("Expected 'e', but got end of stream");

			const jsonNull = createStreamingJSON("nul");
			await expect(jsonNull.null()).rejects.toThrow("Expected 'l', but got end of stream");
		});

		test("Throw error when parsing number with multiple decimal points", async () => {
			const json = createStreamingJSON("123.45.67");
			await expect(json.number()).resolves.toBe(123.45);
			await expect(json.value()).rejects.toThrow("Expected a value in JSON stream but instead got unexpected character '.'");
		});

		test("Throw error when parsing number with multiple exponents", async () => {
			const json = createStreamingJSON("123e4e5");
			await expect(json.number()).resolves.toBe(1230000);
			await expect(json.value()).rejects.toThrow("Expected a value in JSON stream but instead got unexpected character 'e'");
		});

		test("Throw error when calling UnparsedValue.value() twice", async () => {
			const json = createStreamingJSON("[1, 2, 3]");
			const arr = await json.array();
			const iterator = arr[Symbol.asyncIterator]();
			const result = await iterator.next();
			expectToBeFalsy(result.done);
			const [, unparsed] = result.value;
			await unparsed.value();
			await expect(unparsed.value()).rejects.toThrow("UnparsedValue can only be parsed once");
		});

		test("Throw error when trying to extract object value after iteration", async () => {
			const json = createStreamingJSON('{"a": 1, "b": 2}');
			const obj = await json.object();
			for await (const [,] of obj) {
				// Iterate through the object
			}
			await expect(obj.value()).rejects.toThrow("Cannot extract value after iterator has been called");
		});

		test("Throw error when trying to iterate object twice", async () => {
			const json = createStreamingJSON('{"a": 1, "b": 2}');
			const obj = await json.object();
			for await (const [,] of obj) {
				// First iteration
			}
			await expect(async () => {
				for await (const [,] of obj) {
					// Second iteration
				}
			}).rejects.toThrow("Iterator can only be called once");
		});
	});
});
