import { PageHeader } from "@/components/app/primitives";
import { Container } from "@/components/ui/typography";

import { NewProjectWizard } from "./new-project-wizard";

export const metadata = { title: "Register a project" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader eyebrow="New project" lead="Register once," title="Sign every release.">
        Your ML-DSA-87 keys are generated in this browser and saved as encrypted files. Only the
        public keys go on-chain.
      </PageHeader>
      <Container className="pb-20">
        <NewProjectWizard />
      </Container>
    </>
  );
}
