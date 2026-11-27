"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A lime progress rail beside a list that fills as you scroll through it. Every item
 * marked `data-track-item` lights up when the rail's head passes it.
 * Section-level only (this is not a page scroll indicator).
 */
export function ScrollTrack({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = () => Array.from(el.querySelectorAll<HTMLElement>("[data-track-item]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.style.setProperty("--p", "1");
      items().forEach((it) => it.setAttribute("data-active", ""));
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / Math.max(1, r.height)));
      el.style.setProperty("--p", p.toFixed(4));
      const head = p * r.height;
      for (const it of items()) {
        const top = it.offsetTop + it.offsetHeight * 0.35;
        if (head >= top) it.setAttribute("data-active", "");
        else it.removeAttribute("data-active");
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className={cn("relative pl-8", className)}>
      <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-px bg-hairline" />
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 w-px bg-brand-ink"
        style={{ height: "calc(var(--p, 0) * 100%)" }}
      />
      <span
        aria-hidden="true"
        className="absolute -left-[5px] size-[11px] bg-brand-ink shadow-[0_0_16px_var(--brand-ink)]"
        style={{ top: "calc(var(--p, 0) * 100% - 5px)" }}
      />
      {children}
    </div>
  );
}
