import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Square cells with 1px hairline borders, as in the sample's "01 / 02 / 03" rows.
 * Put cards in <CardGrid> to get shared borders (cells touch, no gaps).
 */
const cardVariants = cva("relative flex flex-col rounded-none text-foreground", {
  variants: {
    variant: {
      default: "border border-hairline",
      /* Lime "Pure chaos" cell */
      featured: "border border-brand bg-brand text-on-brand",
      /* Code wells and footers */
      surface: "border border-hairline bg-surface",
      /* Dashed outline for empty states and drop zones */
      dashed: "border border-dashed border-control",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Card({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant ?? "default"}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

/** Joined grid: outer border on the grid, inner borders on the cells. */
export function CardGrid({
  className,
  cols = 3,
  ...props
}: React.ComponentProps<"div"> & { cols?: 2 | 3 | 4 }) {
  return (
    <div
      data-slot="card-grid"
      className={cn(
        "grid grid-cols-1 border-t border-l border-hairline",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "md:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        "[&>[data-slot=card]]:border-t-0 [&>[data-slot=card]]:border-l-0",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-3 p-6 sm:p-8", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="card-title" className={cn("text-title", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "text-body-sm text-muted-foreground in-data-[variant=featured]:text-on-brand/80",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-6 pb-6 sm:px-8 sm:pb-8", className)} {...props} />
  );
}

export { cardVariants };
