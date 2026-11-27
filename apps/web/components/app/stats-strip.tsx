"use client";

import { CountUp } from "@/components/motion/count-up";
import { CardGrid } from "@/components/ui/card";
import { useRegistryStats } from "@/lib/chain/hooks";

/** Registry stats row: projects, releases, revocations, latest block read. Numbers count up. */
export function StatsStrip() {
  const { data, isError } = useRegistryStats();
  const cells: [string, number | null][] = [
    ["Projects", data ? data.projectCount : null],
    ["Releases", data ? data.releaseCount : null],
    ["Revocations", data ? data.revokedCount : null],
    ["Latest block read", data ? Number(data.latestBlock) : null],
  ];
  return (
    <div className="flex flex-col gap-2">
      <CardGrid cols={4} data-stagger="">
        {cells.map(([label, value]) => (
          <div key={label} data-slot="card" className="flex flex-col gap-3 border border-hairline p-5">
            <p className="text-eyebrow text-muted-foreground">{label}</p>
            <p className="font-pixel text-4xl leading-none tabular-nums">
              {value === null ? "··" : <CountUp value={value} />}
            </p>
          </div>
        ))}
      </CardGrid>
      {isError && <p className="text-body-sm text-danger">The registry is not answering. Numbers will appear when it is back.</p>}
    </div>
  );
}
