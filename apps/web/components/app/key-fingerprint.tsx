"use client";

import { Badge } from "@/components/ui/badge";
import { HashDisplay } from "@/components/ui/hash-display";
import { cn } from "@/lib/utils";

/** Byte count of a 0x-hex string. */
export function hexBytes(hex: string) {
  return Math.max(0, (hex.length - 2) / 2);
}

/**
 * A key, shown the way people compare keys: epoch + short fingerprint, the full key on expand.
 */
export function KeyFingerprint({
  label,
  fingerprint,
  epoch,
  fullKey,
  className,
}: {
  label: string;
  fingerprint: string;
  epoch?: number;
  fullKey?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3 border border-hairline p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-eyebrow text-muted-foreground">{label}</p>
        {epoch !== undefined && <Badge variant="brand">Epoch {epoch}</Badge>}
      </div>
      <p className="font-pixel text-xl tracking-[0.12em] break-all text-foreground">{fingerprint}</p>
      <p className="text-body-sm text-muted-foreground">First 8 bytes of SHA3-256(public key)</p>
      {fullKey && fullKey.length > 2 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-body-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show full key</span>
            <span className="hidden group-open:inline">Hide full key</span> · {hexBytes(fullKey).toLocaleString("en-US")} bytes
          </summary>
          <div className="mt-3 max-h-48 overflow-y-auto border border-dashed border-hairline bg-surface p-3">
            <HashDisplay value={fullKey} label={`${label} public key`} full />
          </div>
        </details>
      )}
    </div>
  );
}
