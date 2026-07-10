import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Repo Explorer — Yash Vasudeva",
  description:
    "Discover GitHub repositories filtered by language and topic — curated for ML, data science, and software engineering.",
  authors: [{ name: "Yash Vasudeva", url: "https://yashvasudeva.app" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text-1)]">
        {children}
      </body>
    </html>
  );
}
