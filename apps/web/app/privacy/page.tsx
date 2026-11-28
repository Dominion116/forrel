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
  title: "Privacy Policy — Forrel",
  description:
    "How Forrel handles files, cryptographic keys, browser storage, and QoreChain Diana RPC requests.",
};

export default function PrivacyPage() {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <PageHeader
        eyebrow="Privacy"
        lead="Nothing leaves your machine,"
        title="except what you publish on-chain."
        actions={
          <Button asChild variant="outline">
            <Link href="/docs">Read the docs</Link>
          </Button>
        }
      >
        Effective 28 November 2026. Forrel is a static and client-side web application with no
        backend database, no user accounts, and no analytics trackers.
      </PageHeader>

      <Container className="flex flex-col gap-16 pb-20">
        <Callout>
          Files you drop into the verifier are hashed locally in a Web Worker using SHA3-256. Only
          the resulting 32-byte digest is sent to QoreChain&apos;s Diana testnet in a read-only{" "}
          <code>eth_call</code>.
        </Callout>

        <Panel title="Summary at a glance">
          <FactList
            rows={[
              ["Artifacts & files", "Never uploaded. Hashed locally in your browser or CLI."],
              [
                "Signing & recovery keys",
                "Generated and decrypted in memory only. Secret buffers are zeroed after use.",
              ],
              ["Analytics & cookies", "None. No third-party analytics, pixels, or ad scripts."],
              [
                "Browser storage",
                "Theme preference (dark/light) and standard QoreX/wagmi wallet session state.",
              ],
              [
                "On-chain records",
                "Public and permanent on QoreChain Diana (chain 9800) once you submit a transaction.",
              ],
            ]}
          />
        </Panel>

        <Panel title="1. What stays on your device">
          <ArrowList
            items={[
              "Release binaries and firmware images: the verifier reads file bytes in chunks inside a local Web Worker (SHA3-256) and discards them immediately.",
              "ML-DSA-87 seeds and keyfiles: generated from local randomness, encrypted with scrypt (N=131072, r=8, p=1) and AES-256-GCM, and downloaded directly to your disk.",
              "Passphrases: never transmitted over the network and never stored in browser storage.",
            ]}
          />
        </Panel>

        <Panel title="2. What is public on QoreChain Diana">
          <p className="max-w-2xl text-body text-muted-foreground">
            When you register a project, publish a release, rotate a key, or revoke a release, the
            transaction is broadcast to QoreChain&apos;s public Diana testnet. By design, blockchain
            state is public and cannot be erased:
          </p>
          <ArrowList
            items={[
              "Project slug, owner EVM address, and creation timestamp.",
              "ML-DSA-87 public keys (2,592 bytes) and signatures (4,627 bytes) stored via SSTORE2.",
              "Version strings, version hashes, SHA3-256 artifact hashes, and release notes hashes (metaHash).",
              "Revocation flags, reason codes, and key rotation history.",
            ]}
          />
        </Panel>

        <Panel title="3. Network requests & RPC providers">
          <p className="max-w-2xl text-body text-muted-foreground">
            Verification and publishing require network requests to QoreChain Diana endpoints (
            <code>https://evm-testnet.qore.host</code> and <code>https://api-testnet.qore.host</code>{" "}
            via the app&apos;s <code>/lcd-testnet</code> proxy) as well as our static hosting
            provider (Vercel). Those infrastructure providers may process standard HTTP metadata such
            as IP addresses and timestamps in accordance with their own policies.
          </p>
        </Panel>

        <Panel title="4. Contact & open source">
          <p className="max-w-2xl text-body text-muted-foreground">
            Forrel is open-source software under the MIT License. You can inspect every network
            request and storage read in the{" "}
            <TextLink href={GITHUB_URL} external>
              source repository on GitHub
            </TextLink>
            . Also see our <TextLink href="/terms">Terms of Service</TextLink>.
          </p>
        </Panel>
      </Container>

      <SiteFooter />
    </div>
  );
}
