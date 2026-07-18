import type { Metadata } from "next";
import type { Viewport } from "next";
import { Hanken_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "@/components/ui/toaster";

const display = Hanken_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const APP_URL = "https://omega-chat-five.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Omega Cloud — Free Multi-Model AI Chat",
  description:
    "Omega Cloud is a free multi-model AI chat application. DeepSeek, code execution, web search, image generation, Google Drive sync — no API keys required.",
  keywords: [
    "Omega Cloud",
    "Omega Chat",
    "AI chat",
    "free AI chat",
    "DeepSeek",
    "multi-model AI",
    "code execution",
    "web search",
    "image generation",
    "Google Drive AI",
    "ChatGPT alternative",
  ],
  authors: [{ name: "Omega" }],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Omega Cloud — Free Multi-Model AI Chat",
    description:
      "Multi-model AI chat with code execution, web search, and image generation. Free. No API keys needed.",
    type: "website",
    url: APP_URL,
    siteName: "Omega Cloud",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Omega Cloud — Free Multi-Model AI Chat",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Omega Cloud — Free Multi-Model AI Chat",
    description:
      "Multi-model AI chat with code execution, web search, and image generation. Free. No API keys needed.",
    images: ["/og-image.png"],
    creator: "@omega",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
