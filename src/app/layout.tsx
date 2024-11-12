import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StateProvider } from "@/lib/context";
import { NotebookPen } from "lucide-react";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Chat UI App",
	description: "A simple chat UI application",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.className} h-screen overflow-hidden`}>
				<StateProvider>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
						<div className="h-full flex flex-col">
							<header className="px-4 pt-4 flex-shrink-0 flex items-center justify-between">
								<div className="flex items-center">
									<NotebookPen className="w-6 h-6 mr-2" />
									<h1 className="text-xl font-bold">Quick Notes</h1>
								</div>
								<ThemeToggle />
							</header>
							<main className="flex-grow flex flex-col w-full max-w-full overflow-auto p-4">{children}</main>
						</div>
					</ThemeProvider>
				</StateProvider>
			</body>
		</html>
	);
}
