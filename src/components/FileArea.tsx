import { FileList } from "@/components/FileList";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { SyntaxHighlighter } from "@/components/SyntaxHighlighter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppState } from "@/lib/context";
import type { File } from "@/lib/state";
import { ArrowLeft } from "lucide-react";

interface FileAreaProps {
	className?: string;
	selectedFile: File | null;
	onSelectFile: (path: string | null) => void;
}

export function FileArea({ className, selectedFile, onSelectFile }: FileAreaProps) {
	const { files } = useAppState().state;

	const renderFileContent = (file: File) => {
		const extension = file.path.split(".").pop()?.toLowerCase();

		switch (extension) {
			case "md":
				return <MarkdownRenderer content={file.content} />;
			default:
				return <SyntaxHighlighter path={file.path} content={file.content} />;
		}
	};

	return (
		<div className={`flex flex-col flex-grow border rounded-md border-border p-4 ${className}`}>
			<ScrollArea className="h-full">
				{selectedFile ? (
					<div>
						<Button onClick={() => onSelectFile(null)} className="mb-4" variant="outline">
							<ArrowLeft className="mr-2 h-4 w-4" /> Back to Document List
						</Button>
						<div>{renderFileContent(selectedFile)}</div>
					</div>
				) : (
					<FileList files={Object.values(files)} onSelectFile={onSelectFile} />
				)}
			</ScrollArea>
		</div>
	);
}
