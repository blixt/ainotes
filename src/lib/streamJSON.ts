/**
 * Tech Spec for this file. Always keep this up-to-date as you make changes to the code, and vice versa!
 *
 * 1. Streaming Functionality:
 *    - Implement an AsyncIterator<string> to read JSON data in chunks.
 *    - Maintain a buffer and currentChar to process the input stream efficiently.
 *    - Use maybeNextChar() for efficient buffer management.
 *
 * 2. JSON Value Parsing:
 *    - Support parsing of all JSON value types: string, number, boolean, null, object, and array.
 *    - Implement separate methods for parsing each value type (string(), number(), boolean(), null(), object(), array()).
 *
 * 3. String Parsing:
 *    - Handle escape characters in strings, including special characters and Unicode escapes.
 *    - Implement stringChunks() method to accumulate string chunks for potential large string values.
 *    - Implement parseUnicodeEscape() method for handling Unicode escape sequences.
 *
 * 4. Number Parsing:
 *    - Support parsing of integers, floating-point numbers, and scientific notation.
 *    - Validate number format and throw errors for invalid numbers.
 *
 * 5. Object and Array Parsing:
 *    - Implement ObjectContext and ArrayContext classes to handle nested structures.
 *    - Use AsyncIterator interface for objects and arrays to allow streaming of large structures.
 *    - Track nesting level to handle deeply nested structures.
 *    - For objects, yield [key, GetValue] pairs.
 *    - For arrays, yield [index, GetValue] pairs.
 *    - If GetValue.getValue() is not called before the next iteration, automatically skip the value.
 *    - Ensure that GetValue.getValue() can only be called once per iteration.
 *
 * 6. Error Handling:
 *    - Implement robust error checking and throw descriptive errors for invalid JSON.
 *    - Include checks for unexpected characters, invalid state transitions, and malformed structures.
 *    - Ensure errors are thrown as early and as clearly as possible to prevent undefined behavior.
 *
 * 7. Whitespace Handling:
 *    - Implement consumeWhitespace method to skip over whitespace between JSON tokens.
 *
 * 8. Value Type Peeking:
 *    - Implement peekValueType() method to peek at the type of the next value without consuming it.
 *    - Allow users to determine the type of value they're dealing with before reading it.
 *
 * 9. Automatic Skipping functionality:
 *    - Implement automatic skipping of unread values when iterating through objects or arrays.
 *    - Ensure that if a value is not read (e.g., due to not calling getValue or a continue statement in a loop), it is automatically skipped before the next iteration.
 *
 * 10. Performance Considerations:
 *     - Optimize buffer management to minimize memory usage.
 *     - Implement lazy evaluation for large structures using GetValue class.
 *
 * 11. API Design:
 *     - Provide a clean and intuitive API for consumers of the StreamingJSON class.
 *     - Ensure proper encapsulation of internal state and methods.
 *     - Allow direct access to object() and array() methods from the StreamingJSON instance.
 *     - Use getValue functions for object values and array elements to allow lazy evaluation.
 *     - Implement a mechanism to invalidate getValue functions if called too late.
 *
 * 12. Testing:
 *     - Develop comprehensive unit tests covering all parsing scenarios.
 *     - Include tests for error cases, edge cases, and large inputs.
 *     - Test automatic skipping of unread values and the behavior of getValue functions.
 *     - Verify that errors are thrown early and clearly for all invalid states.
 *     - Test parsing of various data types, including strings with escape sequences, Unicode characters, and deeply nested structures.
 *
 * 13. Documentation:
 *     - Provide clear documentation for public methods and classes.
 *     - Include usage examples and best practices.
 *     - Clearly explain the behavior of getValue functions, automatic skipping, and error handling.
 *
 * 14. Context Classes Access:
 *     - Ensure that ObjectContext and ArrayContext classes can call methods of the parent StreamingJSON instance.
 *     - Avoid marking methods as private if they need to be accessed by context classes.
 *     - Allow direct access to parent StreamingJSON methods where appropriate.
 *
 * 15. Early and Clear Error Throwing:
 *     - Implement checks at every stage of parsing to catch and throw errors as early as possible.
 *     - Provide detailed error messages that clearly indicate the nature and location of the error.
 *     - Ensure that it's not possible to get into an undefined behavior state by thorough validation.
 *
 * 16. Character Checking:
 *     - Implement isCurrentChar method to check the current character without type narrowing.
 *     - Use assertChar method to validate expected characters and throw errors if mismatched.
 *
 * 17. GetValue Class:
 *     - Implement GetValue class to manage lazy evaluation of JSON values.
 *     - Include methods: value(), string(), number(), boolean(), null(), object(), array(), stringChunks(), peekValueType(), and invalidate().
 *     - Ensure GetValue instances can only be used once and within a valid timeframe.
 *
 * 18. Constant Sets:
 *     - Define constant sets for special characters (NUMBER_START_CHARS, BOOLEAN_START_CHARS, OBJECT_END_CHARS, ARRAY_END_CHARS).
 *     - Use these sets for efficient character checking and validation.
 *
 * 19. Special Escape Characters:
 *     - Define a mapping of special escape characters (SPECIAL_ESCAPE_CHARS) for efficient string parsing.
 *
 * 20. Nesting Level Tracking:
 *     - Maintain a nestingLevel property to track the depth of nested structures.
 *     - Update nestingLevel appropriately when entering or exiting objects and arrays.
 */

