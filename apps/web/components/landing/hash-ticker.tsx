"use client";

import { Marquee } from "@/components/motion/marquee";
import { useRecentReleases } from "@/lib/chain/hooks";
import { shortHash } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A live strip of the latest signed releases scrolling past, straight from the registry. */
export function HashTicker() {
  const { data } = useRecentReleases(14);
  const items = data ?? [];

  return (
    <div className="border-y border-dashed border-hairline bg-surface py-3">
      {items.length === 0 ? (
        <p className="text-eyebrow text-center text-muted-foreground">Reading the registry…</p>
      ) : (
        <Marquee seconds={Math.max(30, items.length * 4)} label="Latest signed releases">
          {items.map((r) => (
            <span key={r.releaseId.toString()} className="flex items-center gap-3 px-6 text-body-sm whitespace-nowrap">
              <span
                aria-hidden="true"
                className={cn("size-1.5 shrink-0", r.revoked ? "bg-danger" : "bg-brand-ink")}
              />
              <span className="text-foreground">
                {r.slug} <span className="text-muted-foreground">v{r.version}</span>
              </span>
              <code className="text-muted-foreground">{shortHash(r.artifactHash, 6, 4)}</code>
              <span className={cn("text-eyebrow", r.revoked ? "text-danger" : "text-brand-ink")}>
                {r.revoked ? "Revoked" : "Signed"}
              </span>
              <span aria-hidden="true" className="pl-3 text-dim">
                ✦
              </span>
            </span>
          ))}
        </Marquee>
      )}
    </div>
  );
}
