"use client";

import { DIANA_CHAIN_ID, encodePublishMsg, metaHashOf, type Hex } from "@forrel/core";
import type { ReactNode } from "react";

import { ConnectButton, NetworkBadge } from "@/components/app/connect-button";
import { KeyFingerprint } from "@/components/app/key-fingerprint";
import { MessageFieldTable } from "@/components/app/message-field-table";
import { PassphraseField } from "@/components/app/passphrase-field";
import { EmptyState, Skeleton } from "@/components/app/primitives";
import { RecentReleasesTable } from "@/components/app/release-table";
import { ReleaseTimeline } from "@/components/app/release-timeline";
import { StatsStrip } from "@/components/app/stats-strip";
import { Stepper } from "@/components/app/stepper";
import { TxStatus } from "@/components/app/tx-status";
import { WindowStatusPanel, useWalletChecks } from "@/components/app/window-status-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeSnippet } from "@/components/ui/code-snippet";
import { HashDisplay } from "@/components/ui/hash-display";
import { Container } from "@/components/ui/typography";
import { VerdictCard } from "@/components/verify/verdict-card";
import { useRecentReleases } from "@/lib/chain/hooks";
import { CHAIN_MODE, REGISTRY_ADDRESS } from "@/lib/config";
import { cn } from "@/lib/utils";
import { MOCK_SCENARIOS, updateMockWallet } from "@/lib/wallet/mock-wallet";
import { useWallet } from "@/lib/wallet/use-wallet";

const UNKNOWN = `0x${"9e".repeat(32)}` as Hex;
const noop = () => {};

