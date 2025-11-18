import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Nebula Todoist",
  description:
    "A dual-mode futuristic todo workspace blending simple and timer-based flows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${space.variable} antialiased bg-night text-aurora-soft`}>
        {children}
      </body>
    </html>
  );
}
