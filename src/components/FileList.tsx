import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { File } from "@/lib/state";
import { Code, FileImage, FileText } from "lucide-react";

interface FileListProps {
	files: File[];
	onSelectFile: (path: string | null) => void;
}

const getFileIcon = (path: string) => {
	const extension = path.split(".").pop()?.toLowerCase();
	switch (extension) {
		case "js":
		case "jsx":
		case "ts":
		case "tsx":
		case "py":
		case "java":
		case "cpp":
		case "c":
		case "html":
		case "css":
			return <Code className="w-4 h-4 mr-2 flex-shrink-0" />;
		case "jpg":
		case "jpeg":
		case "png":
		case "gif":
		case "svg":
			return <FileImage className="w-4 h-4 mr-2 flex-shrink-0" />;
		default:
			return <FileText className="w-4 h-4 mr-2 flex-shrink-0" />;
	}
};

export function FileList({ files, onSelectFile }: FileListProps) {
	return (
		<div>
			{files.map((file) => (
				<TooltipProvider key={file.path}>
					<Tooltip>
						<TooltipTrigger asChild>
							<div
								className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded flex items-center mb-2"
								onClick={() => onSelectFile(file.path)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										onSelectFile(file.path);
									}
								}}
								tabIndex={0}
								role="button"
							>
								{getFileIcon(file.path)}
								<span className="truncate">{file.title}</span>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								<b>{file.path}</b>
							</p>
							<p>{file.commitMessage}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			))}
		</div>
	);
}
