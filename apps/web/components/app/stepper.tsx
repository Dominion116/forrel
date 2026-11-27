import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Wizard progress: numbered pixel steps, done ones in lime, the current one outlined.
 * Collapses to "Step n of N · title" on phones.
 */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Progress" className="flex flex-col gap-3">
      <p className="text-body-sm text-muted-foreground md:hidden">
        Step {current + 1} of {steps.length} · <span className="text-foreground">{steps[current]}</span>
      </p>
      <ol className="hidden border-t border-l border-hairline md:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li
              key={s}
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "flex min-w-0 flex-col gap-2 border-r border-b border-hairline p-4",
                state === "current" && "bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "font-pixel text-2xl leading-none",
                  state === "done" && "text-brand-ink",
                  state === "current" && "text-foreground",
                  state === "todo" && "text-dim",
                )}
              >
                {state === "done" ? "✓" : String(i + 1).padStart(2, "0")}
              </span>
              <span className={cn("truncate text-body-sm", state === "todo" ? "text-muted-foreground" : "text-foreground")}>
                {s}
                <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (current)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Body of one wizard step with a title and a footer for back / next. */
export function StepBody({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="animate-rise flex flex-col gap-8 border border-hairline p-6 sm:p-8">
      <header className="flex flex-col gap-3">
        <h2 className="text-title-lg">{title}</h2>
        {description && <div className="max-w-2xl text-body text-muted-foreground">{description}</div>}
      </header>
      {children}
      {footer && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-hairline pt-6">{footer}</div>}
    </section>
  );
}
