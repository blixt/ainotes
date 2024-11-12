import { generateId } from "ai";

type DispatchFn = (action: { type: "APPEND_TEXT" | "APPEND_THOUGHT"; id: string; isFromUser: false; textDelta: string }) => void;

export class TextThoughtStateMachine {
	buffer = "";

	private currentId: string;
	private currentMode: "text" | "thought" = "text"; // Start in text mode by default

	constructor(private dispatcher: { dispatch: DispatchFn }) {
		this.currentId = generateId(); // Generate an initial ID
	}

	reset(): void {
		if (this.buffer) {
			throw new Error(`Buffer was not empty: ${JSON.stringify(this.buffer)}`);
		}
		this.currentMode = "text";
		this.currentId = generateId();
		this.buffer = "";
	}

	append(content: string): void {
		this.buffer += content;

		let contentBuffer = "";
		const targetSequence = this.currentMode === "text" ? "<plan>" : "</plan>";
		let sequenceIndex = 0;

		for (let i = 0; i < this.buffer.length; i++) {
			const char = this.buffer[i];

			if (char === targetSequence[sequenceIndex]) {
				sequenceIndex++;
				if (sequenceIndex === targetSequence.length) {
					// We've found a complete tag
					if (contentBuffer) {
						this.dispatch(contentBuffer);
						contentBuffer = "";
					}
					this.switchMode(this.currentMode === "text" ? "thought" : "text");
					this.buffer = this.buffer.slice(i + 1);
					this.append(""); // Process the rest of the buffer
					return;
				}
			} else {
				// If we hit a non-matching character, add any partially matched sequence to the content
				if (sequenceIndex > 0) {
					contentBuffer += targetSequence.slice(0, sequenceIndex);
					sequenceIndex = 0;
				}
				contentBuffer += char;
			}
		}

		// If we've reached here, we've processed the entire buffer
		if (contentBuffer) {
			this.dispatch(contentBuffer);
		}

		// If we have a partial match at the end, keep it in the buffer
		if (sequenceIndex > 0) {
			this.buffer = targetSequence.slice(0, sequenceIndex);
		} else {
			this.buffer = "";
		}
	}

	private switchMode(newMode: "text" | "thought"): void {
		if (this.currentMode === newMode) return;
		this.currentMode = newMode;
		this.currentId = generateId();
	}

	private dispatch(content: string): void {
		this.dispatcher.dispatch({
			type: this.currentMode === "text" ? "APPEND_TEXT" : "APPEND_THOUGHT",
			id: this.currentId,
			isFromUser: false,
			textDelta: content,
		});
	}
}
