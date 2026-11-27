"use client";

import type { VariantProps } from "class-variance-authority";
import { useRef, type ComponentProps, type PointerEvent } from "react";

import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A Card that tilts in 3D toward the pointer, with a spotlight that follows it.
 * Drop-in for <Card> (same variants, same data-slot, so CardGrid borders still work).
 * Mouse and pen only; touch scrolls normally.
 */
export function TiltCard({
  className,
  variant,
  max = 7,
  children,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof cardVariants> & { max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${((0.5 - y) * max).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((x - 0.5) * max).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    el.dataset.tilting = "";
  }

  function leave() {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.tilting;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      ref={ref}
      data-slot="card"
      data-variant={variant ?? "default"}
      data-tilt=""
      onPointerMove={move}
      onPointerLeave={leave}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
}
