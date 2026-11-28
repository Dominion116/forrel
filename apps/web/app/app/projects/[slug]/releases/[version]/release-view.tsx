"use client";

import { REVOKE_REASONS, encodePublishMsg } from "@forrel/core";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { hexBytes } from "@/components/app/key-fingerprint";
import { MessageFieldTable } from "@/components/app/message-field-table";
import { EmptyState, FactList, PageHeader, Panel, Skeleton } from "@/components/app/primitives";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowUpRight, Button } from "@/components/ui/button";
import { HashDisplay } from "@/components/ui/hash-display";
import { Container } from "@/components/ui/typography";
import { getChainClient } from "@/lib/chain";
import { useProjectReleases, useProject, useRelease } from "@/lib/chain/hooks";
import { CHAIN_ID, REGISTRY_ADDRESS, txUrl } from "@/lib/config";
import { formatInt, formatUtc } from "@/lib/format";

export function ReleaseView({ slug, version }: { slug: string; version: string }) {
  const project = useProject(slug);
  const list = useProjectReleases(project.data?.projectId);
  const summary = list.data?.find((r) => r.version === version);
  const release = useRelease(summary?.releaseId);
  const r = release.data ?? summary;

  const message = useMemo(
    () =>
      r
        ? encodePublishMsg({
            chainId: CHAIN_ID,
            registry: REGISTRY_ADDRESS,
            projectId: r.projectId,
            seq: r.seq,
            version: r.version,
            artifactHash: r.artifactHash,
            metaHash: r.metaHash,
          })
        : null,
    [r],
  );

  const [check, setCheck] = useState<
    { s: "idle" } | { s: "checking" } | { s: "done"; valid: boolean; block: bigint } | { s: "failed" }
  >({ s: "idle" });

  if (project.isLoading || list.isLoading) {
    return (
      <Container className="flex flex-col gap-6 py-16">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  if (!project.data || !r) {
    return (
      <Container className="py-16">
        <EmptyState
          title={`No release ${slug} v${version}`}
          action={
            <Button asChild variant="outline">
              <Link href={`/app/projects/${slug}`}>
                Back to {slug} <ArrowRight />
              </Link>
            </Button>
          }
        >
          The project or version does not exist in the registry.
        </EmptyState>
      </Container>
    );
  }

  async function recheck() {
    setCheck({ s: "checking" });
    try {
      const res = await getChainClient().recheckSignature(r!.releaseId);
      setCheck({ s: "done", valid: res.valid, block: res.checkedAtBlock });
    } catch {
      setCheck({ s: "failed" });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Release · ${slug}`}
        lead={slug}
        title={`v${r.version}`}
        actions={
          <Button variant="outline" onClick={recheck} disabled={check.s === "checking"}>
            {check.s === "checking" ? "Checking on-chain…" : "Re-check signature"}
          </Button>
        }
      >
        <span className="flex flex-wrap items-center gap-3">
          <Badge variant={r.revoked ? "destructive" : "verified"}>{r.revoked ? "Revoked" : "Active"}</Badge>
          <span>Published {formatUtc(r.publishedAt)}</span>
        </span>
      </PageHeader>

      <Container className="flex flex-col gap-14 pb-20">
        <p aria-live="polite" className="-mt-4 text-body">
          {check.s === "done" &&
            (check.valid ? (
              <span className="text-verified">✓ Signature valid (checked live at block {formatInt(check.block)}).</span>
            ) : (
              <span className="text-danger">✕ pqcVerify returned false at block {formatInt(check.block)}.</span>
            ))}
          {check.s === "failed" && <span className="text-danger">The re-check call failed. Try again.</span>}
        </p>

        {r.revoked && (
          <div className="border-l-4 border-danger py-2 pl-5">
            <p className="text-eyebrow text-danger">Revoked</p>
            <p className="text-body">
              {REVOKE_REASONS[r.revokeReason ?? 0]}
              {r.revokedAt ? ` · ${formatUtc(r.revokedAt)}` : ""}
            </p>
          </div>
        )}

        <Panel title="Release">
          <FactList
            rows={[
              ["Project", <Link key="p" href={`/app/projects/${slug}`} className="hover:text-brand-ink">{slug}</Link>],
              ["Version", r.version],
              ["Release ID", r.releaseId.toString()],
              ["Sequence", r.seq.toString()],
              ["Key epoch", `${r.keyEpoch} · ${r.signingKeyFingerprint}`],
              ["Artifact (SHA3-256)", <HashDisplay key="a" value={r.artifactHash} label="artifact hash" full />],
              ["Version hash", <HashDisplay key="v" value={r.versionHash} label="version hash" full />],
              ["Meta hash", <HashDisplay key="m" value={r.metaHash} label="meta hash" full />],
              ["Notes", r.notes ? r.notes : <span key="n" className="text-muted-foreground">None</span>],
              [
                "Publish tx",
                r.publishTxHash ? (
                  <a key="t" href={txUrl(r.publishTxHash)} target="_blank" rel="noreferrer" className="group/link inline-flex items-center gap-1.5 hover:text-brand-ink">
                    {r.publishTxHash.slice(0, 18)}… <ArrowUpRight />
                  </a>
                ) : (
                  <span key="t" className="text-muted-foreground">Event log pruned; the record itself is in contract storage.</span>
                ),
              ],
              ...(r.revokeTxHash
                ? ([
                    [
                      "Revoke tx",
                      <a key="rt" href={txUrl(r.revokeTxHash)} target="_blank" rel="noreferrer" className="group/link inline-flex items-center gap-1.5 hover:text-brand-ink">
                        {r.revokeTxHash.slice(0, 18)}… <ArrowUpRight />
                      </a>,
                    ],
                  ] as [string, ReactNode][])
                : []),
              ["Permalink", <Link key="pl" href={`/app/r/${r.artifactHash}`} className="hover:text-brand-ink">/app/r/{r.artifactHash.slice(0, 12)}…</Link>],
            ]}
          />
        </Panel>

        {message && (
          <Panel title="The exact signed message">
            <p className="max-w-2xl text-body-sm text-muted-foreground">
              These bytes, packed in this order, are what the ML-DSA-87 signature covers. Change any
              field and pqcVerify rejects it.
            </p>
            <MessageFieldTable message={message} />
          </Panel>
        )}

        <Panel title="Key and signature">
          {release.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex flex-col gap-4">
              <Blob label="Public key" hex={r.signingKeyHex} expected={2592} />
              <Blob label="Signature" hex={r.signatureHex} expected={4627} />
            </div>
          )}
        </Panel>
      </Container>
    </>
  );
}

function Blob({ label, hex, expected }: { label: string; hex?: string; expected: number }) {
  if (!hex) {
    return <p className="text-body-sm text-muted-foreground">{label}: not loaded.</p>;
  }
  const n = hexBytes(hex);
  return (
    <details className="group border border-hairline">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <span className="text-title">{label}</span>
        <span className="flex items-center gap-3 text-body-sm text-muted-foreground">
          {formatInt(n)} bytes
          {n === expected ? <Badge variant="verified">ML-DSA-87</Badge> : <Badge variant="warning">Expected {formatInt(expected)}</Badge>}
          <span aria-hidden="true" className="transition-transform group-open:rotate-45">+</span>
        </span>
      </summary>
      <div className="max-h-60 overflow-y-auto border-t border-dashed border-hairline bg-surface p-4">
        <HashDisplay value={hex} label={label.toLowerCase()} full />
      </div>
    </details>
  );
}