export function StatesGallery() {
  const recent = useRecentReleases(30);
  const list = recent.data ?? [];
  const ok = list.find((r) => !r.revoked);
  const bad = list.find((r) => r.revoked);
  const newer = bad ? list.find((r) => r.slug === bad.slug && !r.revoked && r.publishedAt > bad.publishedAt) ?? null : null;
  const multi = list.filter((r) => r.artifactHash === list.find((x) => list.filter((y) => y.artifactHash === x.artifactHash).length > 1)?.artifactHash);
  const { checks } = useWalletChecks();

  return (
    <Container className="flex flex-col gap-16 pb-24">
      <MockControls />

      <Block title="Wallet: connect button and network badge">
        <div className="flex flex-wrap items-center gap-4">
          <NetworkBadge />
          <ConnectButton />
        </div>
      </Block>

      <Block title="WindowStatusPanel (follows the mock scenario)">
        <WindowStatusPanel checks={checks} />
      </Block>

      <Block title="VerdictCard: all five verdicts">
        <div className="grid gap-6 lg:grid-cols-2">
          {ok && <VerdictCard verdict={{ kind: "verified", hash: ok.artifactHash, release: ok }} />}
          {bad && <VerdictCard verdict={{ kind: "revoked", hash: bad.artifactHash, release: bad, newer }} />}
          {multi.length > 1 && <VerdictCard verdict={{ kind: "multiple", hash: multi[0]!.artifactHash, matches: multi }} />}
          <VerdictCard verdict={{ kind: "unknown", hash: UNKNOWN }} />
          <VerdictCard verdict={{ kind: "error", hash: UNKNOWN, message: "The registry could not be reached (timeout after 10 s)." }} onRetry={noop} />
        </div>
      </Block>

      <Block title="TxStatus">
        <div className="grid gap-4 lg:grid-cols-2">
          <TxStatus state={{ phase: "confirming" }} />
          <TxStatus state={{ phase: "pending" }} />
          <TxStatus state={{ phase: "confirmed", txHash: `0x${"ab".repeat(32)}` as Hex, blockNumber: 1_482_911n }} />
          <TxStatus state={{ phase: "failed", code: "SignatureInvalid", message: "pqcVerify rejected the signature. It was not made by the project's current key, or a signed field changed." }} />
          <TxStatus state={{ phase: "failed", code: "UserRejected", message: "You rejected the request in your wallet." }} />
        </div>
      </Block>

      <Block title="Stepper">
        <div className="flex flex-col gap-6">
          {[0, 2, 5].map((c) => (
            <Stepper key={c} steps={["Connect QoreX", "Choose a name", "Generate keys", "Protect the keys", "Review and submit", "Done"]} current={c} />
          ))}
        </div>
      </Block>

      <Block title="PassphraseField">
        <div className="grid gap-8 md:grid-cols-2">
          <PassphraseField label="Empty" value="" onChange={noop} />
          <PassphraseField label="Too short" value="hunter2" onChange={noop} />
          <PassphraseField label="Fair" value="bluehorse2026" onChange={noop} />
          <PassphraseField label="Strong" value="copper-lantern-fjord-77-quietly" onChange={noop} />
          <PassphraseField label="Mismatch error" value="copper-lantern" onChange={noop} meter={false} error="The passphrases do not match." />
        </div>
      </Block>

      <Block title="KeyFingerprint">
        <div className="grid gap-4 md:grid-cols-2">
          <KeyFingerprint label="Current signing key" fingerprint="0xd45a7e0cb0e8d02b" epoch={2} fullKey={`0x${"24".repeat(64)}`} />
          <KeyFingerprint label="Recovery key" fingerprint="0xb8fcd455a91e3816" />
        </div>
      </Block>

      <Block title="MessageFieldTable">
        <MessageFieldTable
          message={encodePublishMsg({
            chainId: DIANA_CHAIN_ID,
            registry: REGISTRY_ADDRESS,
            projectId: `0x${"11".repeat(32)}` as Hex,
            seq: 7,
            version: "2.4.1",
            artifactHash: `0x${"4b".repeat(32)}` as Hex,
            metaHash: metaHashOf("Fixes CVE-2026-0001."),
          })}
        />
      </Block>

      <Block title="StatsStrip, ReleaseTable, ReleaseTimeline">
        <div className="flex flex-col gap-10">
          <StatsStrip />
          <RecentReleasesTable pageSize={4} />
          {list.length > 0 && <ReleaseTimeline releases={list.slice(0, 4)} />}
        </div>
      </Block>

      <Block title="EmptyState and Skeletons">
        <div className="grid gap-6 md:grid-cols-2">
          <EmptyState title="No releases yet" action={<Button variant="outline">Publish the first one</Button>}>
            Signed releases will appear here.
          </EmptyState>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Block>

      <Block title="Small parts">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {(["brand", "solid", "outline", "verified", "warning", "destructive"] as const).map((v) => (
              <Badge key={v} variant={v}>
                {v}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="outline-brand">Outline brand</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </div>
          <HashDisplay value={`0x${"4b22".repeat(16)}`} label="example hash" />
          <CodeSnippet code="npx forrel verify ./app.bin" label="verify command" />
        </div>
      </Block>
    </Container>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6 border-t border-dashed border-hairline pt-8">
      <h2 className="text-eyebrow">{title}</h2>
      {children}
    </section>
  );
}

function MockControls() {
  const w = useWallet();
  if (CHAIN_MODE !== "mock") {
    return <p className="text-body-sm text-muted-foreground">Live mode: mock wallet controls are disabled.</p>;
  }
  return (
    <section className="flex flex-col gap-4 border border-dashed border-warning p-5">
      <p className="text-eyebrow text-warning">Mock wallet</p>
      <div className="flex flex-wrap gap-3">
        <Button size="sm" variant="outline" onClick={() => updateMockWallet({ connected: w.status !== "connected" })}>
          {w.status === "connected" ? "Disconnect" : "Connect"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => updateMockWallet({ chainId: w.onDiana ? 1 : DIANA_CHAIN_ID })}>
          {w.onDiana ? "Switch to wrong network" : "Back to Diana"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Scenario">
        {MOCK_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={w.scenario === s.id}
            onClick={() => updateMockWallet({ scenario: s.id })}
            className={cn(
              "h-8 border px-3 text-body-sm",
              w.scenario === s.id ? "border-brand-ink text-foreground" : "border-hairline text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}
