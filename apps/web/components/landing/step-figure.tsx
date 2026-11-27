"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * Small animated diagrams for "How it works", drawn in SVG with theme tokens.
 * They start when scrolled into view and restart on hover / focus.
 *   fingerprint: the file's bytes are scanned into a 64-hex SHA3-256 digest
 *   sign:        key + digest → a 4,627-byte ML-DSA-87 signature fills in
 *   verify:      pqcVerify lets the valid record through and bounces the tampered one
 */
export function StepFigure({ kind, className }: { kind: "fingerprint" | "sign" | "verify"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPlay(Boolean(e?.isIntersecting)), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-play={play}
      onPointerEnter={() => setRun((r) => r + 1)}
      className={cn("relative aspect-[3/2] w-full border-b border-dashed border-hairline bg-surface", className)}
      aria-hidden="true"
    >
      <svg key={run} viewBox="0 0 240 160" className="absolute inset-0 size-full" fill="none">
        {kind === "fingerprint" && <Fingerprint />}
        {kind === "sign" && <Sign />}
        {kind === "verify" && <Verify />}
      </svg>
    </div>
  );
}

function cellStyle(delay: number, duration = 3.2): CSSProperties {
  return { animation: `fr-cell ${duration}s ${delay}s var(--ease-standard) infinite both` };
}

const flow: CSSProperties = { animation: "fr-flow 0.9s linear infinite" };

function Fingerprint() {
  const cols = 5;
  const rows = 7;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={28 + c * 11}
          y={36 + r * 13}
          width={8}
          height={9}
          className="fr-anim fill-foreground"
          style={cellStyle((r * cols + c) * 0.045)}
        />,
      );
    }
  }
  const digest = ["4b22 7777", "d4dd 1fc6", "1c6f 884f", "4864 1d02"];
  return (
    <>
      {/* the file, with a folded corner */}
      <path d="M22 26h50l10 10v104H22z" className="stroke-control" strokeWidth="1" />
      <path d="M72 26v10h10" className="stroke-control" strokeWidth="1" />
      {cells}
      {/* data flowing into the hash */}
      <path d="M94 83h40" className="fr-anim stroke-brand-ink" strokeWidth="1.5" strokeDasharray="4 4" style={flow} />
      <path d="M130 78l6 5-6 5" className="stroke-brand-ink" strokeWidth="1.5" />
      <text x="146" y="44" className="fill-muted-foreground font-mono" fontSize="8" letterSpacing="1.5">
        SHA3-256
      </text>
      {digest.map((line, i) => (
        <text
          key={line}
          x="146"
          y={64 + i * 16}
          className="fr-anim fill-brand-ink font-mono"
          fontSize="11"
          style={cellStyle(1.4 + i * 0.18)}
        >
          {line}
        </text>
      ))}
      <text x="146" y="134" className="fill-muted-foreground font-mono" fontSize="8">
        … 64 hex chars
      </text>
    </>
  );
}

function Sign() {
  const cells = [];
  const cols = 9;
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={140 + c * 9}
          y={40 + r * 9}
          width={6}
          height={6}
          className="fr-anim fill-brand-ink"
          style={cellStyle(0.6 + ((r * cols + c) % 23) * 0.06 + r * 0.05, 3.6)}
        />,
      );
    }
  }
  return (
    <>
      {/* pixel key */}
      <g className="fill-foreground">
        <rect x="24" y="52" width="24" height="6" />
        <rect x="24" y="76" width="24" height="6" />
        <rect x="24" y="58" width="6" height="18" />
        <rect x="42" y="58" width="6" height="18" />
        <rect x="48" y="64" width="38" height="6" />
        <rect x="74" y="70" width="6" height="8" />
        <rect x="82" y="70" width="4" height="12" />
      </g>
      <text x="24" y="104" className="fill-muted-foreground font-mono" fontSize="8" letterSpacing="1.5">
        ML-DSA-87 KEY
      </text>
      {/* digest chip */}
      <rect x="24" y="116" width="62" height="18" className="stroke-control" strokeWidth="1" />
      <text x="30" y="128" className="fill-foreground font-mono" fontSize="8">
        0x4b22…bf8a
      </text>
      <path d="M96 85h30" className="fr-anim stroke-brand-ink" strokeWidth="1.5" strokeDasharray="4 4" style={flow} />
      <path d="M122 80l6 5-6 5" className="stroke-brand-ink" strokeWidth="1.5" />
      {cells}
      <text x="140" y="130" className="fill-muted-foreground font-mono" fontSize="8" letterSpacing="1.5">
        SIG · 4,627 B
      </text>
    </>
  );
}

function Verify() {
  return (
    <>
      {/* lanes */}
      <path d="M16 58h208" className="stroke-hairline" strokeWidth="1" strokeDasharray="2 4" />
      <path d="M16 112h208" className="stroke-hairline" strokeWidth="1" strokeDasharray="2 4" />
      {/* the gate */}
      <rect x="104" y="30" width="32" height="104" className="fill-background stroke-foreground" strokeWidth="1" />
      <text
        x="120"
        y="82"
        className="fill-foreground font-mono"
        fontSize="8"
        textAnchor="middle"
        transform="rotate(-90 120 82)"
        letterSpacing="1.5"
      >
        pqcVerify
      </text>
      {/* valid record passes */}
      <g
        className="fr-anim"
        style={{ animation: "fr-pass 3.4s var(--ease-standard) infinite both", ["--fr-travel" as string]: "150px" }}
      >
        <rect x="20" y="50" width="16" height="16" className="fill-brand-ink" />
      </g>
      <text x="196" y="44" className="fr-anim fill-brand-ink font-mono" fontSize="9" style={cellStyle(1.4, 3.4)}>
        ✓ in
      </text>
      {/* tampered record bounces */}
      <g
        className="fr-anim"
        style={{ animation: "fr-bounce 3.4s 0.5s var(--ease-standard) infinite both", ["--fr-travel" as string]: "66px" }}
      >
        <rect x="20" y="104" width="16" height="16" className="fill-danger" />
        <path d="M24 108l8 8M32 108l-8 8" className="stroke-background" strokeWidth="1.5" />
      </g>
      <text x="74" y="142" className="fr-anim fill-danger font-mono" fontSize="9" style={cellStyle(1.8, 3.4)}>
        ✕ rejected
      </text>
      <text x="16" y="24" className="fill-muted-foreground font-mono" fontSize="8" letterSpacing="1.5">
        SIGNED
      </text>
      <text x="16" y="96" className="fill-muted-foreground font-mono" fontSize="8" letterSpacing="1.5">
        TAMPERED
      </text>
    </>
  );
}
