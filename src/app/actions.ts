"use server";

import { stateReducer } from "@/lib/reducer";
import type { AppAction, AppState, File, HistoryEntry } from "@/lib/state";
import { anthropic } from "@ai-sdk/anthropic";
import { type CoreMessage, generateId, streamText } from "ai";
import { parse } from "partial-json";
import { z } from "zod";
import { syncReducer } from "../lib/SyncReducer";
import { TextThoughtStateMachine } from "../lib/TextThoughtStateMachine";

const SYSTEM_PROMPT = `Hey Claude! Today you are an assistant writer that helps the user collect information into files. Files can be anything,
really, like text, todo lists, code, and so on. Try to keep files organized and don't let them grow too large. If a file is about to grow, see
if you can't split it up into multiple logical files. Give files reasonable titles that you believe make sense even long term as the file
evolves. Files should be organized into directories as needed, preferring to cluster related files together. If the directory structure no longer
makes sense, you can reorganize the files at your discretion.

When addressing the user, use an informal but succinct tone. Focus on the important information and let the user ask for the details. Keep your responses
short and avoid oversharing.

Put all your thinking and reasoning into <plan> XML blocks and only write information useful for the user outside the blocks. Do make sure to think
through all but the most simple tasks to make sure you have everything you need to do a good job. Never be afraid to ask the user or double check
information using your available tools if you have any doubts. Try to put the <plan> blocks before your reply to the user, and avoid sandwiching them
with repetitive text for the user (if you said something before the <plan> block don't say it again after it).

If the user asks you to create something interactive like a tool, game, web page, etc. then you'll need to use web technologies because you can only run
HTML files and their associated JavaScript/CSS, no other runtime is supported. These are the requirements for creating web apps/pages:
- You may use JSX and TSX, they will be compiled under the hood
- You must use ES modules syntax and assume the code, once compiled, will run in a browser environment with the latest APIs available
- React is strongly recommended for web apps
- shadcn/ui is strongly recommended for UI components
- Lucide is strongly recommended for icons
- Tailwind is strongly recommended for styling

Here's all info we have about the project currently (as JSON):
$PROJECT_METADATA

Please update the project metadata with any important information that is always relevant to all conversations whenever you learn of this new
information. You don't need to ask the user for permission to do this. Don't spend time telling the user about this unless asked, but do try to use <plan>
blocks if you're going to make changes to existing values. Remember to do this unprompted as part of the other actions you take.

These files exist currently:
$FILE_LIST

Never try to guess what's in a file. If you can't clearly see its contents in the message history, read it using the readFile function. If you say
you will use a function in your <plan> area, you must use that function after you're done thinking. Don't be afraid to delete old files if you have moved
their contents elsewhere.

Only you are able to perform actions on files, the user does not have access to the file system, so you can't tell them to do things themselves, instead
talk to them in a way that makes sense for you to be able to help them. Avoid talking about filenames or paths since the user will be presented with titles.

The current date is $CURRENT_DATE.`;

function template(template: string, data: Record<string, string>) {
	const result = template.replace(/\$(\w+)/g, (match, key) => {
		if (key in data) {
			return data[key];
		}
		throw new Error(`Template variable $${key} is not defined in the data`);
	});
	return result;
}

function messagesFromHistory(history: HistoryEntry[]): CoreMessage[] {
	const messages: CoreMessage[] = [];
	for (const entry of history) {
		switch (entry.type) {
			case "text":
				messages.push({
					role: entry.isFromUser ? "user" : "assistant",
					content: entry.text,
				});
				break;
			case "thought":
				break;
			case "file":
				if (entry.op.type !== "rename" && entry.op.type !== "delete") {
					messages.push({
						role: "assistant",
						content: (() => {
							switch (entry.op.type) {
								case "create":
									return `(I created a new file named ${entry.path} but I forgot the content so I would have to read it to remember.)`;
								case "update":
									return `(I updated the file ${entry.path} but I forgot the contents so I would have to read it again.)`;
								default:
									assertNever(entry.op);
							}
						})(),
					});
				}
				break;
			case "file-read":
				messages.push({
					role: "assistant",
					content: `(I read ${entry.path} but I forgot the contents so I would have to read it again.)`,
				});
				break;
			case "metadata":
				break;
		}
	}
	return messages;
}

