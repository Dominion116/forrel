import { Suspense } from "react";

import { PageHeader } from "@/components/app/primitives";
import { Container } from "@/components/ui/typography";

import { VerifyFromQuery } from "./verify-from-query";

export const metadata = {
  title: "Verify a file",
  description: "Check any file or SHA3-256 hash against the Forrel registry. No wallet needed.",
};

/** Full-page verifier. `?hash=` prefills and checks a hash. */
export default function VerifyPage() {
  return (
    <>
      <PageHeader eyebrow="Verify" lead="Is this file" title="Genuine?">
        Drop the file you downloaded, or paste its SHA3-256 hash. The file is hashed on this device;
        only the hash is looked up.
      </PageHeader>
      <Container className="pb-20">
        <div className="max-w-3xl">
          <Suspense>
            <VerifyFromQuery />
          </Suspense>
        </div>
      </Container>
    </>
  );
}
