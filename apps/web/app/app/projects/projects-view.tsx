"use client";

import type { ProjectSummary } from "@forrel/core";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { EmptyState, Skeleton } from "@/components/app/primitives";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Button } from "@/components/ui/button";
import { useProjects } from "@/lib/chain/hooks";
import { formatInt, shortHash } from "@/lib/format";

const PAGE = 20;

/** Searchable project list. Search runs client-side over the pages loaded so far. */
export function ProjectsView() {
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const searchId = useId();
  const { data, isLoading, isError, refetch } = useProjects(pages * PAGE + 1, 0);

  const all = useMemo(() => (data ?? []).slice(0, pages * PAGE), [data, pages]);
  const hasMore = (data?.length ?? 0) > pages * PAGE;
  const term = q.trim().toLowerCase();
  const shown = term ? all.filter((p) => p.slug.includes(term)) : all;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:max-w-md">
        <label htmlFor={searchId} className="text-eyebrow text-muted-foreground">
          Search by name
        </label>
        <input
          id={searchId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="acme-router"
          spellCheck={false}
          className="h-10 border border-control bg-transparent px-3 font-mono text-body-sm focus:border-foreground"
        />
      </div>

      {isError && (
        <div className="flex items-center gap-4 text-body-sm text-danger">
          Could not load projects.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <ul className="border-t border-dashed border-hairline">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="border-b border-dashed border-hairline py-5">
              <Skeleton className="h-6 w-full" />
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <EmptyState
          title={term ? `No project matches “${q.trim()}”` : "No projects yet"}
          action={
            <Button asChild variant="outline">
              <Link href="/app/new">
                Register a project <ArrowRight />
              </Link>
            </Button>
          }
        >
          {term ? "Search only matches project names. Try a shorter part of the name." : "Be the first to register one."}
        </EmptyState>
      ) : (
        <>
          <div className="hidden grid-cols-[1.4fr_1fr_6rem_6rem_6rem] gap-6 border-t border-dashed border-hairline pt-3 text-eyebrow text-muted-foreground md:grid">
            <span>Project</span>
            <span>Owner</span>
            <span>Releases</span>
            <span>Latest</span>
            <span>Key</span>
          </div>
          <ul data-stagger="" className="border-t border-dashed border-hairline">
            {shown.map((p) => (
              <ProjectRow key={p.projectId} project={p} />
            ))}
          </ul>
        </>
      )}

      {hasMore && !term && (
        <Button variant="outline" className="self-start" onClick={() => setPages((n) => n + 1)}>
          Load more
        </Button>
      )}
    </div>
  );
}

function ProjectRow({ project: p }: { project: ProjectSummary }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 border-b border-dashed border-hairline py-4 md:grid-cols-[1.4fr_1fr_6rem_6rem_6rem]">
      <Link href={`/app/projects/${p.slug}`} className="truncate text-title hover:text-brand-ink">
        {p.slug}
      </Link>
      <code className="order-3 col-span-2 text-body-sm text-muted-foreground md:order-none md:col-span-1" title={p.owner}>
        {shortHash(p.owner, 4, 4)}
      </code>
      <span className="order-4 text-body-sm text-muted-foreground md:order-none">
        {formatInt(p.releaseCount)}
        <span className="md:hidden"> releases</span>
      </span>
      <span className="order-5 text-body-sm md:order-none">{p.latestVersion ? `v${p.latestVersion}` : "—"}</span>
      <span className="justify-self-end md:justify-self-start">
        <Badge variant="outline">Epoch {p.keyEpoch}</Badge>
      </span>
    </li>
  );
}
