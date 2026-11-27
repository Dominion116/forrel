import type { Metadata, Viewport } from "next";
import { GeistPixelGrid, GeistPixelSquare } from "geist/font/pixel";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { MotionObserver } from "@/components/motion/motion-observer";
import { Providers } from "@/lib/wallet/providers";
import "./globals.css";

/** Titles: tight sans. */
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

/** Body, code and UI text: mono. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const description =
  "Post-quantum release and firmware signing log on QoreChain. Every release is signed with ML-DSA-87 and checked on-chain. Drop any file to see if it's genuine.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Forrel — Releases that still verify after Q-Day",
  description,
  applicationName: "Forrel",
  openGraph: {
    type: "website",
    siteName: "Forrel",
    title: "Forrel — Releases that still verify after Q-Day",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forrel — Releases that still verify after Q-Day",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#f2f2f2" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${plexMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground">
        <Providers>{children}</Providers>
        <MotionObserver />
      </body>
    </html>
  );
}
