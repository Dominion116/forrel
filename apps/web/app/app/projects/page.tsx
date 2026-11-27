import { PageHeader } from "@/components/app/primitives";
import { Container } from "@/components/ui/typography";

import { ProjectsView } from "./projects-view";

export const metadata = { title: "Projects", description: "Browse every project in the Forrel registry." };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader eyebrow="Projects" lead="Everyone who signs" title="Their releases.">
        Every project in the registry, read from contract storage.
      </PageHeader>
      <Container className="pb-20">
        <ProjectsView />
      </Container>
    </>
  );
}
