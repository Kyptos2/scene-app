import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

// Same editorial pairing as the mobile app: Fraunces for headline-tier
// text (wordmark, hero, section titles), a clean sans for everything else.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCENE — Network. Create. Inspire.",
  description:
    "SCENE is the professional network for filmmakers — find verified crew, join production workspaces, and connect at festivals and local shoots.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NavBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
