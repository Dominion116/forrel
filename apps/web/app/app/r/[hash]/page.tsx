import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/primitives";
import { ArrowRight, Button } from "@/components/ui/button";
import { Container } from "@/components/ui/typography";
import { VerdictCard } from "@/components/verify/verdict-card";
import { getChainClient } from "@/lib/chain";
import { shortHash } from "@/lib/format";
import { normalizeHash, resolveVerdict, type Verdict } from "@/lib/verify/verdict";

type Params = { params: Promise<{ hash: string }> };

async function verdictFor(raw: string): Promise<Verdict> {
  const hash = normalizeHash(decodeURIComponent(raw));
  if (!hash) {
    return { kind: "error", hash: null, message: "This link does not contain a valid SHA3-256 hash (64 hex characters)." };
  }
  try {
    const client = getChainClient();
    const matches = await client.findByArtifact(hash);
    const project =
      matches.length === 1 && matches[0]!.revoked
        ? await client.listReleases(matches[0]!.projectId, { offset: 0, limit: 200 })
        : [];
    return resolveVerdict(hash, matches, project);
  } catch (err) {
    return {
      kind: "error",
      hash,
      message: err instanceof Error ? `The registry could not be reached (${err.message}).` : "The registry could not be reached.",
    };
  }
}

function headline(v: Verdict): string {
  switch (v.kind) {
    case "verified":
      return `Verified: ${v.release.slug} v${v.release.version}`;
    case "revoked":
      return `Revoked: ${v.release.slug} v${v.release.version}`;
    case "multiple":
      return `Published ${v.matches.length} times`;
    case "unknown":
      return "Not in the Forrel registry";
    case "error":
      return "Could not check this hash";
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { hash } = await params;
  const v = await verdictFor(hash);
  const title = headline(v);
  const description = v.hash
    ? `SHA3-256 ${shortHash(v.hash, 10, 8)} checked against the Forrel post-quantum release registry on QoreChain.`
    : "Forrel verdict permalink.";
  return {
    title,
    description,
    openGraph: { title: `${title} · Forrel`, description },
    twitter: { card: "summary_large_image", title: `${title} · Forrel`, description },
  };
}

/** Server-rendered verdict permalink: /app/r/<sha3-256>. */
export default async function PermalinkPage({ params }: Params) {
  const { hash } = await params;
  const v = await verdictFor(hash);
  return (
    <>
      <PageHeader eyebrow="Verdict" lead="Permalink for" title={v.hash ? shortHash(v.hash, 8, 6) : "an invalid hash"}>
        Read from the registry when this page was loaded. Re-check the signature live from the card.
      </PageHeader>
      <Container className="flex flex-col gap-8 pb-20">
        <div className="max-w-3xl">
          <VerdictCard verdict={v} />
        </div>
        <Button asChild variant="outline" className="self-start">
          <Link href="/app/verify">
            Check another file <ArrowRight />
          </Link>
        </Button>
      </Container>
    </>
  );
}
