export interface AttachmentFile {
	id: string;
	file: File;
	preview: string | null;
	status: { current: "processing"; progress: number } | { current: "ready"; base64: string } | { current: "error"; errorMessage: string };
}

export const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

export function validateFile(file: File): boolean {
	return file.size <= MAX_FILE_SIZE;
}

export function calculateImageTokens(sourceWidth: number, sourceHeight: number): { width: number; height: number; tokenCount: number } {
	let width = sourceWidth;
	let height = sourceHeight;

	// Ensure width and height don't exceed 1568
	if (width > 1568 || height > 1568) {
		const aspectRatio = width / height;
		if (width > height) {
			width = 1568;
			height = Math.floor(width / aspectRatio);
		} else {
			height = 1568;
			width = Math.floor(height * aspectRatio);
		}
	}

	// Calculate initial token count
	let tokenCount = Math.ceil((width * height) / 750);

	// If token count exceeds 1600, downscale the image
	if (tokenCount > 1600) {
		const scale = Math.sqrt(1600 / tokenCount);
		width = Math.floor(width * scale);
		height = Math.floor(height * scale);
		tokenCount = 1600;
	}

	return { width, height, tokenCount };
}

export async function resizeAndEncodeImage(file: File): Promise<string> {
	// Check if the file is an image of the allowed types
	const allowedTypes = ["image/png", "image/gif", "image/webp", "image/jpeg"];
	if (!allowedTypes.includes(file.type)) {
		throw new Error("Invalid file type. Only PNG, GIF, WebP, and JPEG are allowed.");
	}

	// Create an image object from the file
	const img = new Image();
	const imageUrl = URL.createObjectURL(file);

	await new Promise((resolve, reject) => {
		img.onload = resolve;
		img.onerror = reject;
		img.src = imageUrl;
	});

	// Calculate new dimensions
	const { width, height } = calculateImageTokens(img.width, img.height);

	// Create a canvas and resize the image
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Unable to create canvas context");
	}
	ctx.drawImage(img, 0, 0, width, height);

	// Convert the resized image to base64
	const base64 = canvas.toDataURL(file.type);

	// Clean up
	URL.revokeObjectURL(imageUrl);

	return base64;
}
