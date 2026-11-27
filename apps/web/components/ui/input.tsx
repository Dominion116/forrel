import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Square mono field. The sample has no inputs, so this follows its button shape
 * (0 radius, 1px line) with design.md's 3:1 border and visible focus rules.
 */
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-none border border-control bg-transparent px-3 font-mono text-[0.9375rem] text-foreground",
        "placeholder:text-muted-foreground/80",
        "transition-[border-color] duration-150 hover:border-foreground",
        "focus-visible:border-brand-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-ink",
        "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** Label above, helper or error below. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-eyebrow text-foreground/80">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-body-sm text-danger">
          <span aria-hidden="true">× </span>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-body-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
