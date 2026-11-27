import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FAQ rows from the sample: sans question, mono answer, dashed separators,
 * a "+" that turns into "×" when open. Built on <details> so it works without JS.
 */
export function Accordion({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-t border-dashed border-hairline [&>details]:border-b [&>details]:border-dashed [&>details]:border-hairline",
        className,
      )}
      {...props}
    />
  );
}

export function AccordionItem({
  question,
  children,
  defaultOpen,
}: {
  question: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-title [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <span
          aria-hidden="true"
          className="font-mono text-lg leading-none text-muted-foreground transition-transform duration-200 ease-(--ease-out) group-open:rotate-45 group-open:text-foreground"
        >
          +
        </span>
      </summary>
      <div className="max-w-2xl pb-8 text-body text-muted-foreground">{children}</div>
    </details>
  );
}