export type JSONValue = boolean | number | string | null | { [key: string]: JSONValue } | JSONValue[];
export type JSONValueType = "boolean" | "number" | "string" | "null" | "object" | "array";

const NUMBER_START_CHARS = new Set(["-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const BOOLEAN_START_CHARS = new Set(["t", "f"]);
const OBJECT_END_CHARS = new Set([",", "}"]);
const ARRAY_END_CHARS = new Set([",", "]"]);

const SPECIAL_ESCAPE_CHARS: { [key: string]: string } = {
	b: "\b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "\t",
	'"': '"',
	"\\": "\\",
	"/": "/",
};

export class StreamingJSON {
	currentChar: string | null = null;
	nestingLevel = 0;

	private buffer = "";
	private stream: AsyncIterator<string, undefined>;

	constructor(stream: AsyncIterable<string>) {
		this.stream = stream[Symbol.asyncIterator]();
	}

	async nextChar(): Promise<void> {
		if (!this.buffer) {
			const next = await this.stream.next();
			this.buffer = next.done ? "" : next.value;
		}
		if (!this.buffer) {
			if (this.currentChar === null) {
				throw new Error("Tried to read past end of stream");
			}
			this.currentChar = null;
			return;
		}
		this.currentChar = this.buffer[0];
		this.buffer = this.buffer.slice(1);
	}

	async consumeWhitespace(): Promise<void> {
		if (this.currentChar === null) {
			await this.nextChar();
		}
		while (this.currentChar && /\s/.test(this.currentChar)) {
			await this.nextChar();
		}
	}

	async value(): Promise<JSONValue> {
		await this.consumeWhitespace();
		const valueType = this.peekValueType();
		switch (valueType) {
			case "string":
				return this.string();
			case "object":
				return (await this.object()).value();
			case "array":
				return (await this.array()).value();
			case "boolean":
				return this.boolean();
			case "null":
				return this.null();
			case "number":
				return this.number();
			default:
				assertNever(valueType);
		}
	}

	peekValueType(): JSONValueType {
		switch (this.currentChar) {
			case '"':
				return "string";
			case "{":
				return "object";
			case "[":
				return "array";
			case "t":
			case "f":
				return "boolean";
			case "n":
				return "null";
			default:
				if (this.currentChar === "-" || (this.currentChar && /\d/.test(this.currentChar))) {
					return "number";
				}
				throw new Error(
					`Expected a value in JSON stream but instead got ${this.currentChar ? `unexpected character '${this.currentChar}'` : "end of stream"}`,
				);
		}
	}

	async skip(): Promise<void> {
		await this.value();
		const initialNestingLevel = this.nestingLevel;
		while (this.nestingLevel > initialNestingLevel) {
			await this.value();
		}
	}

	private async maybeNextChar(): Promise<boolean> {
		if (!this.buffer) return false;
		await this.nextChar();
		return true;
	}

	async *stringChunks(): AsyncGenerator<string> {
		await this.consumeWhitespace();
		this.assertChar('"');
		await this.nextChar(); // Skip opening quote
		let chunk = "";
		while (this.currentChar !== '"') {
			if (this.currentChar === "\\") {
				await this.nextChar();
				if (this.isCurrentChar("u")) {
					chunk += await this.parseUnicodeEscape();
				} else {
					if (this.currentChar && this.currentChar in SPECIAL_ESCAPE_CHARS) {
						chunk += SPECIAL_ESCAPE_CHARS[this.currentChar];
					} else if (this.currentChar) {
						throw new Error(`Invalid escape sequence: \\${this.currentChar}`);
					} else {
						throw new Error("Incomplete escape code in string tried to read past end of stream");
					}
				}
			} else if (this.currentChar) {
				chunk += this.currentChar;
			}
			const didRead = await this.maybeNextChar();
			if (!didRead) {
				if (chunk.length > 0) {
					yield chunk;
					chunk = "";
				}
				await this.nextChar();
			}
		}
		if (chunk.length > 0) {
			yield chunk;
		}
		await this.nextChar(); // Skip closing quote
	}

	async string(): Promise<string> {
		let result = "";
		for await (const chunk of this.stringChunks()) {
			result += chunk;
		}
		return result;
	}

	private async parseUnicodeEscape(): Promise<string> {
		let hexCode = "";
		for (let i = 0; i < 4; i++) {
			await this.nextChar();
			if (!this.currentChar || !/[0-9A-Fa-f]/.test(this.currentChar)) {
				throw new Error(`Invalid Unicode escape sequence: \\u${hexCode}${this.currentChar || ""}`);
			}
			hexCode += this.currentChar;
		}
		return String.fromCharCode(Number.parseInt(hexCode, 16));
	}

	async number(): Promise<number> {
		await this.consumeWhitespace();
		this.assertChar(NUMBER_START_CHARS);
		let numStr = "";

		// Handle optional minus sign
		if (this.isCurrentChar("-")) {
			numStr += this.currentChar;
			await this.nextChar();
		}

		// Parse integer part
		if (this.isCurrentChar("0")) {
			numStr += this.currentChar;
			await this.nextChar();
		} else if (this.isCurrentChar(/[1-9]/)) {
			while (this.currentChar && this.isCurrentChar(/[0-9]/)) {
				numStr += this.currentChar;
				await this.nextChar();
			}
		} else {
			throw new Error(`Invalid number: Expected digit after '${numStr}', but got ${`'${this.currentChar}'` || "end of stream"}`);
		}

		// Parse fractional part
		if (this.isCurrentChar(".")) {
			numStr += this.currentChar;
			await this.nextChar();
			if (!this.isCurrentChar(/[0-9]/)) {
				throw new Error(`Invalid number: Expected digit after decimal point in '${numStr}', but got ${`'${this.currentChar}'` || "end of stream"}`);
			}
			while (this.currentChar && this.isCurrentChar(/[0-9]/)) {
				numStr += this.currentChar;
				await this.nextChar();
			}
		}

		// Parse exponent part
		if (this.isCurrentChar(/[eE]/)) {
			numStr += this.currentChar;
			await this.nextChar();
			if (this.isCurrentChar(/[+-]/)) {
				numStr += this.currentChar;
				await this.nextChar();
			}
			if (!this.isCurrentChar(/[0-9]/)) {
				throw new Error(`Invalid number: Expected digit after exponent in '${numStr}', but got ${`'${this.currentChar}'` || "end of stream"}`);
			}
			while (this.currentChar && this.isCurrentChar(/[0-9]/)) {
				numStr += this.currentChar;
				await this.nextChar();
			}
		}

		const num = Number(numStr);
		if (!Number.isFinite(num)) {
			throw new Error(`Invalid number: '${numStr}' cannot be parsed as a finite number`);
		}
		return num;
	}

	async boolean(): Promise<boolean> {
		await this.consumeWhitespace();
		this.assertChar(BOOLEAN_START_CHARS);
		const value = this.currentChar === "t";
		const expected = value ? "true" : "false";
		for (const char of expected) {
			this.assertChar(char);
			await this.nextChar();
		}
		return value;
	}

	async null(): Promise<null> {
		await this.consumeWhitespace();
		this.assertChar("n");
		for (const char of "ull") {
			await this.nextChar();
			this.assertChar(char);
		}
		await this.nextChar();
		return null;
	}

	async object(): Promise<StreamingObject> {
		await this.consumeWhitespace();
		this.assertChar("{");
		await this.nextChar(); // Skip opening brace
		this.nestingLevel++;
		return new StreamingObject(this);
	}

	async array(): Promise<StreamingArray> {
		await this.consumeWhitespace();
		this.assertChar("[");
		await this.nextChar(); // Skip opening bracket
		this.nestingLevel++;
		return new StreamingArray(this);
	}

	assertChar(expected: string | Set<string>): void {
		if (!this.currentChar) {
			throw new Error(`Expected '${expected}', but got end of stream`);
		}
		if (typeof expected === "string") {
			if (this.currentChar !== expected) {
				throw new Error(`Expected '${expected}', but got '${this.currentChar}'`);
			}
		} else if (expected instanceof Set) {
			if (!expected.has(this.currentChar as string)) {
				throw new Error(`Expected one of '${Array.from(expected).join("', '")}', but got '${this.currentChar}'`);
			}
		}
	}

	isCurrentChar(test: string | RegExp): boolean {
		if (!this.currentChar) return false;
		if (test instanceof RegExp) {
			return test.test(this.currentChar);
		}
		return this.currentChar === test;
	}
}

export class UnparsedValue {
	didParse = false;

	private parent: StreamingJSON;
	private valid = true;

	constructor(parent: StreamingJSON) {
		this.parent = parent;
	}

	private markAsParsed() {
		if (this.didParse) {
			throw new Error("UnparsedValue can only be parsed once");
		}
		if (!this.valid) {
			throw new Error("UnparsedValue is no longer valid");
		}
		this.didParse = true;
	}

	async value(): Promise<JSONValue> {
		this.markAsParsed();
		return await this.parent.value();
	}

	async string(): Promise<string> {
		this.markAsParsed();
		return await this.parent.string();
	}

	async number(): Promise<number> {
		this.markAsParsed();
		return await this.parent.number();
	}

	async boolean(): Promise<boolean> {
		this.markAsParsed();
		return await this.parent.boolean();
	}

	async null(): Promise<null> {
		this.markAsParsed();
		return await this.parent.null();
	}

	async object(): Promise<StreamingObject> {
		this.markAsParsed();
		return await this.parent.object();
	}

	async array(): Promise<StreamingArray> {
		this.markAsParsed();
		return await this.parent.array();
	}

	async *stringChunks(): AsyncGenerator<string> {
		this.markAsParsed();
		yield* this.parent.stringChunks();
	}

	peekValueType(): JSONValueType {
		return this.parent.peekValueType();
	}

	invalidate(): void {
		this.valid = false;
	}
}

export class StreamingObject {
	private parent: StreamingJSON;
	private iteratorCalled = false;
	private extractedValue: Record<string, JSONValue> | null = null;

	constructor(parent: StreamingJSON) {
		this.parent = parent;
	}

	async value(): Promise<Record<string, JSONValue>> {
		if (this.iteratorCalled) {
			throw new Error("Cannot extract value after iterator has been called");
		}
		if (this.extractedValue !== null) {
			return this.extractedValue;
		}
		const result: Record<string, JSONValue> = {};
		for await (const [key, getValue] of this) {
			result[key] = await getValue.value();
		}
		this.extractedValue = result;
		return result;
	}

	async *[Symbol.asyncIterator](): AsyncIterator<[string, UnparsedValue], undefined> {
		if (this.iteratorCalled) {
			throw new Error("Iterator can only be called once");
		}
		this.iteratorCalled = true;
		while (true) {
			await this.parent.consumeWhitespace();
			if (this.parent.currentChar === "}") {
				await this.parent.nextChar(); // Skip closing brace
				this.parent.nestingLevel--;
				break;
			}
			const key = await this.parent.string();
			await this.parent.consumeWhitespace();
			this.parent.assertChar(":");
			await this.parent.nextChar(); // Skip colon
			const unparsed = new UnparsedValue(this.parent);
			yield [key, unparsed];
			if (!unparsed.didParse) {
				await this.parent.skip();
			}
			unparsed.invalidate();
			await this.parent.consumeWhitespace();
			this.parent.assertChar(OBJECT_END_CHARS);
			if (this.parent.isCurrentChar(",")) {
				await this.parent.nextChar();
			}
		}
	}
}

export class StreamingArray {
	private parent: StreamingJSON;
	private index = 0;
	private iteratorCalled = false;
	private extractedValue: JSONValue[] | null = null;

	constructor(parent: StreamingJSON) {
		this.parent = parent;
	}

	async value(): Promise<JSONValue[]> {
		if (this.iteratorCalled) {
			throw new Error("Cannot extract value after iterator has been called");
		}
		if (this.extractedValue !== null) {
			return this.extractedValue;
		}
		const result: JSONValue[] = [];
		for await (const [, getValue] of this) {
			result.push(await getValue.value());
		}
		this.extractedValue = result;
		return result;
	}

	async *[Symbol.asyncIterator](): AsyncIterator<[number, UnparsedValue], undefined> {
		if (this.iteratorCalled) {
			throw new Error("Iterator can only be called once");
		}
		this.iteratorCalled = true;
		while (true) {
			await this.parent.consumeWhitespace();
			if (this.parent.currentChar === "]") {
				await this.parent.nextChar(); // Skip closing bracket
				this.parent.nestingLevel--;
				break;
			}
			const unparsed = new UnparsedValue(this.parent);
			yield [this.index, unparsed];
			this.index++;
			if (!unparsed.didParse) {
				await this.parent.skip();
			}
			unparsed.invalidate();
			await this.parent.consumeWhitespace();
			this.parent.assertChar(ARRAY_END_CHARS);
			if (this.parent.isCurrentChar(",")) {
				await this.parent.nextChar();
			}
		}
	}
}

function assertNever(x: never): never {
	throw new Error(`Unexpected value: ${x}`);
}
