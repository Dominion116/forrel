"use client";

import { useEffect } from "react";

const SELECTOR = "[data-reveal],[data-stagger],[data-line],[data-split]";

/**
 * Drives the CSS motion system in globals.css. Mounted once in the root layout.
 *
 * - Elements already on screen at first load are marked in view immediately (no flash).
 * - Everything else is hidden by `.motion-ready` and revealed as it scrolls in.
 * - New elements (client navigation, data that loads later) are picked up automatically.
 * - With prefers-reduced-motion nothing is hidden or animated.
 */
export function MotionObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const seen = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-inview", "true");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );

    const add = (el: Element, initial: boolean) => {
      if (seen.has(el) || el.hasAttribute("data-inview")) return;
      seen.add(el);
      if (initial) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.setAttribute("data-inview", "true");
          return;
        }
      }
      io.observe(el);
    };

    document.querySelectorAll(SELECTOR).forEach((el) => add(el, true));
    root.classList.add("motion-ready");

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(SELECTOR)) add(n, false);
          n.querySelectorAll(SELECTOR).forEach((el) => add(el, false));
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("motion-ready");
    };
  }, []);

  return null;
}
