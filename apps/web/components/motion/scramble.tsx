"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "0123456789abcdef#%&*+=/<>[]{}";

/**
 * Text that "decrypts" when it scrolls into view: each character cycles through hex and
 * symbol noise, then locks to the real letter, roughly left to right.
 * Screen readers get the real text only. Reduced motion shows the final text.
 */
export function Scramble({
  text,
  className,
  delay = 0,
  duration = 1100,
}: {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [out, setOut] = useState(text);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOut(text);
      return;
    }
    const chars = [...text];
    const n = Math.max(1, chars.length);
    // Each character locks at a time that grows left to right, with jitter.
    const lockAt = chars.map((_, i) => (i / n) * duration * 0.7 + Math.random() * duration * 0.3);
    const noise = () =>
      chars.map((c) => (c === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join("");

    let raf = 0;
    let started = false;
    let frame = 0;
    setOut(noise());

    const run = () => {
      const t0 = performance.now() + delay;
      const tick = (now: number) => {
        const t = now - t0;
        frame++;
        if (t < 0) {
          if (frame % 3 === 0) setOut(noise());
          raf = requestAnimationFrame(tick);
          return;
        }
        let done = true;
        const s = chars
          .map((c, i) => {
            if (c === " " || t >= lockAt[i]!) return c;
            done = false;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("");
        if (frame % 2 === 0 || done) setOut(s);
        if (!done) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !started) {
          started = true;
          io.disconnect();
          run();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [text, delay, duration]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{out}</span>
    </span>
  );
}
