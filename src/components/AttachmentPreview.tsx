import type { AttachmentFile } from "@/lib/attachments";
import { AlertCircle, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export function AttachmentPreview({ attachment, onRemove }: { attachment: AttachmentFile; onRemove: (id: string) => void }) {
	return (
		<div className="relative">
			{attachment.preview ? (
				<img src={attachment.preview} alt={attachment.file.name} className="w-16 h-16 object-cover rounded" />
			) : (
				<div className="w-16 h-16 bg-secondary flex items-center justify-center rounded">
					<Paperclip className="h-6 w-6" />
				</div>
			)}
			{attachment.status.current === "processing" && (
				<div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
					<Loader2 className="h-6 w-6 text-white animate-spin" />
				</div>
			)}
			{attachment.status.current === "error" && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center rounded">
								<AlertCircle className="h-6 w-6 text-white" />
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>{attachment.status.errorMessage}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
			<Button
				type="button"
				variant="secondary"
				size="icon"
				className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
				onClick={() => onRemove(attachment.id)}
			>
				<X className="h-3 w-3" />
			</Button>
		</div>
	);
}
