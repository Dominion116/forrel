"use client";

import { ArrowUpRight } from "@/components/ui/button";
import { txUrl } from "@/lib/config";
import { formatInt, shortHash } from "@/lib/format";
import type { TxState } from "@/lib/tx";
import { cn } from "@/lib/utils";

/** Transaction progress: confirm in wallet → pending → confirmed (tx link) / failed (decoded reason). */
export function TxStatus({ state, className }: { state: TxState; className?: string }) {
  if (state.phase === "idle") return null;
  const steps = [
    { key: "confirming", label: "Confirm in QoreX" },
    { key: "pending", label: "Waiting for a block" },
    { key: "confirmed", label: "Confirmed" },
  ] as const;
  const order = { confirming: 0, pending: 1, confirmed: 2, failed: -1 } as const;
  const at = order[state.phase];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-4 border border-l-4 p-5",
        state.phase === "failed" ? "border-danger" : state.phase === "confirmed" ? "border-verified" : "border-control",
        className,
      )}
    >
      {state.phase !== "failed" ? (
        <ol className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          {steps.map((s, i) => (
            <li
              key={s.key}
              className={cn(
                "flex items-center gap-2 text-body-sm",
                i < at || state.phase === "confirmed" ? "text-verified" : i === at ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span aria-hidden="true" className="font-pixel">
                {i < at || state.phase === "confirmed" ? "✓" : i === at ? "›" : "·"}
              </span>
              {s.label}
              {i === at && state.phase !== "confirmed" && <span className="animate-blink">_</span>}
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-eyebrow text-danger">Transaction failed{state.code ? ` · ${state.code}` : ""}</p>
          <p className="text-body">{state.message}</p>
        </div>
      )}
      {state.phase === "confirmed" && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm">
          <a
            href={txUrl(state.txHash)}
            target="_blank"
            rel="noreferrer"
            className="group/link inline-flex items-center gap-1.5 border-b border-control hover:border-brand-ink"
          >
            {shortHash(state.txHash, 8, 6)} <ArrowUpRight />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          {state.blockNumber !== undefined && <span className="text-muted-foreground">block {formatInt(state.blockNumber)}</span>}
        </p>
      )}
    </div>
  );
}
