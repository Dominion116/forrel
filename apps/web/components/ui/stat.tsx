import * as React from "react";

import { cn } from "@/lib/utils";

/** "$1,500 cash": big sans figure with a mono unit one step quieter. */
export function Figure({
  value,
  unit,
  className,
}: {
  value: React.ReactNode;
  unit?: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("flex items-baseline gap-2", className)}>
      <span className="text-numeric">{value}</span>
      {unit && <span className="text-body-sm text-muted-foreground">{unit}</span>}
    </p>
  );
}

/** Lime block with a pixel figure: "+$250 OpenAI credits". */
export function BrandChip({
  value,
  children,
  className,
}: {
  value: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("inline-flex items-baseline gap-3 bg-brand px-4 py-2.5 text-on-brand", className)}>
      <span className="font-pixel text-3xl leading-none">{value}</span>
      <span className="text-body-sm">{children}</span>
    </p>
  );
}

/** Oversized pixel ordinal or index ("1st", "01"). `dim` renders it as a ghost numeral. */
export function PixelNumeral({
  children,
  tone = "ink",
  className,
}: {
  children: React.ReactNode;
  tone?: "ink" | "brand" | "dim";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-pixel leading-none",
        tone === "ink" && "text-foreground",
        tone === "brand" && "text-brand-ink",
        tone === "dim" && "text-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}
