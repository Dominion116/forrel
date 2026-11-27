"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribe = () => () => {};

/** Two-option DARK / LIGHT switch in the sample's pixel-label style. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoid a hydration mismatch: the theme is only known on the client.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const current = mounted ? resolvedTheme : undefined;

  return (
    <div role="group" aria-label="Color theme" className={cn("inline-flex border border-hairline", className)}>
      {(["dark", "light"] as const).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={current === t}
          onClick={() => setTheme(t)}
          className={cn(
            "text-eyebrow h-8 px-3 transition-colors duration-150",
            current === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
