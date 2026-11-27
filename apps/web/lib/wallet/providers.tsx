"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { qorechainTestnet, wagmiConfig } from "./wagmi";

function RainbowKitThemed({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  // Square corners and the lime accent, matching the Forrel tokens in globals.css.
  const theme =
    resolvedTheme === "light"
      ? lightTheme({ borderRadius: "none", accentColor: "#0a0a0a", accentColorForeground: "#f2f2f2" })
      : darkTheme({ borderRadius: "none", accentColor: "#daff52", accentColorForeground: "#0a0a0a" });

  return (
    <RainbowKitProvider theme={theme} initialChain={qorechainTestnet} modalSize="compact">
      {children}
    </RainbowKitProvider>
  );
}

/** Shared theme, query, wagmi, and QoreX/RainbowKit providers. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitThemed>{children}</RainbowKitThemed>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
