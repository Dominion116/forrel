"use client";

import type { Release } from "@forrel/core";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Button } from "@/components/ui/button";
import { useNow, useRecentReleases } from "@/lib/chain/hooks";
import { shortHash, timeAgo } from "@/lib/format";
import { txUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

import { Skeleton } from "./primitives";

export function releaseHref(r: Pick<Release, "slug" | "version">) {
  return `/app/projects/${r.slug}/releases/${encodeURIComponent(r.version)}`;
}

/** One release row: project + version link, short hash, time, status, explorer. */
export function ReleaseRow({ release: r, now, showProject = true }: { release: Release; now: number | null; showProject?: boolean }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 border-b border-dashed border-hairline py-4 md:grid-cols-[minmax(11rem,1.3fr)_minmax(9rem,1fr)_7rem_6rem_5rem]">
      <Link href={releaseHref(r)} className="min-w-0 truncate text-title hover:text-brand-ink">
        {showProject && <>{r.slug} </>}
        <span className={cn(showProject && "text-muted-foreground")}>v{r.version}</span>
      </Link>
      <code title={r.artifactHash} className="order-3 col-span-2 text-body-sm text-muted-foreground md:order-none md:col-span-1">
        {shortHash(r.artifactHash)}
      </code>
      <p className="order-4 text-body-sm text-muted-foreground md:order-none">{now ? timeAgo(r.publishedAt, now) : "—"}</p>
      <span className="justify-self-end md:justify-self-start">
        <Badge variant={r.revoked ? "destructive" : "verified"}>{r.revoked ? "Revoked" : "Active"}</Badge>
      </span>
      {r.publishTxHash ? (
        <a
          href={txUrl(r.publishTxHash)}
          target="_blank"
          rel="noreferrer"
          className="group/link order-5 inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground md:order-none md:justify-self-end"
        >
          Tx <ArrowUpRight />
          <span className="sr-only">for {r.slug} v{r.version} (opens in a new tab)</span>
        </a>
      ) : (
        <span className="order-5 text-body-sm text-muted-foreground/60 md:order-none md:justify-self-end" title="The event log for this release has been pruned; the record itself is in contract storage.">
          —
        </span>
      )}
    </li>
  );
}

/** Paginated "Recent releases" list read from storage views. */
export function RecentReleasesTable({ pageSize = 10 }: { pageSize?: number }) {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useRecentReleases(pageSize + 1, page * pageSize);
  const now = useNow();
  const rows = data?.slice(0, pageSize) ?? [];
  const hasNext = (data?.length ?? 0) > pageSize;

  return (
    <div className="flex flex-col gap-4">
      <ul data-stagger="" className="border-t border-dashed border-hairline" aria-busy={isLoading}>
        {isLoading &&
          Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="border-b border-dashed border-hairline py-4">
              <Skeleton className="h-6 w-full" />
            </li>
          ))}
        {rows.map((r) => (
          <ReleaseRow key={r.releaseId.toString()} release={r} now={now} />
        ))}
      </ul>
      {isError && (
        <div className="flex items-center gap-4 text-body-sm text-danger">
          Could not read releases.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <p className="text-body-sm text-muted-foreground">Page {page + 1}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </div>
      </div>
    </div>
  );
}
