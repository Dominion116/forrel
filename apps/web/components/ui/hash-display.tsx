"use client";

import { useEffect, useRef, useState } from "react";

import { shortHash } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Copy-to-clipboard hook with a 2 s "copied" state. */
export function useCopy() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }
  return { state, copy };
}

/**
 * A hash or address: truncated by default, full value on hover/focus (title) and on
 * wide screens when `full` is set, with a pixel COPY control.
 */
export function HashDisplay({
  value,
  label = "hash",
  full = false,
  className,
}: {
  value: string;
  label?: string;
  /** Show the whole value (wraps) instead of truncating. */
  full?: boolean;
  className?: string;
}) {
  const { state, copy } = useCopy();
  return (
    <span className={cn("inline-flex max-w-full min-w-0 items-center gap-3", className)}>
      <code
        title={value}
        className={cn("min-w-0 text-body-sm text-foreground", full ? "break-all" : "truncate")}
      >
        {full ? value : shortHash(value, 8, 6)}
      </code>
      <button
        type="button"
        onClick={() => copy(value)}
        aria-label={`Copy ${label}`}
        className={cn(
          "text-eyebrow shrink-0 transition-colors duration-150",
          state === "copied" ? "text-brand-ink" : "text-muted-foreground hover:text-foreground",
          state === "failed" && "text-danger",
        )}
      >
        {state === "copied" ? "Copied" : state === "failed" ? "Failed" : "Copy"}
      </button>
      <span role="status" className="sr-only">
        {state === "copied" ? `${label} copied` : ""}
      </span>
    </span>
  );
}
