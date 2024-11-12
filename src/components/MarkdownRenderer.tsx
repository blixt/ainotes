import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { SyntaxHighlighter } from "./SyntaxHighlighter";

const MarkdownComponents: Components = {
	h1: ({ children, ...props }) => (
		<h1 className="text-3xl font-bold mt-6 mb-4 first:mt-0 last:mb-0" {...props}>
			{children}
		</h1>
	),
	h2: ({ children, ...props }) => (
		<h2 className="text-2xl font-bold mt-5 mb-3 first:mt-0 last:mb-0" {...props}>
			{children}
		</h2>
	),
	h3: ({ children, ...props }) => (
		<h3 className="text-xl font-bold mt-4 mb-2 first:mt-0 last:mb-0" {...props}>
			{children}
		</h3>
	),
	p: ({ children, ...props }) => (
		<p className="mb-4 last:mb-0" {...props}>
			{children}
		</p>
	),
	ul: ({ children, ...props }) => (
		<ul className="list-disc pl-6 mb-4 last:mb-0" {...props}>
			{children}
		</ul>
	),
	ol: ({ children, ...props }) => (
		<ol className="list-decimal pl-6 mb-4 last:mb-0" {...props}>
			{children}
		</ol>
	),
	li: ({ children, ...props }) => (
		<li className="mb-1 last:mb-0" {...props}>
			{children}
		</li>
	),
	a: ({ children, ...props }) => (
		<a className="text-blue-500 hover:underline" {...props}>
			{children}
		</a>
	),
	blockquote: ({ children, ...props }) => (
		<blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 first:mt-0 last:mb-0" {...props}>
			{children}
		</blockquote>
	),
	code: ({ node, className, children, ...props }) => {
		const match = /language-(\w+)/.exec(className || "");
		const lang = match ? match[1] : "";
		const isInline = !match;
		return !isInline && lang ? (
			<SyntaxHighlighter path={`file.${lang}`} content={String(children).replace(/\n$/, "")} />
		) : (
			<code className={isInline ? "bg-muted rounded px-1 py-0.5" : "block bg-muted rounded p-2 my-2 first:mt-0 last:mb-0"} {...props}>
				{children}
			</code>
		);
	},
	table: ({ children, ...props }) => (
		<div className="overflow-x-auto mb-4 last:mb-0">
			<table className="min-w-full border-collapse border border-gray-300" {...props}>
				{children}
			</table>
		</div>
	),
	thead: ({ children, ...props }) => (
		<thead className="bg-gray-100" {...props}>
			{children}
		</thead>
	),
	tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
	tr: ({ children, ...props }) => (
		<tr className="border-b border-gray-300" {...props}>
			{children}
		</tr>
	),
	th: ({ children, ...props }) => (
		<th className="px-4 py-2 text-left font-semibold" {...props}>
			{children}
		</th>
	),
	td: ({ children, ...props }) => (
		<td className="px-4 py-2" {...props}>
			{children}
		</td>
	),
};

interface MarkdownRendererProps {
	content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
	return (
		<ReactMarkdown components={MarkdownComponents} remarkPlugins={[remarkGfm]}>
			{content}
		</ReactMarkdown>
	);
}
