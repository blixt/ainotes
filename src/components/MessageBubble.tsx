"use client";

import { MarkdownRenderer } from "./MarkdownRenderer";

export const MessageBubble = ({ senderRole, content }: { senderRole: "user" | "assistant"; content: string }) => {
	const bg = senderRole === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground";
	return (
		<div className={`p-4 rounded-lg max-w-[70%] inline-block ${bg}`}>
			<MarkdownRenderer content={content} />
		</div>
	);
};
