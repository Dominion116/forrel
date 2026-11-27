import type { Metadata } from "next";

import { ReleaseView } from "./release-view";

type Params = { params: Promise<{ slug: string; version: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, version } = await params;
  const v = decodeURIComponent(version);
  return {
    title: `${slug} v${v}`,
    description: `Release ${slug} v${v}: the ML-DSA-87 signed message, public key and signature, re-checkable on-chain.`,
  };
}

export default async function ReleasePage({ params }: Params) {
  const { slug, version } = await params;
  return <ReleaseView slug={decodeURIComponent(slug)} version={decodeURIComponent(version)} />;
}
