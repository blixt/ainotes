import { Brain } from "lucide-react";

export function ThoughtBubble({ content }: { content: string }) {
	return (
		<div className="flex text-xs text-muted-foreground mt-1 mb-1 max-w-[70%]">
			<Brain className="h-3 w-3 mr-1 flex-shrink-0 mt-[2px]" />
			<span className="overflow-hidden">{content}</span>
		</div>
	);
}
