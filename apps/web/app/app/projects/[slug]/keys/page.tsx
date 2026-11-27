import type { Metadata } from "next";

import { PageHeader } from "@/components/app/primitives";

import { KeysView } from "./keys-view";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Keys · ${slug}` };
}

export default async function KeysPage({ params }: Params) {
  const slug = decodeURIComponent((await params).slug);
  return (
    <>
      <PageHeader eyebrow={`Keys · ${slug}`} lead="Rotate a key," title="Or revoke a release.">
        Both are ML-DSA-87 signed messages checked on-chain. The account paying gas has no power on its own.
      </PageHeader>
      <KeysView slug={slug} />
    </>
  );
}
