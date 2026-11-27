import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppFooter, AppHeader } from "@/components/app/app-shell";

export const metadata: Metadata = {
  title: { default: "Forrel app", template: "%s · Forrel" },
};

/** App shell for every /app route. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-brand focus:px-3 focus:py-2 focus:text-on-brand"
      >
        Skip to content
      </a>
      <AppHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
