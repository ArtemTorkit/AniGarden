import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import SiteFooter from "@/components/SiteFooter";
import AuthPromptProvider from "@/components/AuthPromptProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "AniGarden", template: "%s | AniGarden" },
  description: "Collect, grow, and trade your character garden",
  applicationName: "AniGarden",
  keywords: ["anime collection", "character collection", "digital garden", "peer-to-peer trades"],
  openGraph: { title: "AniGarden", description: "Collect, grow, and trade your character garden", type: "website" },
  twitter: { card: "summary_large_image", title: "AniGarden", description: "Collect, grow, and trade your character garden" },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body><AuthPromptProvider>{children}<SiteFooter /></AuthPromptProvider><Analytics /></body>
    </html>
  );
}
