import * as React from "react";

import { cn } from "@/lib/utils";

/** "→ Anyone 18 or older…" list with lime arrows. */
export function ArrowList({
  items,
  className,
}: {
  items: React.ReactNode[];
  className?: string;
}) {
  return (
    <ul data-stagger="" className={cn("flex flex-col gap-3", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-body">
          <span aria-hidden="true" className="shrink-0 text-brand-ink in-data-[variant=featured]:text-on-brand">
            →
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Stack of rows separated by dashed hairlines (schedule, "What to submit"). */
export function RowList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      className={cn(
        "border-t border-dashed border-hairline [&>li]:border-b [&>li]:border-dashed [&>li]:border-hairline",
        className,
      )}
      {...props}
    />
  );
}

/**
 * One row: a mono index or date column, a sans title, mono detail, and an optional trailing tag.
 * `tone="past"` dims the row, like the sample's finished "Kickoff" entry.
 */
export function Row({
  index,
  title,
  detail,
  trailing,
  tone = "default",
  trackItem = false,
  className,
}: {
  index: React.ReactNode;
  title: React.ReactNode;
  detail?: React.ReactNode;
  trailing?: React.ReactNode;
  tone?: "default" | "past";
  /** Light up when a surrounding <ScrollTrack> rail reaches this row. */
  trackItem?: boolean;
  className?: string;
}) {
  return (
    <li
      data-track-item={trackItem ? "" : undefined}
      className={cn(
        "group/row grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-1 py-6 sm:grid-cols-[9rem_1fr_auto] sm:gap-x-8",
        trackItem && "transition-[opacity,transform] duration-500 ease-(--ease-out) not-data-active:opacity-45",
        className,
      )}
    >
      <div
        className={cn(
          "text-body-sm tabular-nums transition-colors duration-500",
          tone === "past" ? "text-muted-foreground/70" : "text-muted-foreground",
          trackItem && "group-data-active/row:font-pixel group-data-active/row:text-lg group-data-active/row:leading-tight group-data-active/row:text-brand-ink",
        )}
      >
        {index}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className={cn("text-title", tone === "past" && "text-muted-foreground")}>{title}</div>
        {detail && <div className="text-body-sm text-muted-foreground">{detail}</div>}
      </div>
      {trailing && <div className="col-start-2 sm:col-start-3 sm:row-start-1">{trailing}</div>}
    </li>
  );
}

/** Numbered steps with lime pixel numerals ("1  Register…", "2  Install…"). */
export function Step({
  n,
  title,
  children,
  className,
}: {
  n: number;
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-dashed border-hairline py-8 sm:grid-cols-[4rem_1fr]",
        className,
      )}
    >
      <span aria-hidden="true" className="font-pixel text-3xl leading-none text-brand-ink">
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="text-title">
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
        {children}
      </div>
    </li>
  );
}

export function StepList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol className={cn("border-t border-dashed border-hairline", className)} {...props} />;
}
