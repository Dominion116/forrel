import type { Metadata } from "next";
import { GeistPixelGrid, GeistPixelSquare } from "geist/font/pixel";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";

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

export const metadata: Metadata = {
  title: "Forrel — Releases that still verify after Q-Day",
  description:
    "Post-quantum release and firmware signing log on QoreChain, verified on-chain with ML-DSA-87.",
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
      </body>
    </html>
  );
}
