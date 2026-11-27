"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Command well with a pixel "COPY" control, from the sample's install step.
 * `typing` types the command out with a block caret when it scrolls into view.
 * Copy always copies the full command.
 */
export function CodeSnippet({
  code,
  label = "Command",
  typing = false,
  className,
}: {
  code: string;
  /** Accessible name for the copy button target, e.g. "install command". */
  label?: string;
  typing?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [typed, setTyped] = useState(code.length);
  const [typingNow, setTypingNow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!typing || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id: ReturnType<typeof setTimeout> | null = null;
    setTyped(0);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        setTypingNow(true);
        let n = 0;
        const step = () => {
          // Type a few characters per tick, a little irregular, like a person.
          n = Math.min(code.length, n + 1 + Math.floor(Math.random() * 2));
          setTyped(n);
          if (n < code.length) id = setTimeout(step, 22 + Math.random() * 40);
          else id = setTimeout(() => setTypingNow(false), 900);
        };
        id = setTimeout(step, 250);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (id) clearTimeout(id);
    };
  }, [typing, code]);

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
      ref={boxRef}
      className={cn(
        "flex max-w-full min-w-0 items-center justify-between gap-4 border border-dashed border-hairline bg-surface py-3 pr-2 pl-4",
        className,
      )}
    >
      <code className="min-w-0 overflow-x-auto text-body-sm whitespace-pre text-foreground">
        {typing ? (
          <>
            <span className="sr-only">{code}</span>
            <span aria-hidden="true">
              {code.slice(0, typed)}
              {(typingNow || typed < code.length) && (
                <span className="ml-px inline-block h-[1.1em] w-[0.6em] translate-y-[0.15em] animate-blink bg-brand-ink" />
              )}
            </span>
          </>
        ) : (
          code
        )}
      </code>
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
