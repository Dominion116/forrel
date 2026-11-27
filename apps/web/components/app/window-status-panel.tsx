"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CodeSnippet } from "@/components/ui/code-snippet";
import { getChainClient } from "@/lib/chain";
import { REGISTRY_ADDRESS } from "@/lib/config";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/use-wallet";

export type Check = {
  id: "wallet" | "network" | "pq-key" | "window" | "target";
  label: string;
  ok: boolean | null;
  detail: string;
  fix?: ReactNode;
};

/**
 * Everything a QoreX account needs before it can send a Forrel transaction:
 * connected, on Diana, ML-DSA-87 key registered + proven, a live EVM window that allows the registry.
 */
export function useWalletChecks() {
  const w = useWallet();
  const addr = w.address;
  const enabled = Boolean(addr && w.onDiana);

  const key = useQuery({
    queryKey: ["wallet", "pq-key", addr, w.scenario],
    queryFn: () => getChainClient().getKeyStatus(addr!),
    enabled,
  });
  const win = useQuery({
    queryKey: ["wallet", "window", addr, w.scenario],
    queryFn: () => getChainClient().getWindowStatus(addr!),
    enabled,
    refetchInterval: 15_000,
  });

  const registryAllowed =
    win.data?.allowedTargets === undefined ||
    win.data.allowedTargets.length === 0 ||
    win.data.allowedTargets.some((t) => t.toLowerCase() === REGISTRY_ADDRESS.toLowerCase());

  const checks: Check[] = [
    {
      id: "wallet",
      label: "QoreX connected",
      ok: w.status === "connected",
      detail: w.status === "connected" ? (addr ?? "") : "Connect the account that will own the project.",
      fix: w.status !== "connected" && (
        <Button variant="outline-brand" size="sm" onClick={w.connect}>
          Connect QoreX
        </Button>
      ),
    },
    {
      id: "network",
      label: "On Diana testnet (9800)",
      ok: w.status === "connected" ? w.onDiana : null,
      detail: w.onDiana ? "Chain 9800." : `Your wallet is on chain ${w.chainId ?? "?"}.`,
      fix: w.status === "connected" && !w.onDiana && (
        <Button variant="outline" size="sm" onClick={w.switchToDiana}>
          Switch to Diana
        </Button>
      ),
    },
    {
      id: "pq-key",
      label: "ML-DSA-87 key registered and proven",
      ok: key.data ? key.data.registered && key.data.possessionProven : null,
      detail: !key.data
        ? "Checked with pqcKeyStatus once you are connected."
        : !key.data.registered
          ? "This account has no post-quantum key on QoreChain yet."
          : !key.data.possessionProven
            ? "A key is registered but possession has not been proven."
            : "pqcKeyStatus: registered, possession proven.",
      fix: key.data && !(key.data.registered && key.data.possessionProven) && (
        <FixIt>
          <p>Register (or re-register with proof of possession) the account&apos;s ML-DSA-87 key in QoreX. From this repo you can also run:</p>
          <CodeSnippet label="register key command" code="npm --workspace=@forrel/contracts run window -- register" />
        </FixIt>
      ),
    },
    {
      id: "window",
      label: "EVM window open",
      ok: win.data ? win.data.found && win.data.live : null,
      detail: !win.data
        ? "Every EVM transaction on QoreChain needs an open authorisation window."
        : !win.data.found
          ? "No EVM authorisation window is open for this account."
          : !win.data.live
            ? "The window is used up (no transactions or value left)."
            : `${formatInt(win.data.remainingTxs)} txs and ${formatInt(win.data.remainingBlocks)} blocks left.`,
      fix: win.data && !(win.data.found && win.data.live) && (
        <FixIt>
          <p>Open a window with a hybrid-signed message (secp256k1 + ML-DSA-87). Allow at least 3 transactions and include the registry in allowed targets:</p>
          <CodeSnippet label="open window command" code="npm --workspace=@forrel/contracts run window -- open" />
        </FixIt>
      ),
    },
    {
      id: "target",
      label: "Registry allowed by the window",
      ok: win.data && win.data.found ? registryAllowed : null,
      detail: registryAllowed
        ? "allowed_targets is empty or includes the registry."
        : "The window's allowed_targets does not include the Forrel registry.",
      fix: win.data && win.data.found && !registryAllowed && (
        <FixIt>
          <p>Re-open the window with the registry in allowed_targets:</p>
          <CodeSnippet label="registry address" code={REGISTRY_ADDRESS} />
        </FixIt>
      ),
    },
  ];

  const loading = enabled && (key.isLoading || win.isLoading);
  const allOk = checks.every((c) => c.ok === true);
  return { checks, allOk, loading, window: win.data ?? null, refetch: () => Promise.all([key.refetch(), win.refetch()]) };
}

function FixIt({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 text-body-sm text-muted-foreground">{children}</div>;
}

/** Check list with a fix-it panel under each failing check (WindowStatusPanel). */
export function WindowStatusPanel({ checks, className }: { checks: Check[]; className?: string }) {
  return (
    <ul className={cn("border-t border-dashed border-hairline", className)}>
      {checks.map((c) => (
        <li key={c.id} className="flex flex-col gap-3 border-b border-dashed border-hairline py-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center font-pixel text-xs",
                c.ok === true && "bg-verified text-background",
                c.ok === false && "bg-danger text-background",
                c.ok === null && "border border-control text-muted-foreground",
              )}
            >
              {c.ok === true ? "✓" : c.ok === false ? "✕" : "·"}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-title">
                {c.label}
                <span className="sr-only">: {c.ok === true ? "passed" : c.ok === false ? "failed" : "not checked yet"}</span>
              </p>
              <p className="text-body-sm break-all text-muted-foreground">{c.detail}</p>
            </div>
          </div>
          {c.ok === false && c.fix && <div className="pl-8">{c.fix}</div>}
        </li>
      ))}
    </ul>
  );
}
