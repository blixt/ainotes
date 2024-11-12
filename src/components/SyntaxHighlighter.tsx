import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Prism } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SyntaxHighlighterProps {
	path: string;
	content: string;
}

export function SyntaxHighlighter({ path, content }: SyntaxHighlighterProps) {
	const { theme, systemTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const extension = path.split(".").pop()?.toLowerCase();
	const language = extension || "text";

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<pre className="bg-muted p-4 rounded-md">
				<code>{content}</code>
			</pre>
		);
	}

	const currentTheme = theme === "system" ? systemTheme : theme;

	return (
		<Prism
			language={language}
			style={currentTheme === "dark" ? oneDark : oneLight}
			customStyle={{
				margin: 0,
				padding: "1rem",
				borderRadius: "0.5rem",
				fontSize: "0.875rem",
			}}
			useInlineStyles={true}
		>
			{content}
		</Prism>
	);
}
