import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Endless horizontal ticker. The content is rendered twice and the track slides by half its
 * width, so the loop is seamless. Pauses on hover; reduced motion stops it (global rule).
 */
export function Marquee({
  children,
  seconds = 40,
  reverse = false,
  className,
  label,
}: {
  children: ReactNode;
  seconds?: number;
  reverse?: boolean;
  className?: string;
  /** Accessible summary; the moving copy is hidden from screen readers. */
  label?: string;
}) {
  return (
    <div className={cn("group flex overflow-hidden", className)} role={label ? "marquee" : undefined} aria-label={label}>
      <div
        className="flex w-max shrink-0 animate-marquee group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        <div className="flex shrink-0 items-center" aria-hidden={label ? true : undefined}>
          {children}
        </div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
