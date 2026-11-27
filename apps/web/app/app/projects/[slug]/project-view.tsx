"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { KeyFingerprint } from "@/components/app/key-fingerprint";
import { EmptyState, FactList, PageHeader, Panel, Skeleton } from "@/components/app/primitives";
import { ReleaseTimeline } from "@/components/app/release-timeline";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowUpRight, Button } from "@/components/ui/button";
import { CodeSnippet } from "@/components/ui/code-snippet";
import { HashDisplay } from "@/components/ui/hash-display";
import { Container } from "@/components/ui/typography";
import { useProject, useProjectReleases } from "@/lib/chain/hooks";
import { addressUrl, txUrl } from "@/lib/config";
import { formatUtc, shortHash } from "@/lib/format";
import { useWallet } from "@/lib/wallet/use-wallet";

export function ProjectView({ slug }: { slug: string }) {
  const project = useProject(slug);
  const releases = useProjectReleases(project.data?.projectId);
  const wallet = useWallet();
  const p = project.data;
  const isOwner = Boolean(p && wallet.address && wallet.address.toLowerCase() === p.owner.toLowerCase());

  if (project.isLoading) {
    return (
      <Container className="flex flex-col gap-6 py-16">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </Container>
    );
  }

  if (project.isError) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Could not load this project"
          action={
            <Button variant="outline" onClick={() => project.refetch()}>
              Retry
            </Button>
          }
        >
          The registry did not answer. Your connection or the RPC may be down.
        </EmptyState>
      </Container>
    );
  }

  if (!p) {
    return (
      <Container className="py-16">
        <EmptyState
          title={`No project called “${slug}”`}
          action={
            <Button asChild variant="outline">
              <Link href="/app/projects">
                Browse projects <ArrowRight />
              </Link>
            </Button>
          }
        >
          Names are exact and lowercase. If it is yours, you can register it.
        </EmptyState>
      </Container>
    );
  }

  const site = typeof window !== "undefined" ? window.location.origin : "https://forrelonq.vercel.app";
  const badge = `[![Signed with Forrel](https://img.shields.io/badge/signed%20with-Forrel%20ML--DSA--87-daff52)](${site}/app/projects/${p.slug})`;

  return (
    <>
      <PageHeader
        eyebrow="Project"
        title={p.slug}
        actions={
          isOwner ? (
            <>
              <Button asChild>
                <Link href={`/app/projects/${p.slug}/publish`}>
                  Publish a release <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/app/projects/${p.slug}/keys`}>Keys and revocation</Link>
              </Button>
            </>
          ) : undefined
        }
      >
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>
            Owner{" "}
            <a href={addressUrl(p.owner)} target="_blank" rel="noreferrer" className="text-foreground hover:text-brand-ink">
              {shortHash(p.owner, 4, 4)}
            </a>
          </span>
          <span>Registered {formatUtc(p.createdAt)}</span>
          {isOwner && <Badge variant="brand">You own this</Badge>}
        </span>
      </PageHeader>

      <Container className="grid gap-14 pb-20 lg:grid-cols-[7fr_5fr]">
        <Panel title={`Releases (${p.releaseCount})`}>
          {releases.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : releases.data && releases.data.length > 0 ? (
            <ReleaseTimeline releases={releases.data} />
          ) : (
            <EmptyState
              title="No releases yet"
              action={
                isOwner ? (
                  <Button asChild variant="outline">
                    <Link href={`/app/projects/${p.slug}/publish`}>
                      Publish the first one <ArrowRight />
                    </Link>
                  </Button>
                ) : undefined
              }
            >
              Signed releases will appear here.
            </EmptyState>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-12">
          <Panel title="Keys">
            <KeyFingerprint
              label="Current signing key"
              fingerprint={p.signingKeyFingerprint}
              epoch={p.keyEpoch}
              fullKey={p.signingKeyHex}
            />
            <KeyFingerprint label="Recovery key" fingerprint={p.recoveryKeyFingerprint} fullKey={p.recoveryKeyHex} />
          </Panel>

          <Panel title="Rotation history">
            {p.rotations.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">The signing key has never been rotated.</p>
            ) : (
              <FactList
                rows={[...p.rotations].reverse().map((r): [ReactNode, ReactNode] => [
                  `Epoch ${r.epoch}`,
                  <span key={r.txHash} className="flex flex-col gap-1">
                    <span className="font-pixel tracking-[0.1em]">{r.signingKeyFingerprint}</span>
                    <span className="text-muted-foreground">
                      {formatUtc(r.rotatedAt)} · {r.viaRecovery ? "authorised by the recovery key" : "authorised by the previous key"}
                    </span>
                    <a
                      href={txUrl(r.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="group/link inline-flex w-fit items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      Tx <ArrowUpRight />
                    </a>
                  </span>,
                ])}
              />
            )}
          </Panel>

          <Panel title="Badge for your README">
            <CodeSnippet label="README badge" code={badge} />
            <p className="text-body-sm text-muted-foreground">A Markdown link to this page. Paste it into your README.</p>
          </Panel>

          <Panel title="Project ID">
            <HashDisplay value={p.projectId} label="project ID" full />
            <p className="text-body-sm text-muted-foreground">keccak256(&quot;{p.slug}&quot;)</p>
          </Panel>
        </div>
      </Container>
    </>
  );
}
