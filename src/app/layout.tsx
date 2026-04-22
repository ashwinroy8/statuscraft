import type { Metadata } from "next";
import { Outfit, Space_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/components/providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StatusCraft — AI Marketing Engine for WhatsApp",
  description:
    "Generate daily WhatsApp Status images and videos for your business — powered by AI brand strategy.",
  keywords: ["WhatsApp marketing", "AI content", "small business", "StatusCraft"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${spaceMono.variable} h-full`}
    >
      <body className="min-h-full bg-[#0d0d0f] text-[#f0f0f2] antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
