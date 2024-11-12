"use client";

import { ChatArea } from "@/components/ChatArea";
import { FileArea } from "@/components/FileArea";
import { useAppState } from "@/lib/context";
import type { File } from "@/lib/state";
import { useState } from "react";

export default function ChatUI() {
	const { state } = useAppState();
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	function handleSelectFile(path: string | null) {
		if (!path) {
			setSelectedFile(null);
			return;
		}
		const file = state.files[path];
		if (!file) return;
		setSelectedFile(file);
	}

	return (
		<div className="w-full h-full flex gap-4">
			<ChatArea className="flex-1 min-w-0" onSelectFile={handleSelectFile} />
			<FileArea className="flex-1 min-w-0" selectedFile={selectedFile} onSelectFile={handleSelectFile} />
		</div>
	);
}
