import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Pixel-type tags from the UI sample: "DUE", "WEB + MOBILE", "REQUIRED + BONUS".
 * Square, 1px outline, uppercase pixel label with wide tracking.
 * Status tags always carry a word, never color alone.
 */
const badgeVariants = cva(
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-none border px-2 font-pixel text-[0.625rem] leading-none tracking-[0.28em] whitespace-nowrap uppercase [&_svg]:size-3",
  {
    variants: {
      variant: {
        brand: "border-brand-ink text-brand-ink",
        solid: "border-brand bg-brand text-on-brand",
        /* For use on lime surfaces ("WILDCARD" on the featured card) */
        "on-brand": "border-on-brand text-on-brand",
        outline: "border-control text-muted-foreground",
        verified: "border-verified text-verified",
        warning: "border-warning text-warning",
        destructive: "border-danger text-danger",
        /* Aliases kept for earlier screens */
        default: "border-brand-ink text-brand-ink",
        secondary: "border-control text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "brand",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
