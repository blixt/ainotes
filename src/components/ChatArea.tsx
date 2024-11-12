import { continueConversation } from "@/app/actions";
import { FileAction } from "@/components/FileAction";
import { MessageBubble } from "@/components/MessageBubble";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { type AttachmentFile, resizeAndEncodeImage, validateFile } from "@/lib/attachments";
import { useAppState } from "@/lib/context";
import { generateId } from "ai";
import { readStreamableValue } from "ai/rsc";
import { produce } from "immer";
import { Paperclip, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AttachmentPreview } from "./AttachmentPreview";
import { MetadataUpdate } from "./MetadataUpdate";
import { ThoughtBubble } from "./ThoughtBubble";

export function ChatArea({ className, onSelectFile }: { className?: string; onSelectFile: (path: string) => void }) {
	const { state, dispatch } = useAppState();

	const [inputValue, setInputValue] = useState("");
	const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
	const scrollViewportRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const isScrolledToBottomRef = useRef(true);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const checkIfScrolledToBottom = useCallback(() => {
		const scrollViewport = scrollViewportRef.current;
		if (scrollViewport) {
			const { scrollHeight, scrollTop, clientHeight } = scrollViewport;
			isScrolledToBottomRef.current = Math.abs(scrollHeight - scrollTop - clientHeight) < 1;
		}
	}, []);

	const scrollToBottom = useCallback(() => {
		if (isScrolledToBottomRef.current) {
			messagesEndRef.current?.scrollIntoView();
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		scrollToBottom();
	}, [state.history, scrollToBottom]);

	const handleScroll = useCallback(() => {
		checkIfScrolledToBottom();
	}, [checkIfScrolledToBottom]);

	const adjustTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			textarea.style.height = `${Math.min(textarea.scrollHeight, 250)}px`;
		}
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputValue(e.target.value);
		adjustTextareaHeight();
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		adjustTextareaHeight();
	}, [inputValue, adjustTextareaHeight]);

	const canSendMessage = inputValue.trim().length > 0 && attachments.every((attachment) => attachment.status.current === "ready");

	const handleSendMessage = async () => {
		if (!canSendMessage) return;
		const input = inputValue.trim();
		setInputValue("");
		setAttachments([]);
		const actions = await continueConversation(state, input);
		for await (const action of readStreamableValue(actions)) {
			if (!action) {
				console.warn("action is undefined");
				continue;
			}
			dispatch(action);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	// Handle pasting files into the textarea
	const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const items = e.clipboardData.items;
		const files: File[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.kind === "file") {
				const file = item.getAsFile();
				if (file && validateFile(file)) {
					files.push(file);
				}
			}
		}
		await handleFiles(files);
	};

	// Trigger file input when attachment button is clicked
	const handleAttachmentClick = () => {
		fileInputRef.current?.click();
	};

	// Handle file selection from file input
	const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		await handleFiles(files);
		e.target.value = ""; // Reset file input
	};

	// Process and add files to attachments
	const handleFiles = async (files: File[]) => {
		setAttachments(
			produce((draft) => {
				for (const file of files) {
					if (validateFile(file)) {
						const id = generateId();
						let preview: string | null = null;
						if (file.type.startsWith("image/")) {
							preview = URL.createObjectURL(file);
						}
						// Add new attachment with 'uploading' status
						draft.push({
							id,
							file,
							preview,
							status: { current: "processing", progress: 0 },
						});
						resizeAndEncodeImage(file).then((base64) => {
							setAttachments(
								produce((draft) => {
									const attachment = draft.find((a) => a.id === id);
									if (attachment) {
										attachment.status = { current: "ready", base64 };
									}
								}),
							);
						});
					}
				}
			}),
		);
	};

	// Remove an attachment by its ID
	const removeAttachment = (id: string) => {
		setAttachments(
			produce((draft) => {
				const index = draft.findIndex((a) => a.id === id);
				if (index !== -1) {
					if (draft[index].preview) {
						URL.revokeObjectURL(draft[index].preview);
					}
					draft.splice(index, 1);
				}
			}),
		);
	};

	return (
		<div className={`flex flex-col ${className}`}>
			<ScrollArea className="flex-grow mb-4 border rounded-md border-border" ref={scrollViewportRef} onScroll={handleScroll}>
				<div className="h-full flex flex-col justify-end p-4">
					<div className="flex-grow" />
					{state.history.map((entry) => (
						<div key={entry.id} className={`mt-2 flex ${entry.isFromUser ? "justify-end" : "justify-start"}`}>
							{entry.type === "text" ? (
								<MessageBubble senderRole={entry.isFromUser ? "user" : "assistant"} content={entry.text.trim()} />
							) : entry.type === "file" || entry.type === "file-pending" || entry.type === "file-read" ? (
								<FileAction entry={entry} onSelect={onSelectFile} />
							) : entry.type === "thought" ? (
								<ThoughtBubble content={entry.text.trim()} />
							) : entry.type === "metadata" ? (
								<MetadataUpdate diff={entry.diff} />
							) : null}
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
			</ScrollArea>
			{/* Display attachment previews */}
			{attachments.length > 0 && (
				<div className="flex flex-wrap gap-2 mb-2">
					{attachments.map((attachment) => (
						<AttachmentPreview key={attachment.id} attachment={attachment} onRemove={removeAttachment} />
					))}
				</div>
			)}
			<div className="bg-secondary p-2 rounded-md flex items-end">
				{/* Attachment button */}
				<Button type="button" variant="ghost" size="icon" className="flex-shrink-0" onClick={handleAttachmentClick}>
					<Paperclip className="h-5 w-5" />
				</Button>
				{/* Hidden file input */}
				<input type="file" ref={fileInputRef} className="hidden" onChange={handleFileInputChange} multiple accept="image/*,application/pdf" />
				{/* Message input textarea */}
				<Textarea
					ref={textareaRef}
					placeholder="Type a message… (Shift+Enter for new line)"
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					rows={1}
					className="resize-none flex-grow bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
				/>
				{/* Send button */}
				<Button type="button" variant="ghost" size="icon" disabled={!canSendMessage} onClick={handleSendMessage} className="flex-shrink-0">
					<Send className="h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
