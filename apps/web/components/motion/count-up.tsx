"use client";

import { useEffect, useRef, useState } from "react";

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * A number that counts up from 0 (or from its previous value) when it scrolls into view.
 * Renders the final value on the server and with reduced motion.
 */
export function CountUp({
  value,
  duration = 1600,
  format = (n: number) => Math.round(n).toLocaleString("en-US"),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const [display, setDisplay] = useState(value);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      shown.current = value;
      return;
    }
    let raf = 0;
    const from = seen.current ? shown.current : 0;
    if (!seen.current) setDisplay(0);

    const run = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const v = from + (value - from) * easeOutExpo(p);
        shown.current = v;
        setDisplay(v);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (seen.current) {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        seen.current = true;
        io.disconnect();
        run();
      }
    });
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true" className="tabular-nums">
        {format(display)}
      </span>
    </span>
  );
}
