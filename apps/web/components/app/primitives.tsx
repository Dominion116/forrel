import type { ReactNode } from "react";

import { Container, Eyebrow, PixelHeading } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/** Page intro: eyebrow, two-tone pixel heading, description, optional actions on the right. */
export function PageHeader({
  eyebrow,
  lead,
  title,
  children,
  actions,
  className,
}: {
  eyebrow: string;
  lead?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Container className={cn("flex flex-col gap-6 pt-12 pb-10 sm:pt-16", className)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-5">
          <Eyebrow>{eyebrow}</Eyebrow>
          <PixelHeading as="h1" lead={lead} main={title} />
          {children && <div className="max-w-2xl text-body text-muted-foreground">{children}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
      </div>
    </Container>
  );
}

/** Dashed empty / not-found block with an optional action. */
export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 border border-dashed border-control px-6 py-10 sm:px-8",
        className,
      )}
    >
      <p className="text-eyebrow text-muted-foreground">Nothing here</p>
      <h2 className="text-title-lg">{title}</h2>
      {children && <div className="max-w-xl text-body text-muted-foreground">{children}</div>}
      {action}
    </div>
  );
}

/** Pulsing placeholder bar. Respects reduced motion via the global rule. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse bg-surface-2", className)} />;
}

/** Label / value grid used on detail pages. */
export function FactList({
  rows,
  className,
}: {
  rows: [ReactNode, ReactNode][];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 border-t border-dashed border-hairline sm:grid-cols-[11rem_1fr]",
        className,
      )}
    >
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="pt-4 text-body-sm text-muted-foreground sm:border-b sm:border-dashed sm:border-hairline sm:py-4">
            {k}
          </dt>
          <dd className="min-w-0 border-b border-dashed border-hairline pt-1 pb-4 text-body-sm break-words sm:py-4">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Section block inside a page: small eyebrow title + content. */
export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-eyebrow">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
