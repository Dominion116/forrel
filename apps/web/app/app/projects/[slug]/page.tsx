import type { Metadata } from "next";

import { ProjectView } from "./project-view";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug,
    description: `${slug}: post-quantum signed releases, keys and revocations in the Forrel registry.`,
  };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  return <ProjectView slug={decodeURIComponent(slug)} />;
}
