"use client";

import { CardGrid } from "@/components/ui/card";
import { useRegistryStats } from "@/lib/chain/hooks";
import { formatInt } from "@/lib/format";

/** Registry stats row: projects, releases, revocations, latest block read. */
export function StatsStrip() {
  const { data, isError } = useRegistryStats();
  const cells: [string, string][] = [
    ["Projects", data ? formatInt(data.projectCount) : "··"],
    ["Releases", data ? formatInt(data.releaseCount) : "··"],
    ["Revocations", data ? formatInt(data.revokedCount) : "··"],
    ["Latest block read", data ? formatInt(data.latestBlock) : "··"],
  ];
  return (
    <div className="flex flex-col gap-2">
      <CardGrid cols={4}>
        {cells.map(([label, value]) => (
          <div key={label} data-slot="card" className="flex flex-col gap-3 border border-hairline p-5">
            <p className="text-eyebrow text-muted-foreground">{label}</p>
            <p className="font-pixel text-4xl leading-none tabular-nums">{value}</p>
          </div>
        ))}
      </CardGrid>
      {isError && <p className="text-body-sm text-danger">The registry is not answering. Numbers will appear when it is back.</p>}
    </div>
  );
}
