import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HistoryEntry } from "@/lib/state";
import { ArrowUpToLine, FileSearch, PenSquare, PlusCircle, RefreshCw, Trash2 } from "lucide-react";

const codeExtensions = new Set([
	".js",
	".jsx",
	".ts",
	".tsx",
	".py",
	".rb",
	".java",
	".cpp",
	".cs",
	".php",
	".html",
	".css",
	".scss",
	".sass",
	".less",
	".vue",
	".svelte",
	".go",
	".rs",
	".swift",
	".kt",
	".scala",
	".clj",
	".elm",
	".hs",
	".ml",
	".pl",
	".sh",
	".bash",
	".ps1",
	".sql",
	".r",
	".m",
	".mm",
	".f",
	".f90",
	".groovy",
	".lua",
	".dart",
	".ex",
	".exs",
	".erl",
	".hrl",
	".c",
	".h",
	".hpp",
]);

const isCodeFile = (path: string): boolean => {
	const lastDotIndex = path.lastIndexOf(".");
	if (lastDotIndex === -1) return false;
	const extension = path.slice(lastDotIndex).toLowerCase();
	return codeExtensions.has(extension);
};

const getContentPreview = (entry: HistoryEntry) => {
	if (entry.type === "file-pending") {
		switch (entry.op) {
			case "create":
				return "A new file is being added to your project.";
			case "update":
				return "The contents of the file are being modified.";
			case "delete":
				return "The file is being removed from your project.";
			case "rename":
				return "The file is getting a new name.";
			case "read":
				return "The file contents are being retrieved.";
			default:
				return "Changes are being made to the file.";
		}
	}

	if (entry.type === "file-read") {
		return "The file contents have been retrieved.";
	}

	if (entry.type !== "file") {
		return "No file action available.";
	}

	switch (entry.op.type) {
		case "delete":
			return "This file has been deleted.";
		case "rename":
			return `Renamed to ${entry.op.newPath}`;
		case "create":
		case "update": {
			const isCode = isCodeFile(entry.path);
			const content = entry.op.preview || "No preview available.";
			if (isCode) {
				return (
					content
						.split("\n")
						.map((line) => (line.length > 32 ? `${line.substring(0, 32)}…` : line))
						.slice(0, 3)
						.join("\n") || "Empty code file."
				);
			}
			return content.length > 103 ? `${content.substring(0, 100)}…` : content || "Empty file.";
		}
		default:
			return "Unknown file action.";
	}
};

export const FileAction = ({
	entry,
	onSelect,
}: {
	entry: HistoryEntry;
	onSelect: (path: string) => void;
}) => {
	if (entry.type !== "file" && entry.type !== "file-pending" && entry.type !== "file-read") {
		return null;
	}

	const handleClick = () => {
		if (entry.type === "file" || entry.type === "file-read") {
			onSelect(entry.path);
		}
	};

	const getIcon = () => {
		if (entry.type === "file-pending") {
			switch (entry.op) {
				case "create":
					return <PlusCircle className="w-4 h-4 text-green-600 animate-pulse" />;
				case "update":
					return <PenSquare className="w-4 h-4 text-blue-600 animate-pulse" />;
				case "delete":
					return <Trash2 className="w-4 h-4 text-red-600 animate-pulse" />;
				case "rename":
					return <ArrowUpToLine className="w-4 h-4 text-yellow-600 animate-pulse" />;
				case "read":
					return <FileSearch className="w-4 h-4 text-purple-600 animate-pulse" />;
				default:
					return <RefreshCw className="w-4 h-4 text-gray-600 animate-pulse" />;
			}
		}
		if (entry.type === "file-read") {
			return <FileSearch className="w-4 h-4 text-purple-600" />;
		}
		switch (entry.op.type) {
			case "create":
				return <PlusCircle className="w-4 h-4 text-green-600" />;
			case "update":
				return <RefreshCw className="w-4 h-4 text-blue-600" />;
			case "delete":
				return <Trash2 className="w-4 h-4 text-red-600" />;
			case "rename":
				return <ArrowUpToLine className="w-4 h-4 text-yellow-600" />;
		}
	};

	const getTitle = () => {
		if (entry.type === "file-pending") {
			switch (entry.op) {
				case "create":
					return `Creating ${entry.paths.join(", ") || "file"}…`;
				case "update":
					return `Updating ${entry.paths.join(", ") || "file"}…`;
				case "delete":
					return `Deleting ${entry.paths.join(", ") || "file"}…`;
				case "rename":
					return `Renaming ${entry.paths.join(", ") || "file"}…`;
				case "read":
					return `Reading ${entry.paths.join(", ") || "file"}…`;
				default:
					return "Updating file…";
			}
		}
		if (entry.type === "file-read") {
			return `Read ${entry.path}`;
		}
		switch (entry.op.type) {
			case "create":
				return entry.op.title;
			case "update":
				return entry.op.title;
			case "delete":
				return `Deleted ${entry.path}`;
			case "rename":
				return `Renamed ${entry.path} to ${entry.op.newPath}`;
		}
	};

	const commitMessage = entry.type === "file" ? entry.commitMessage : "";
	const isCode = entry.type === "file" && isCodeFile(entry.path);

	return (
		<Card className="w-[350px] hover:border-foreground cursor-pointer" onClick={handleClick}>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 truncate" title={entry.type === "file-pending" ? entry.paths.join(", ") : entry.path}>
					<span className="flex-shrink-0">{getIcon()}</span>
					<span className="truncate">{getTitle()}</span>
				</CardTitle>
				{commitMessage && <p className="text-xs text-muted-foreground truncate">{commitMessage}</p>}
			</CardHeader>
			<CardContent>
				<p className={`text-sm text-muted-foreground ${isCode ? "font-mono whitespace-pre-wrap" : ""}`}>{getContentPreview(entry)}</p>
			</CardContent>
		</Card>
	);
};
