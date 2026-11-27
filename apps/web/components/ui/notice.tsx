import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Lime-outlined banner from the sample hero:
 *   [ SUBMISSIONS ARE CLOSED. Thank you to everyone who built and shipped. ]
 */
export function Notice({
  label,
  tone = "brand",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label: string;
  tone?: "brand" | "warning" | "danger";
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-2 border px-5 py-4 sm:flex-row sm:items-baseline sm:gap-4",
        tone === "brand" && "border-brand-ink",
        tone === "warning" && "border-warning",
        tone === "danger" && "border-danger",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "text-eyebrow shrink-0",
          tone === "brand" && "text-brand-ink",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
        )}
      >
        {label}
      </span>
      <span className="text-body text-foreground">{children}</span>
    </div>
  );
}

/** Left-bar callout: "Launch buzz is required: …" */
export function Callout({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-l-2 border-brand-ink py-1 pl-6 text-body text-foreground", className)}
      {...props}
    />
  );
}

/** Full-bleed lime band: "Join our Slack group". */
export function BrandBand({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("bg-brand text-on-brand", className)} {...props} />;
}
