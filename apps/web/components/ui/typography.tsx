import Link from "next/link";
import * as React from "react";

import { ArrowRight, ArrowUpRight } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Page-width container: 1216px max with a 16px gutter on phones, 24–32px above. */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-(--container-page) px-4 sm:px-6 lg:px-8", className)} {...props} />
  );
}

/** A section separated from the previous one by the sample's full-bleed dashed rule. */
export function Section({
  className,
  divider = true,
  ...props
}: React.ComponentProps<"section"> & { divider?: boolean }) {
  return (
    <section
      className={cn("py-20 sm:py-28", divider && "border-t border-dashed border-hairline", className)}
      {...props}
    />
  );
}

/** Pixel uppercase kicker: "THE CHALLENGE". Use it only where it encodes a real section name. */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-eyebrow text-foreground/80", className)} {...props} />;
}

/**
 * Two-tone pixel headline from the sample: first line muted, second line full ink.
 *   <PixelHeading lead="Two things," main="Before any code." />
 */
export function PixelHeading({
  lead,
  main,
  as: Tag = "h2",
  size = "md",
  className,
}: {
  lead?: React.ReactNode;
  main: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Tag className={cn(size === "md" ? "text-display" : "text-display-sm", className)}>
      {lead ? (
        <>
          <span className="block text-muted-foreground">{lead}</span>
          <span className="block">{main}</span>
        </>
      ) : (
        main
      )}
    </Tag>
  );
}

/** "[ 3 ] Cut one head off the Hydra…" side note. */
export function Footnote({
  n,
  className,
  children,
}: {
  n: number | string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("max-w-xs text-body-sm text-muted-foreground", className)}>
      <span className="mr-1.5 text-foreground">[ {n} ]</span>
      {children}
    </p>
  );
}

/** Underlined mono link with the long arrow, or ↗ when it leaves the site. */
export function TextLink({
  href,
  external = false,
  className,
  children,
}: {
  href: string;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cn(
    "group/link inline-flex w-fit items-center gap-2 border-b border-control pb-0.5 text-foreground transition-colors duration-150 hover:border-brand-ink",
    className,
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
        <ArrowUpRight />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
      <ArrowRight />
    </Link>
  );
}

/** Lime inline highlight: "The deadline is marked Due." */
export function Highlight({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-brand-ink", className)} {...props} />;
}
