"use client";

import { DIANA_EXPLORER_URL, REVOKE_REASONS, type Release } from "@forrel/core";
import {
  Layers,
  ShieldCheck,
  ShieldQuestionMark,
  ShieldX,
  TriangleExclamationPoint,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Button } from "@/components/ui/button";
import { HashDisplay, useCopy } from "@/components/ui/hash-display";
import { getChainClient } from "@/lib/chain";
import { formatInt, formatUtc } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/lib/verify/verdict";

/**
 * Result card for a verify lookup. Every verdict has an icon AND a word, never color alone.
 */
export function VerdictCard({
  verdict,
  onRetry,
  className,
}: {
  verdict: Verdict;
  onRetry?: () => void;
  className?: string;
}) {
  switch (verdict.kind) {
    case "verified":
      return (
        <Shell
          tone="verified"
          icon={<ShieldCheck />}
          label="Verified"
          title={
            <>
              {verdict.release.slug} <span className="text-muted-foreground">v{verdict.release.version}</span>
            </>
          }
          className={className}
        >
          <p className="text-body text-muted-foreground">
            A genuine, unrevoked release. Its ML-DSA-87 signature passed pqcVerify when it was published.
          </p>
          <ReleaseFacts release={verdict.release} />
          <Actions release={verdict.release} hash={verdict.hash} />
        </Shell>
      );

    case "revoked":
      return (
        <Shell
          tone="danger"
          icon={<ShieldX />}
          label="Revoked"
          title={
            <>
              {verdict.release.slug} <span className="text-muted-foreground">v{verdict.release.version}</span>
            </>
          }
          className={className}
        >
          <p className="text-body">
            The maintainer withdrew this release. Do not install it.
          </p>
          <Facts
            rows={[
              ["Reason", REVOKE_REASONS[verdict.release.revokeReason ?? 0]],
              ["Revoked", verdict.release.revokedAt ? formatUtc(verdict.release.revokedAt) : "—"],
              ["Published", formatUtc(verdict.release.publishedAt)],
              ["Hash", <HashDisplay key="h" value={verdict.hash} label="artifact hash" />],
            ]}
          />
          {verdict.newer && (
            <p className="border-l-2 border-brand-ink py-1 pl-4 text-body">
              Use <span className="text-brand-ink">v{verdict.newer.version}</span> instead, published{" "}
              {formatUtc(verdict.newer.publishedAt)}.
            </p>
          )}
        </Shell>
      );

    case "multiple":
      return (
        <Shell
          tone="warning"
          icon={<Layers />}
          label="Multiple matches"
          title={`Published ${verdict.matches.length} times`}
          className={className}
        >
          <p className="text-body text-muted-foreground">
            The same bytes were published under more than one project or version. Check that the
            one you expected is listed and verified.
          </p>
          <ul className="border-t border-dashed border-hairline">
            {verdict.matches.map((m) => (
              <li
                key={m.releaseId.toString()}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-hairline py-3"
              >
                <span className="text-body">
                  {m.slug} <span className="text-muted-foreground">v{m.version}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-body-sm text-muted-foreground">{formatUtc(m.publishedAt)}</span>
                  <Badge variant={m.revoked ? "destructive" : "verified"}>
                    {m.revoked ? "Revoked" : "Verified"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
          <Facts rows={[["Hash", <HashDisplay key="h" value={verdict.hash} label="artifact hash" />]]} />
        </Shell>
      );

    case "unknown":
      return (
        <Shell
          tone="neutral"
          icon={<ShieldQuestionMark />}
          label="Unknown"
          title="Not in the registry"
          className={className}
        >
          <p className="text-body text-muted-foreground">
            This exact file has never been published to Forrel. Compare its hash with the one your
            vendor lists. Change one byte and the hash changes completely.
          </p>
          <Facts rows={[["SHA3-256", <HashDisplay key="h" value={verdict.hash} label="computed hash" full />]]} />
        </Shell>
      );

    case "error":
      return (
        <Shell
          tone="danger"
          icon={<TriangleExclamationPoint />}
          label="Error"
          title="Could not check this file"
          className={className}
        >
          <p className="text-body text-muted-foreground">{verdict.message}</p>
          {verdict.hash && (
            <Facts rows={[["SHA3-256", <HashDisplay key="h" value={verdict.hash} label="computed hash" full />]]} />
          )}
          {onRetry && (
            <Button variant="outline" size="sm" className="self-start" onClick={onRetry}>
              Try again
            </Button>
          )}
        </Shell>
      );
  }
}

/* ---------- Parts ---------- */

const toneBorder = {
  verified: "border-verified",
  danger: "border-danger",
  warning: "border-warning",
  neutral: "border-control",
} as const;
const toneText = {
  verified: "text-verified",
  danger: "text-danger",
  warning: "text-warning",
  neutral: "text-muted-foreground",
} as const;

function Shell({
  tone,
  icon,
  label,
  title,
  children,
  className,
}: {
  tone: keyof typeof toneBorder;
  icon: ReactNode;
  label: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "animate-rise flex flex-col gap-5 border border-l-4 p-5 sm:p-6",
        toneBorder[tone],
        className,
      )}
    >
      <header className="flex flex-col gap-2">
        <p className={cn("text-eyebrow flex items-center gap-2 [&_svg]:size-4", toneText[tone])}>
          {icon}
          {label}
        </p>
        <h3 className="text-title-lg">{title}</h3>
      </header>
      {children}
    </article>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2 text-body-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReleaseFacts({ release }: { release: Release }) {
  return (
    <Facts
      rows={[
        ["Published", formatUtc(release.publishedAt)],
        ["Key epoch", `${release.keyEpoch} · fingerprint ${release.signingKeyFingerprint.slice(0, 10)}…`],
        ["Signature", "ML-DSA-87 · 4,627 bytes · stored on-chain"],
        ["Hash", <HashDisplay key="h" value={release.artifactHash} label="artifact hash" />],
        [
          "Tx",
          release.publishTxHash ? (
            <a
              key="tx"
              href={`${DIANA_EXPLORER_URL}/tx/${release.publishTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="group/link inline-flex items-center gap-1.5 border-b border-control hover:border-brand-ink"
            >
              View on explorer <ArrowUpRight />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <span key="tx" className="text-muted-foreground">
              Log pruned (the record is in contract storage)
            </span>
          ),
        ],
      ]}
    />
  );
}

function Actions({ release, hash }: { release: Release; hash: string }) {
  const [check, setCheck] = useState<
    { state: "idle" } | { state: "checking" } | { state: "done"; valid: boolean; block: bigint } | { state: "failed" }
  >({ state: "idle" });
  const { state: copyState, copy } = useCopy();

  async function recheck() {
    setCheck({ state: "checking" });
    try {
      const r = await getChainClient().recheckSignature(release.releaseId);
      setCheck({ state: "done", valid: r.valid, block: r.checkedAtBlock });
    } catch {
      setCheck({ state: "failed" });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={recheck} disabled={check.state === "checking"}>
          {check.state === "checking" ? "Checking on-chain…" : "Re-check signature"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copy(`${window.location.origin}/app/r/${hash}`)}
        >
          {copyState === "copied" ? "Link copied" : "Copy permalink"}
        </Button>
      </div>
      <p aria-live="polite" className="text-body-sm">
        {check.state === "done" &&
          (check.valid ? (
            <span className="text-verified">
              ✓ pqcVerify returned true at block {formatInt(check.block)}.
            </span>
          ) : (
            <span className="text-danger">✕ pqcVerify returned false at block {formatInt(check.block)}.</span>
          ))}
        {check.state === "failed" && (
          <span className="text-danger">The re-check call failed. The RPC may be busy; try again.</span>
        )}
      </p>
    </div>
  );
}