export async function continueConversation(initialState: AppState, input: string) {
	"use server";

	const fileList =
		Object.values(initialState.files)
			.map((file) => `${file.path}: ${file.title}`)
			.join("\n") || "(There are no files yet)";

	const sync = syncReducer(initialState, stateReducer);

	sync.dispatch({
		type: "APPEND_TEXT",
		id: generateId(),
		isFromUser: true,
		textDelta: input,
	});

	async function ai() {
		const messages = messagesFromHistory(sync.state.history);
		console.log(messages);
		const { fullStream } = await streamText({
			model: anthropic("claude-3-5-sonnet-20240620"),
			system: template(SYSTEM_PROMPT, {
				PROJECT_METADATA: JSON.stringify(sync.state.projectMetadata, null, 2),
				FILE_COUNT: Object.keys(sync.state.files).length.toString(),
				FILE_LIST: fileList,
				CURRENT_DATE: new Date().toISOString(),
			}),
			messages,

			experimental_toolCallStreaming: true,
			maxToolRoundtrips: 10,

			tools: {
				createFile: {
					description:
						"Create a new file at the specified path with the provided title and content. Use the file extension most appropriate for the content. Remember that for React code you need to use .jsx or .tsx.",
					parameters: z.object({
						path: z.string(),
						title: z.string(),
						content: z.string(),
						commitMessage: z.string(),
					}),
					execute: async ({ path, title, content, commitMessage }) => {
						const file = sync.state.files[path];
						if (file) {
							throw new Error(`File ${path} already exists`);
						}

						const newFile: File = { path, title, content, commitMessage };
						sync.dispatch({
							type: "CREATE_FILE",
							file: newFile,
						});

						return newFile;
					},
				},

				organizeFiles: {
					description: "Organize files by deleting and/or moving files.",
					parameters: z.object({
						deleteFiles: z.array(z.string()).optional(),
						moveFiles: z.record(z.string(), z.string()).optional(),
						commitMessage: z.string(),
					}),
					execute: async ({
						deleteFiles,
						moveFiles,
						commitMessage,
					}: { deleteFiles?: string[]; moveFiles?: Record<string, string>; commitMessage: string }) => {
						if (deleteFiles) {
							for (const path of deleteFiles) {
								const file = sync.state.files[path];
								if (!file) {
									throw new Error(`File ${path} not found`);
								}
								sync.dispatch({
									type: "DELETE_FILE",
									path,
									commitMessage,
								});
							}
						}
						if (moveFiles) {
							for (const [oldPath, newPath] of Object.entries(moveFiles)) {
								const file = sync.state.files[oldPath];
								if (!file) {
									throw new Error(`File ${oldPath} not found`);
								}
								if (sync.state.files[newPath]) {
									throw new Error(`File ${newPath} already exists`);
								}
								sync.dispatch({
									type: "RENAME_FILE",
									oldPath,
									newPath,
								});
							}
						}
						return { success: true };
					},
				},

				readFiles: {
					description: "Read the contents of one or more files.",
					parameters: z.object({
						paths: z.array(z.string()).min(1),
					}),
					execute: async ({ paths }) => {
						const files: Record<string, File> = {};
						for (const path of paths) {
							const file = sync.state.files[path];
							if (!file) {
								throw new Error(`File ${path} not found`);
							}
							sync.dispatch({
								type: "READ_FILE",
								path,
							});
							files[path] = file;
						}
						return files;
					},
				},

				updateFile: {
					description: "Update an existing file by path, providing title and/or content.",
					parameters: z.object({
						path: z.string(),
						title: z.string().optional(),
						content: z.string().optional(),
						newPath: z.string().optional(),
						commitMessage: z.string(),
					}),
					execute: async ({ path, newPath, title, content, commitMessage }) => {
						const file = sync.state.files[path];
						if (!file) {
							throw new Error(`File ${path} not found`);
						}
						if (newPath) {
							if (sync.state.files[newPath]) throw Error(`File ${newPath} already exists`);
							if (newPath === path) throw Error("New path cannot be the same as the old path");
						}
						const updatedFile = {
							...file,
							path: newPath ?? file.path,
							title: title ?? file.title,
							content: content ?? file.content,
							commitMessage,
						};
						if (newPath) {
							sync.dispatch({
								type: "RENAME_FILE",
								oldPath: path,
								newPath: newPath,
							});
						}
						sync.dispatch({
							type: "UPDATE_FILE",
							file: updatedFile,
						});

						return updatedFile;
					},
				},

				updateMetadata: {
					description: "Update the project metadata.",
					parameters: z.object({
						projectMetadataDiff: z.record(z.string(), z.string()),
					}),
					execute: async ({ projectMetadataDiff }) => {
						sync.dispatch({
							type: "UPDATE_PROJECT_METADATA",
							diff: projectMetadataDiff,
						});
						return sync.state.projectMetadata;
					},
				},
			},
		});

		const textOrThought = new TextThoughtStateMachine(sync);

		let currentToolArgs = "";
		let currentToolFileOp: Extract<AppAction, { type: "PENDING_FILE_ACTION" }>["op"] | undefined;

		for await (const c of fullStream) {
			switch (c.type) {
				case "text-delta":
					textOrThought.append(c.textDelta);
					break;
				case "tool-call-streaming-start": {
					console.log("tool-call-streaming-start", c.toolName);
					textOrThought.reset();
					let op: Extract<AppAction, { type: "PENDING_FILE_ACTION" }>["op"] | undefined;
					if (c.toolName === "createFile") {
						op = "create";
					} else if (c.toolName === "updateFile") {
						op = "update";
					} else if (c.toolName === "renameFile") {
						op = "rename";
					} else if (c.toolName === "deleteFile") {
						op = "delete";
					} else if (c.toolName === "readFile") {
						op = "read";
					} else {
						break;
					}
					if (currentToolArgs) {
						throw new Error("Tool call already started");
					}
					sync.dispatch({ type: "PENDING_FILE_ACTION", op, paths: [] });
					break;
				}
				case "tool-call-delta": {
					// TODO: This is very hacky, each tool should be able to hook into their own argument stream.
					if (currentToolFileOp) {
						currentToolArgs += c.argsTextDelta;
						const args = parse(currentToolArgs);
						if (args.path) {
							sync.dispatch({ type: "PENDING_FILE_ACTION", op: currentToolFileOp, paths: [args.path] });
						} else if (args.paths) {
							sync.dispatch({ type: "PENDING_FILE_ACTION", op: currentToolFileOp, paths: args.paths });
						}
					}
					break;
				}
				case "tool-call":
					console.log("tool-call", c.toolName);
					currentToolArgs = "";
					currentToolFileOp = undefined;
					break;
				case "tool-result":
					console.log("tool-result", c.toolName);
					textOrThought.reset();
					break;
			}
		}

		sync.done();
	}

	ai();

	return sync.streamableValue;
}

function assertNever(x: never): never {
	throw new Error(`Unexpected object: ${x}`);
}
