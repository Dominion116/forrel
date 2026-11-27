"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Interactive 1-bit illustration, in the sample's dithered style.
 *
 * Loads a grayscale image (bright subject on pure black), converts it to an ordered
 * (Bayer 4×4) dither on a canvas, and draws every "on" cell as a square particle in the
 * current theme's ink color. So one source image works in light and dark mode.
 *
 * Effects:
 * - every figure assembles from a scatter when it first scrolls into view
 * - "repel": particles push away from the pointer and spring back
 * - "crumble": as the figure scrolls past the middle of the viewport it breaks apart
 *   from the bottom up (Q-Day), and rebuilds when you scroll back
 *
 * Honors prefers-reduced-motion (static render), pauses off-screen, and stops its
 * animation loop once every particle has settled.
 * If the image file is missing it renders a labelled placeholder slot instead.
 */

type Effect = "repel" | "crumble";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function DitherFigure({
  src,
  alt = "",
  aspect,
  cell = 4,
  effect = "repel",
  radius = 90,
  parallax = 0,
  gamma = 1,
  blackPoint = 0.08,
  align = "center",
  tone = "ink",
  className,
}: {
  /** Path under /public, e.g. "/illustrations/hero-hand-left.png". */
  src: string;
  /** Empty string marks the figure as decorative. */
  alt?: string;
  /** Box width / height. The image is fitted inside ("contain"). */
  aspect: number;
  /** Dither cell size in CSS px. Bigger = chunkier pixels, fewer particles. */
  cell?: number;
  effect?: Effect;
  /** Pointer influence radius in CSS px. */
  radius?: number;
  /** Max px the whole figure drifts toward the pointer (0 = off). */
  parallax?: number;
  /** >1 darkens mid-tones (fewer dots), <1 brightens. */
  gamma?: number;
  /** Luminance (0–1) treated as pure black, so background noise never becomes dots. */
  blackPoint?: number;
  align?: "left" | "center" | "right";
  tone?: "ink" | "brand";
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const img = new Image();
    img.decoding = "async";

    let W = 0;
    let H = 0;
    let n = 0;
    let hx = new Float32Array(0);
    let hy = new Float32Array(0);
    let x = new Float32Array(0);
    let y = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let thr = new Float32Array(0);
    let drift = new Float32Array(0);
    let fall = new Float32Array(0);
    let color = "#f2f2f2";
    let crumble = 0;
    let raf = 0;
    let running = false;
    let visible = false;
    let loaded = false;
    const pointer = { x: -1e5, y: -1e5, active: false };

    function readColor() {
      const v = getComputedStyle(wrap!).getPropertyValue(tone === "brand" ? "--brand-ink" : "--foreground");
      color = v.trim() || color;
    }

    function build(scatter: boolean) {
      const rect = wrap!.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      if (W < 2 || H < 2 || !img.naturalWidth) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.max(1, Math.floor(W / cell));
      const rows = Math.max(1, Math.floor(H / cell));
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      const s = Math.min(cols / img.naturalWidth, rows / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      const dx = align === "left" ? 0 : align === "right" ? cols - dw : (cols - dw) / 2;
      octx.drawImage(img, dx, (rows - dh) / 2, dw, dh);
      const data = octx.getImageData(0, 0, cols, rows).data;

      const px: number[] = [];
      const py: number[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = (r * cols + c) * 4;
          const raw =
            ((0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!) / 255) *
            (data[i + 3]! / 255);
          // Black point: near-black background noise and faint edge lines stay empty.
          const lum = Math.max(0, (raw - blackPoint) / (1 - blackPoint));
          const t = (BAYER[(r % 4) * 4 + (c % 4)]! + 0.5) / 16;
          if (Math.pow(lum, gamma) > t) {
            px.push(c * cell);
            py.push(r * cell);
          }
        }
      }

      n = px.length;
      hx = Float32Array.from(px);
      hy = Float32Array.from(py);
      x = new Float32Array(n);
      y = new Float32Array(n);
      vx = new Float32Array(n);
      vy = new Float32Array(n);
      thr = new Float32Array(n);
      drift = new Float32Array(n);
      fall = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const spread = scatter ? 1 : 0;
        x[i] = hx[i]! + (Math.random() - 0.5) * 260 * spread;
        y[i] = hy[i]! + (Math.random() - 0.5) * 260 * spread;
        // Crumble order: bottom first, with noise so the edge is ragged.
        thr[i] = 0.05 + 0.7 * (1 - hy[i]! / H) + 0.25 * Math.random();
        drift[i] = (Math.random() - 0.5) * 2;
        fall[i] = 0.4 + Math.random() * 0.6;
      }
    }

    function step(): boolean {
      const R = radius;
      const R2 = R * R;
      const k = 0.075;
      const damp = 0.8;
      let moving = false;
      for (let i = 0; i < n; i++) {
        let tx = hx[i]!;
        let ty = hy[i]!;
        if (effect === "crumble" && crumble > 0) {
          const t = thr[i]!;
          if (crumble > t) {
            const o = Math.min(1, (crumble - t) / 0.35);
            tx += drift[i]! * o * 90;
            ty += o * H * 0.55 * fall[i]!;
          }
        }
        let ax = (tx - x[i]!) * k;
        let ay = (ty - y[i]!) * k;
        if (pointer.active) {
          const dx = x[i]! - pointer.x;
          const dy = y[i]! - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) * 5;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }
        const nvx = (vx[i]! + ax) * damp;
        const nvy = (vy[i]! + ay) * damp;
        vx[i] = nvx;
        vy[i] = nvy;
        x[i] = x[i]! + nvx;
        y[i] = y[i]! + nvy;
        if (!moving && (Math.abs(nvx) + Math.abs(nvy) > 0.03 || Math.abs(tx - x[i]!) + Math.abs(ty - y[i]!) > 0.5)) {
          moving = true;
        }
      }
      return moving;
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = color;
      const size = Math.max(1, cell - 1);
      const fade = effect === "crumble" && crumble > 0;
      for (let i = 0; i < n; i++) {
        if (fade) {
          const t = thr[i]!;
          const a = crumble > t ? 1 - Math.min(1, (crumble - t) / 0.35) : 1;
          if (a <= 0.03) continue;
          if (a < 1) {
            ctx!.globalAlpha = a;
            ctx!.fillRect(x[i]!, y[i]!, size, size);
            ctx!.globalAlpha = 1;
            continue;
          }
        }
        ctx!.fillRect(x[i]!, y[i]!, size, size);
      }
    }

    function snapHome() {
      x.set(hx);
      y.set(hy);
      vx.fill(0);
      vy.fill(0);
    }

    function frame() {
      const moving = step();
      draw();
      if (moving && visible) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function kick() {
      if (!loaded) return;
      if (reduce) {
        draw();
        return;
      }
      if (!running && visible) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }

    function updateCrumble() {
      if (effect !== "crumble" || reduce) return;
      const rect = wrap!.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the figure's top enters at the bottom, 1 when its bottom leaves the top.
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      const next = Math.min(1, Math.max(0, (p - 0.56) / 0.38));
      if (Math.abs(next - crumble) > 0.001) {
        crumble = next;
        kick();
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!loaded || reduce) return;
      const rect = wrap!.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      const near = lx > -radius && ly > -radius && lx < W + radius && ly < H + radius;
      if (parallax) {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        canvas!.style.transform = `translate3d(${(nx * parallax).toFixed(1)}px, ${(ny * parallax * 0.6).toFixed(1)}px, 0)`;
      }
      if (effect !== "repel" && effect !== "crumble") return;
      if (near) {
        pointer.x = lx;
        pointer.y = ly;
        pointer.active = true;
        kick();
      } else if (pointer.active) {
        pointer.active = false;
        kick();
      }
    }

    function onPointerLeave() {
      if (pointer.active) {
        pointer.active = false;
        kick();
      }
    }

    img.onload = () => {
      loaded = true;
      setStatus("ready");
      readColor();
      build(!reduce);
      if (reduce) snapHome();
      updateCrumble();
      draw();
      kick();
    };
    img.onerror = () => setStatus("missing");
    img.src = src;

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        // The scattered particles from build(true) assemble on first view.
        if (visible) kick();
      },
      { rootMargin: "80px" },
    );
    io.observe(wrap);

    let lastW = 0;
    let lastH = 0;
    const ro = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (!box || !loaded) return;
      if (Math.abs(box.width - lastW) < 1 && Math.abs(box.height - lastH) < 1) return;
      lastW = box.width;
      lastH = box.height;
      build(false);
      updateCrumble();
      draw();
      kick();
    });
    ro.observe(wrap);

    const mo = new MutationObserver(() => {
      readColor();
      draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", updateCrumble, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", updateCrumble);
      img.onload = null;
      img.onerror = null;
    };
  }, [src, cell, effect, radius, parallax, gamma, blackPoint, align, tone]);

  const decorative = alt === "";

  return (
    <div
      ref={wrapRef}
      className={cn("relative", className)}
      style={{ aspectRatio: String(aspect) }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 size-full transition-[transform,opacity] duration-700 ease-(--ease-out) will-change-transform",
          status === "ready" ? "opacity-100" : "opacity-0",
        )}
      />
      {status === "missing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border border-dashed border-control p-4 text-center">
          <span className="text-eyebrow text-muted-foreground">Illustration slot</span>
          <code className="text-body-sm break-all text-muted-foreground">{src}</code>
        </div>
      )}
    </div>
  );
}
