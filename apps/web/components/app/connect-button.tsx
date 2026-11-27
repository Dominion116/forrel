"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/ui/hash-display";
import { shortHash } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/use-wallet";

/** Diana network badge; says when the app is running on demo data. */
export function NetworkBadge({ className }: { className?: string }) {
  const { mode } = useWallet();
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Badge variant="outline">Diana testnet</Badge>
      {mode === "mock" && <Badge variant="warning">Demo data</Badge>}
    </span>
  );
}

/**
 * QoreX connect control in the sample's square style.
 * Disconnected → "Connect QoreX". Wrong network → "Switch to Diana". Connected → short address
 * with a small menu (copy, disconnect).
 */
export function ConnectButton({ className }: { className?: string }) {
  const w = useWallet();
  const { state, copy } = useCopy();

  if (w.status === "disconnected") {
    return (
      <Button variant="outline-brand" size="sm" onClick={w.connect} className={className}>
        Connect QoreX
      </Button>
    );
  }

  if (!w.onDiana) {
    return (
      <Button variant="outline" size="sm" onClick={w.switchToDiana} className={cn("border-warning text-warning", className)}>
        Switch to Diana
      </Button>
    );
  }

  return (
    <details className={cn("group relative", className)}>
      <summary className="text-body-sm flex h-8 cursor-pointer list-none items-center gap-2 border border-hairline px-3 text-foreground hover:border-foreground [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="size-2 bg-verified" />
        {shortHash(w.address ?? "", 4, 4)}
        <span className="sr-only">wallet menu</span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 flex w-60 flex-col border border-hairline bg-background p-2">
        <p className="px-3 py-2 text-body-sm break-all text-muted-foreground">{w.address}</p>
        <button
          type="button"
          onClick={() => w.address && copy(w.address)}
          className="px-3 py-2 text-left text-body-sm hover:bg-surface-2"
        >
          {state === "copied" ? "Copied" : "Copy address"}
        </button>
        <button type="button" onClick={w.disconnect} className="px-3 py-2 text-left text-body-sm text-danger hover:bg-surface-2">
          Disconnect
        </button>
      </div>
    </details>
  );
}
