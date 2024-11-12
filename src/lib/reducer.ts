import type { AppAction, AppState, HistoryEntry } from "@/lib/state";
import { generateId } from "ai";
import { produce } from "immer";

export function stateReducer(state: AppState, action: AppAction): AppState {
	return produce(state, (draft) => {
		switch (action.type) {
			case "APPEND_TEXT": {
				const existingEntryIndex = draft.history.findLastIndex((entry) => entry.id === action.id);
				if (existingEntryIndex !== -1 && draft.history[existingEntryIndex].type === "text") {
					draft.history[existingEntryIndex].text += action.textDelta;
				} else {
					draft.history.push({
						id: action.id,
						type: "text",
						isFromUser: action.isFromUser,
						text: action.textDelta,
					});
				}
				break;
			}

			case "APPEND_THOUGHT": {
				const existingEntryIndex = draft.history.findLastIndex((entry) => entry.id === action.id);
				if (existingEntryIndex !== -1 && draft.history[existingEntryIndex].type === "thought") {
					draft.history[existingEntryIndex].text += action.textDelta;
				} else {
					draft.history.push({
						id: action.id,
						type: "thought",
						isFromUser: false,
						text: action.textDelta,
					});
				}
				break;
			}

			case "CREATE_FILE": {
				if (draft.files[action.file.path]) {
					throw new Error(`File ${action.file.path} already exists`);
				}
				draft.files[action.file.path] = action.file;
				removePendingFileAction(draft);
				draft.history.push({
					type: "file",
					id: generateId(),
					isFromUser: false,
					path: action.file.path,
					commitMessage: action.file.commitMessage,
					op: {
						type: "create",
						title: action.file.title,
						preview: action.file.content.substring(0, 120),
					},
				});
				break;
			}

			case "RENAME_FILE": {
				if (!draft.files[action.oldPath]) {
					throw new Error(`File ${action.oldPath} not found`);
				}
				if (draft.files[action.newPath]) {
					throw new Error(`File ${action.newPath} already exists`);
				}
				draft.files[action.newPath] = draft.files[action.oldPath];
				delete draft.files[action.oldPath];
				removePendingFileAction(draft);
				draft.history.push({
					type: "file",
					id: generateId(),
					isFromUser: false,
					path: action.oldPath,
					commitMessage: `Renamed ${action.oldPath} to ${action.newPath}`,
					op: {
						type: "rename",
						newPath: action.newPath,
					},
				});
				break;
			}

			case "DELETE_FILE": {
				if (!draft.files[action.path]) {
					throw new Error(`File ${action.path} not found`);
				}
				delete draft.files[action.path];
				removePendingFileAction(draft);
				draft.history.push({
					type: "file",
					id: generateId(),
					isFromUser: false,
					path: action.path,
					commitMessage: action.commitMessage,
					op: {
						type: "delete",
					},
				});
				break;
			}

			case "READ_FILE": {
				removePendingFileAction(draft);
				draft.history.push({
					type: "file-read",
					id: generateId(),
					isFromUser: false,
					path: action.path,
				});
				break;
			}

			case "UPDATE_FILE": {
				if (!draft.files[action.file.path]) {
					throw new Error(`File ${action.file.path} not found`);
				}
				Object.assign(draft.files[action.file.path], action.file);

				removePendingFileAction(draft);

				draft.history.push({
					type: "file",
					id: generateId(),
					isFromUser: false,
					path: action.file.path,
					commitMessage: action.file.commitMessage,
					op: {
						type: "update",
						title: action.file.title ?? draft.files[action.file.path].title,
						preview: action.file.content?.substring(0, 120),
					},
				});
				break;
			}

			case "UPDATE_PROJECT_METADATA": {
				Object.assign(draft.projectMetadata, action.diff);
				draft.history.push({
					type: "metadata",
					id: generateId(),
					isFromUser: false,
					diff: action.diff,
				});
				break;
			}

			case "PENDING_FILE_ACTION": {
				const pendingEntry = draft.history.findLast(
					(entry): entry is Extract<HistoryEntry, { type: "file-pending" }> => entry.type === "file-pending",
				);
				if (pendingEntry) {
					if (pendingEntry.op !== action.op) {
						throw new Error(`Pending entry action ${pendingEntry.op} does not match action ${action.op}`);
					}
					pendingEntry.paths = action.paths;
				} else {
					draft.history.push({
						type: "file-pending",
						id: "file-pending",
						isFromUser: false,
						op: action.op,
						paths: action.paths,
					});
				}
				break;
			}

			default:
				assertNever(action);
		}
	});
}

function removePendingFileAction(draft: AppState) {
	const pendingIndex = draft.history.findLastIndex((entry) => entry.type === "file-pending");
	if (pendingIndex !== -1) {
		draft.history.splice(pendingIndex, 1);
	}
}

function assertNever(x: never): never {
	throw new Error(`Unexpected object: ${x}`);
}
