import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Square, mono-labelled buttons from the UI sample.
 *
 * - primary:  solid ink fill ("See the projects →" on black; inverts in light mode)
 * - brand:    solid lime fill, dark label
 * - outline-brand: 1px lime outline + lime label ("Join Slack" in the nav)
 * - outline:  1px hairline outline, ink label
 * - inverse:  near-black fill for use ON lime surfaces ("Join Slack →" in the lime band)
 * - ghost:    muted label that brightens on hover (nav links, "Log in")
 * - link:     underlined text link with arrow ("Claim your credits →")
 * - destructive: danger outline (revoke, delete)
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-3 rounded-none font-mono font-normal whitespace-nowrap",
    "transition-[background-color,border-color,color,scale] duration-150 ease-(--ease-standard)",
    "active:scale-[0.97] active:duration-100",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        brand: "bg-brand text-on-brand hover:bg-brand/85",
        "outline-brand":
          "border border-brand-ink text-brand-ink hover:bg-brand hover:text-on-brand hover:border-brand",
        outline: "border border-control text-foreground hover:border-foreground hover:bg-surface-2",
        inverse: "bg-on-brand text-brand hover:bg-on-brand/85",
        ghost: "text-muted-foreground hover:text-foreground",
        link: "h-auto! px-0! pb-0.5 text-foreground underline decoration-control decoration-1 underline-offset-[6px] hover:decoration-brand-ink active:scale-100",
        destructive:
          "border border-danger text-danger hover:bg-danger hover:text-background",
        /* Aliases kept for screens built before the tokens landed */
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-control text-foreground hover:border-foreground hover:bg-surface-2",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem]",
        md: "h-10 px-5 text-[0.875rem]",
        lg: "h-12 px-7 text-[0.9375rem]",
        icon: "size-10",
        default: "h-10 px-5 text-[0.875rem]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

/** The sample's long thin arrow. Nudges right when its parent button is hovered. */
export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 12"
      fill="none"
      className={cn(
        "h-3 w-7! transition-transform duration-150 ease-(--ease-out) group-hover/button:translate-x-0.5 group-hover/link:translate-x-0.5",
        className,
      )}
    >
      <path d="M0 6h26M21 1l5 5-5 5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** "↗" for links that leave the site. */
export function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      fill="none"
      className={cn(
        "size-3! transition-transform duration-150 ease-(--ease-out) group-hover/link:-translate-y-px group-hover/link:translate-x-px",
        className,
      )}
    >
      <path d="M2 10 10 2M4 2h6v6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export { buttonVariants };
