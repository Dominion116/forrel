"use client";

import type { Release } from "@forrel/core";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatUtc, shortHash } from "@/lib/format";
import { cn } from "@/lib/utils";

import { releaseHref } from "./release-table";

/** Release history, newest first, on a dashed rail: version, hash, time, status, key epoch. */
export function ReleaseTimeline({ releases }: { releases: Release[] }) {
  return (
    <ol data-stagger="" className="relative flex flex-col border-l border-dashed border-hairline">
      {releases.map((r) => (
        <li key={r.releaseId.toString()} className="relative flex flex-col gap-2 pb-8 pl-6 last:pb-0">
          <span
            aria-hidden="true"
            className={cn("absolute top-2 -left-[5px] size-[9px]", r.revoked ? "bg-danger" : "bg-brand-ink")}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Link href={releaseHref(r)} className="text-title hover:text-brand-ink">
              v{r.version}
            </Link>
            <Badge variant={r.revoked ? "destructive" : "verified"}>{r.revoked ? "Revoked" : "Active"}</Badge>
            <Badge variant="outline">Epoch {r.keyEpoch}</Badge>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
            <code title={r.artifactHash}>{shortHash(r.artifactHash, 8, 6)}</code>
            <span>{formatUtc(r.publishedAt)}</span>
            <span>seq {r.seq.toString()}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
