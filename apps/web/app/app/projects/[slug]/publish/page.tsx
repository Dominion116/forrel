import type { Metadata } from "next";

import { PageHeader } from "@/components/app/primitives";

import { PublishFlow } from "./publish-flow";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Publish · ${slug}` };
}

export default async function PublishPage({ params }: Params) {
  const slug = decodeURIComponent((await params).slug);
  return (
    <>
      <PageHeader eyebrow={`Publish · ${slug}`} lead="Sign it here," title="Checked on-chain.">
        The keyfile is decrypted in this browser only. The signature is made here, then QoreX submits it.
      </PageHeader>
      <PublishFlow slug={slug} />
    </>
  );
}
