import { ArrowRight, FileEdit } from "lucide-react";

export function MetadataUpdate({ diff: updates }: { diff: Record<string, string> }) {
	const longestKeyLength = Math.max(...Object.keys(updates).map((key) => key.length));

	return (
		<div className="flex text-xs text-muted-foreground mt-1 mb-1 max-w-[70%]">
			<FileEdit className="h-3 w-3 mr-1 flex-shrink-0 mt-[2px]" />
			<div className="flex flex-col">
				{Object.entries(updates).map(([key, value]) => (
					<div key={key} className="flex items-center">
						<span className="font-mono font-bold truncate" style={{ minWidth: `${longestKeyLength}ch` }}>
							{key}
						</span>
						<ArrowRight className="h-3 w-3 mx-2 flex-shrink-0" />
						<span className="truncate">{value}</span>
					</div>
				))}
			</div>
		</div>
	);
}
