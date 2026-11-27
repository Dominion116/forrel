"use client";

import { DIANA_EXPLORER_URL, type Release } from "@forrel/core";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "@/components/ui/button";
import { CardGrid } from "@/components/ui/card";
import { BrandChip, PixelNumeral } from "@/components/ui/stat";
import { getChainClient } from "@/lib/chain";
import { useNow, useRecentReleases, useRegistryStats } from "@/lib/chain/hooks";
import { formatInt, shortHash, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The sample's "1st / 2nd / 3rd" podium, repurposed: three registry numbers in big pixel
 * type with lime chips, read from contract storage after the page paints.
 */
export function LiveStats() {
  const { data } = useRegistryStats();
  const items = [
    { value: data?.releaseCount, label: "Releases", chip: "pqcVerify", note: "every one passed on-chain" },
    { value: data?.projectCount, label: "Projects", chip: "2 keys", note: "signing + offline recovery" },
    { value: data?.revokedCount, label: "Revoked", chip: "still shown", note: "yanked, never hidden" },
  ];
  return (
    <div className="grid gap-12 sm:grid-cols-3 sm:gap-8">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-4">
          <PixelNumeral className="text-[clamp(4.5rem,3rem+6vw,8rem)]">
            {item.value === undefined ? "··" : formatInt(item.value)}
          </PixelNumeral>
          <p className="text-title">
            {item.label}
            <span className="sr-only">: {item.value ?? "loading"}</span>
          </p>
          <BrandChip value={item.chip} className="self-start">
            {item.note}
          </BrandChip>
        </div>
      ))}
    </div>
  );
}

/** Latest five releases, each with an explorer link and a live "Re-check" against pqcVerify. */
export function RecentReleases() {
  const { data, isError, isLoading } = useRecentReleases(5);
  const now = useNow();
  const stats = useRegistryStats();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-eyebrow">Latest releases</p>
        <p className="text-body-sm text-muted-foreground">
          {stats.data ? `Read at block ${formatInt(stats.data.latestBlock)}` : "Reading…"}
        </p>
      </div>
      <CardGrid cols={2} className="sm:grid-cols-1">
        {isLoading &&
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} data-slot="card" className="h-16 animate-pulse border border-hairline bg-surface" />
          ))}
        {isError && (
          <div data-slot="card" className="border border-hairline p-6 text-body text-muted-foreground">
            The registry is not answering. Try again in a moment.
          </div>
        )}
        {data?.map((r) => <ReleaseRow key={r.releaseId.toString()} release={r} now={now} />)}
      </CardGrid>
    </div>
  );
}

function ReleaseRow({ release: r, now }: { release: Release; now: number | null }) {
  const [check, setCheck] = useState<"idle" | "checking" | "valid" | "invalid" | "failed">("idle");
  const [block, setBlock] = useState<bigint | null>(null);

  async function recheck() {
    setCheck("checking");
    try {
      const res = await getChainClient().recheckSignature(r.releaseId);
      setBlock(res.checkedAtBlock);
      setCheck(res.valid ? "valid" : "invalid");
    } catch {
      setCheck("failed");
    }
  }

  return (
    <div
      data-slot="card"
      className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 border border-hairline px-5 py-4 md:grid-cols-[minmax(10rem,1.2fr)_minmax(9rem,1fr)_7rem_6rem_auto]"
    >
      <p className="min-w-0 truncate text-title">
        {r.slug} <span className="text-muted-foreground">v{r.version}</span>
      </p>
      <code title={r.artifactHash} className="order-3 col-span-2 text-body-sm text-muted-foreground md:order-none md:col-span-1">
        {shortHash(r.artifactHash)}
      </code>
      <p className="order-4 text-body-sm text-muted-foreground md:order-none">
        {now ? timeAgo(r.publishedAt, now) : "—"}
      </p>
      <span className="justify-self-end md:justify-self-start">
        <Badge variant={r.revoked ? "destructive" : "verified"}>{r.revoked ? "Revoked" : "Verified"}</Badge>
      </span>
      <div className="order-5 col-span-2 flex flex-wrap items-center gap-x-5 gap-y-2 md:order-none md:col-span-1 md:justify-end">
        <button
          type="button"
          onClick={recheck}
          disabled={check === "checking"}
          className={cn(
            "text-body-sm border-b pb-0.5 transition-colors duration-150 disabled:opacity-60",
            check === "valid" && "border-verified text-verified",
            (check === "invalid" || check === "failed") && "border-danger text-danger",
            (check === "idle" || check === "checking") && "border-control text-foreground hover:border-brand-ink",
          )}
        >
          {check === "idle" && "Re-check"}
          {check === "checking" && "Checking…"}
          {check === "valid" && `✓ valid @ ${block ? formatInt(block) : ""}`}
          {check === "invalid" && "✕ invalid"}
          {check === "failed" && "Retry"}
        </button>
        <a
          href={`${DIANA_EXPLORER_URL}/tx/${r.publishTxHash}`}
          target="_blank"
          rel="noreferrer"
          className="group/link inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground"
        >
          Explorer <ArrowUpRight />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <span aria-live="polite" className="sr-only">
          {check === "valid" && `Signature for ${r.slug} ${r.version} is valid.`}
          {check === "invalid" && `Signature for ${r.slug} ${r.version} is not valid.`}
          {check === "failed" && "The re-check failed."}
        </span>
      </div>
    </div>
  );
}
