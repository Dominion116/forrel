import Link from "next/link";

import { FactList, PageHeader, Panel } from "@/components/app/primitives";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Button } from "@/components/ui/button";
import { ArrowList } from "@/components/ui/list";
import { Callout } from "@/components/ui/notice";
import { Container, TextLink } from "@/components/ui/typography";
import { GITHUB_URL } from "@/lib/config";

export const metadata = {
  title: "Terms of Service — Forrel",
  description:
    "Terms governing use of the Forrel web app, CLI, and ForrelRegistry on QoreChain Diana testnet.",
};

export default function TermsPage() {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <PageHeader
        eyebrow="Terms of Service"
        lead="Testnet software,"
        title="provided as is."
        actions={
          <Button asChild variant="outline">
            <Link href="/privacy">Privacy Policy</Link>
          </Button>
        }
      >
        Effective 28 November 2026. By using the Forrel web interface, CLI, or smart contracts, you
        agree to these terms.
      </PageHeader>

      <Container className="flex flex-col gap-16 pb-20">
        <Callout>
          Forrel is experimental software deployed on QoreChain&apos;s <strong>Diana testnet</strong>{" "}
          (chain 9800), where <code>pqcVerify</code> is currently available. Do not rely on testnet
          deployments for production or safety-critical firmware distribution.
        </Callout>

        <Panel title="Key terms">
          <FactList
            rows={[
              ["Network", "QoreChain Diana testnet (chain ID 9800). Testnet state may be reset."],
              ["License", "MIT License for Forrel source code; dependencies keep their own terms."],
              ["Custody", "Self-custodial. Forrel never holds your ML-DSA-87 or EVM keys."],
              ["Hosting", "Forrel stores SHA3-256 hashes and signatures, never artifact binaries."],
            ]}
          />
        </Panel>

        <Panel title="1. Key management & custody">
          <ArrowList
            items={[
              "You are solely responsible for backing up your *.forrel-key.json keyfiles, passphrases, offline recovery keys, and QoreX / submitter EVM keys.",
              "Forrel cannot recover lost passphrases, reset compromised keys, or reverse transactions.",
              "If a signing key is compromised, use your offline recovery key to rotate to a new signing key and revoke affected releases.",
            ]}
          />
        </Panel>

        <Panel title="2. On-chain permanence & acceptable use">
          <ArrowList
            items={[
              "Transactions submitted to ForrelRegistry are public and immutable for the lifetime of the testnet.",
              "Do not squat project slugs maliciously, spam the registry, or publish hashes of third-party software claiming authorship you do not hold.",
              "Forrel provides no endorsement or audit of any project or artifact listed in the registry.",
            ]}
          />
        </Panel>

        <Panel title="3. No warranty & limitation of liability">
          <p className="max-w-2xl text-body text-muted-foreground">
            Per the MIT License, the software is provided &ldquo;as is&rdquo;, without warranty of
            any kind, express or implied, including merchantability, fitness for a particular purpose,
            and non-infringement. In no event shall the authors or contributors be liable for any
            claim, damages, or other liability arising from the use of Forrel or QoreChain Diana.
          </p>
        </Panel>

        <Panel title="4. Links & updates">
          <p className="max-w-2xl text-body text-muted-foreground">
            Source code is available on{" "}
            <TextLink href={GITHUB_URL} external>
              GitHub
            </TextLink>
            . Review our <TextLink href="/privacy">Privacy Policy</TextLink> and{" "}
            <TextLink href="/docs">Documentation</TextLink> for technical details.
          </p>
        </Panel>
      </Container>

      <SiteFooter />
    </div>
  );
}
