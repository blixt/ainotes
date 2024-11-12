import { expect } from "vitest";

function isAsyncIterable<T>(obj: unknown): obj is AsyncIterable<T> {
	if (typeof obj !== "object") return false;
	if (!obj) return false;
	if (!(Symbol.asyncIterator in obj)) return false;
	return typeof obj[Symbol.asyncIterator] === "function";
}

expect.extend({
	toBeAnAsyncIterable<T>(received: unknown) {
		if (!isAsyncIterable<T>(received)) {
			return {
				message: () => `expected ${received} to be an async iterable`,
				pass: false,
			};
		}
		return {
			message: () => `expected ${received} not to be an async iterable`,
			pass: true,
		};
	},
});

export function expectAsyncIterable<T>(received: unknown): asserts received is AsyncIterable<T> {
	expect(received).toBeAnAsyncIterable();
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function expectInstanceOf<T>(received: unknown, expectedType: new (...args: any[]) => T): asserts received is T {
	expect(received).toBeInstanceOf(expectedType);
}

export function expectToBeTruthy<T>(received: T): asserts received is NonNullable<T> {
	expect(received).toBeTruthy();
}

export function expectToBeFalsy(received: unknown): asserts received is false | null | undefined | "" | 0 | 0n {
	expect(received).toBeFalsy();
}
