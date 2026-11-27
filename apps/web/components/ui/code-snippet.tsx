"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Command well with a pixel "COPY" control, from the sample's install step. */
export function CodeSnippet({
  code,
  label = "Command",
  className,
}: {
  code: string;
  /** Accessible name for the copy button target, e.g. "install command". */
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div
      className={cn(
        "flex max-w-full min-w-0 items-center justify-between gap-4 border border-dashed border-hairline bg-surface py-3 pr-2 pl-4",
        className,
      )}
    >
      <code className="min-w-0 overflow-x-auto text-body-sm whitespace-pre text-foreground">{code}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={cn(
          "text-eyebrow inline-flex h-8 shrink-0 items-center px-2 transition-colors duration-150",
          state === "copied" ? "text-brand-ink" : "text-muted-foreground hover:text-foreground",
          state === "failed" && "text-danger",
        )}
      >
        {state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : "Copy"}
      </button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Copied to clipboard" : state === "failed" ? "Copy failed" : ""}
      </span>
    </div>
  );
}
