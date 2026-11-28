import {
  DIANA_CHAIN_ID,
  DIANA_RPC_URL,
  ML_DSA_87_PUBKEY_BYTES,
  ML_DSA_87_SIGNATURE_BYTES,
  PQC_KEY_STATUS_ADDRESS,
  PQC_VERIFY_ADDRESS,
  encodePublishMsg,
  encodeRevokeMsg,
  encodeRotateMsg,
  type EncodedMessage,
} from "@forrel/core";
import Link from "next/link";

import { FactList, PageHeader } from "@/components/app/primitives";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardGrid } from "@/components/ui/card";
import { CodeSnippet } from "@/components/ui/code-snippet";
import { HashDisplay } from "@/components/ui/hash-display";
import { ArrowList } from "@/components/ui/list";
import { Callout } from "@/components/ui/notice";
import { Container, TextLink } from "@/components/ui/typography";
import { CHAIN_ID, CHAIN_MODE, GITHUB_URL, REGISTRY_ADDRESS, VECTORS_URL, addressUrl } from "@/lib/config";

export const metadata = {
  title: "Documentation — Forrel",
  description:
    "Complete technical documentation for Forrel: architecture, CLI reference, signed message spec, ForrelRegistry contract, and threat model.",
};

const PK = `0x${"00".repeat(ML_DSA_87_PUBKEY_BYTES)}` as const;
const ZERO32 = `0x${"00".repeat(32)}` as const;

const SPECS: { name: string; purpose: string; msg: EncodedMessage }[] = [
  {
    name: "PUBLISH",
    purpose: "Records a release hash and metadata hash. Signed by the current signing key.",
    msg: encodePublishMsg({
      chainId: CHAIN_ID,
      registry: REGISTRY_ADDRESS,
      projectId: ZERO32,
      seq: 1,
      version: "1.0.0",
      artifactHash: ZERO32,
      metaHash: ZERO32,
    }),
  },
  {
    name: "ROTATE",
    purpose: "Replaces the active signing key. Signed by the current key or offline recovery key.",
    msg: encodeRotateMsg({
      chainId: CHAIN_ID,
      registry: REGISTRY_ADDRESS,
      projectId: ZERO32,
      keyEpoch: 1,
      newPubkey: PK,
      viaRecovery: false,
    }),
  },
  {
    name: "REVOKE",
    purpose: "Marks a release as revoked with a reason code (0–3). Signed by the current signing key.",
    msg: encodeRevokeMsg({
      chainId: CHAIN_ID,
      registry: REGISTRY_ADDRESS,
      projectId: ZERO32,
      releaseId: 0,
      reason: 0,
    }),
  },
];

const NAV_GROUPS = [
  {
    title: "Getting Started",
    items: [
      { href: "#overview", label: "Overview" },
      { href: "#quickstart", label: "Quickstart" },
      { href: "#post-quantum", label: "PQ Guarantee Matrix" },
    ],
  },
  {
    title: "CLI & Formats",
    items: [
      { href: "#cli", label: "CLI Reference" },
      { href: "#bundles-keys", label: "Bundles & Keyfiles" },
    ],
  },
  {
    title: "Protocol",
    items: [
      { href: "#architecture", label: "Architecture & SSTORE2" },
      { href: "#messages", label: "Signed Message Spec" },
      { href: "#contract", label: "ForrelRegistry" },
      { href: "#security", label: "Threat Model" },
    ],
  },
];

const TOC = [
  { href: "#overview", label: "01. Overview" },
  { href: "#quickstart", label: "02. Quickstart" },
  { href: "#post-quantum", label: "03. PQ Guarantee Matrix" },
  { href: "#cli", label: "04. CLI Reference" },
  { href: "#bundles-keys", label: "05. Bundles & Keyfiles" },
  { href: "#architecture", label: "06. Architecture & SSTORE2" },
  { href: "#messages", label: "07. Signed Message Spec" },
  { href: "#contract", label: "08. ForrelRegistry" },
  { href: "#security", label: "09. Threat Model" },
];

const CLI_COMMANDS: [string, string, string][] = [
  ["forrel keygen --out <file>", "Generate an ML-DSA-87 keypair and save an encrypted keyfile.", "Offline"],
  ["forrel hash <file>", "Stream-hash a file with SHA3-256 (0x…).", "Offline"],
  [
    "forrel sign <file> --project <slug> --version <v> --key <keyfile> [--seq <n>]",
    "Create <file>.forrel.json. Fetches nextSeq online unless --seq is supplied.",
    "Offline-capable",
  ],
  ["forrel publish <bundle.json>", "Submit a signed bundle using FORREL_SUBMITTER_KEY.", "Online"],
  [
    "forrel verify <file> [--project <slug>] [--json]",
    "Verify file against ForrelRegistry + live pqcVerify. Exits 0/1/2/3.",
    "Read-only",
  ],
  [
    "forrel rotate --project <slug> --key <keyfile> [--recovery] --out <newkey>",
    "Rotate the project signing key via current or recovery key.",
    "Online",
  ],
  [
    "forrel revoke --project <slug> --version <v> --reason <0-3> --key <keyfile>",
    "Revoke an existing release on-chain.",
    "Online",
  ],
];

const THREATS: [string, string][] = [
  [
    "Quantum forgery of release signatures",
    "All release authority uses ML-DSA-87 verified on-chain by pqcVerify; classical keys never authorize releases.",
  ],
  [
    "Leaked classical EVM submitter key",
    "The submitter key only pays gas. It cannot publish, rotate, or revoke without a valid ML-DSA-87 signature.",
  ],
  [
    "Compromised signing key",
    "Revoke affected releases, then rotate to a fresh signing key using your offline recovery key.",
  ],
  [
    "Cross-chain or sequence replay",
    "Every signed message binds chainId, registry address, projectId, and seq or keyEpoch.",
  ],
  [
    "Compromised download page or web UI",
    "Users hash files locally, Re-check runs raw eth_call, and the CLI verifies independently.",
  ],
  [
    "Testnet log pruning",
    "All public keys, signatures, and rotation records live in contract storage (SSTORE2), never relying on logs.",
  ],
];

export default function DocsPage() {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <PageHeader
        eyebrow="Documentation"
        lead="Everything you need"
        title="to sign, verify, and audit."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/app/verify">Verify a file</Link>
            </Button>
            <Button asChild variant="outline-brand">
              <Link href="/app/new">Register project</Link>
            </Button>
          </>
        }
      >
        Technical reference for the Forrel web app, <code>forrel</code> CLI,{" "}
        <code>@forrel/core</code> encoders, and <code>ForrelRegistry</code> on QoreChain Diana.
      </PageHeader>

      <Container className="pb-24">
        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)_210px] lg:items-start">
          {/* Left column: section & app navigation */}
          <aside className="flex flex-col gap-6 border border-hairline bg-surface p-5 lg:sticky lg:top-24">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-2">
                <p className="text-eyebrow text-muted-foreground">{group.title}</p>
                <ul className="flex flex-col gap-1.5 text-body-sm">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex flex-col gap-2 border-t border-dashed border-hairline pt-4">
              <p className="text-eyebrow text-muted-foreground">App Surfaces</p>
              <ul className="flex flex-col gap-1.5 text-body-sm">
                <li>
                  <TextLink href="/app">Registry home</TextLink>
                </li>
                <li>
                  <TextLink href="/app/projects">Browse projects</TextLink>
                </li>
                <li>
                  <TextLink href="/app/how-it-works">Protocol summary</TextLink>
                </li>
              </ul>
            </div>
          </aside>

          {/* Center column: full documentation */}
          <main className="flex min-w-0 flex-col gap-16">
            <section id="overview" className="flex scroll-mt-24 flex-col gap-5">
              <div className="flex items-center gap-3">
                <Badge variant="brand">01</Badge>
                <h2 className="text-title-lg">Overview</h2>
              </div>
              <p className="text-body text-muted-foreground">
                Forrel is an append-only release and firmware signing log on QoreChain&apos;s Diana
                testnet (chain {DIANA_CHAIN_ID}). Maintainers publish SHA3-256 artifact fingerprints
                signed with ML-DSA-87 keys. Before any record enters storage,{" "}
                <code>ForrelRegistry</code> calls QoreChain&apos;s native <code>pqcVerify</code>{" "}
                precompile (<code>{PQC_VERIFY_ADDRESS.slice(0, 6)}…0a01</code>) so unsigned or
                forged records are rejected on-chain.
              </p>
              <CardGrid cols={3}>
                {[
                  ["01", "Fingerprint", "Streaming SHA3-256 (FIPS 202) computed locally in a Web Worker or Node stream."],
                  ["02", "Sign", "Pure ML-DSA-87 (FIPS 204, empty context) over packed domain-separated bytes."],
                  ["03", "Verify", "Wallet-free eth_call lookup + live pqcVerify signature re-check."],
                ].map(([n, t, d]) => (
                  <Card key={n} className="gap-2 p-5">
                    <p className="text-body-sm text-brand-ink">{n}</p>
                    <h3 className="text-title">{t}</h3>
                    <p className="text-body-sm text-muted-foreground">{d}</p>
                  </Card>
                ))}
              </CardGrid>
            </section>

            <section id="quickstart" className="flex scroll-mt-24 flex-col gap-5 border-t border-dashed border-hairline pt-10">
              <div className="flex items-center gap-3">
                <Badge variant="brand">02</Badge>
                <h2 className="text-title-lg">Quickstart</h2>
              </div>
              <p className="text-body text-muted-foreground">
                Verify any release in the browser without a wallet, or sign offline and publish from
                CI using the <code>forrel</code> CLI:
              </p>
              <div className="flex flex-col gap-3">
                <CodeSnippet
                  label="offline keygen"
                  code="npx --workspace=@forrel/cli forrel keygen --out ./signing.forrel-key.json"
                />
                <CodeSnippet
                  label="offline sign"
                  code="npx --workspace=@forrel/cli forrel sign ./dist/app.bin --project acme-router --version 2.4.1 --key ./signing.forrel-key.json --seq 1"
                />
                <CodeSnippet
                  label="publish and verify"
                  code="npx --workspace=@forrel/cli forrel publish ./dist/app.bin.forrel.json && npx --workspace=@forrel/cli forrel verify ./dist/app.bin"
                />
              </div>
            </section>

            <section id="post-quantum" className="flex scroll-mt-24 flex-col gap-5 border-t border-dashed border-hairline pt-10">
              <div className="flex items-center gap-3">
                <Badge variant="brand">03</Badge>
                <h2 className="text-title-lg">What is post-quantum, and what isn&apos;t</h2>
              </div>
              <FactList
                rows={[
                  ["Release signatures", "Post-quantum (ML-DSA-87, FIPS 204), verified on-chain via pqcVerify."],
                  ["Artifact & notes hashes", "Post-quantum safe (SHA3-256, 256-bit preimage resistance)."],
                  ["QoreChain account", "Hybrid secp256k1 + ML-DSA-87 key registered with pqcKeyStatus."],
                  [
                    "EVM tx transport",
                    "Classical secp256k1 gas payer, but it holds zero release authority without ML-DSA-87.",
                  ],
                  ["Network availability", "Diana testnet only; pqcVerify is not on mainnet yet."],
                ]}
              />
            </section>

            <section id="cli" className="flex scroll-mt-24 flex-col gap-5 border-t border-dashed border-hairline pt-10">
              <div className="flex items-center gap-3">
                <Badge variant="brand">04</Badge>
                <h2 className="text-title-lg">CLI Reference</h2>
              </div>
              <div className="border-t border-dashed border-hairline">
                {CLI_COMMANDS.map(([cmd, desc, mode]) => (
                  <div
                    key={cmd}
                    className="grid gap-2 border-b border-dashed border-hairline py-4 md:grid-cols-[1fr_auto]"
                  >
                    <div className="flex flex-col gap-1">
                      <code className="text-body-sm text-foreground">{cmd}</code>
                      <p className="text-body-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Badge variant="outline" className="self-start">
                      {mode}
                    </Badge>
                  </div>
                ))}
              </div>
              <Callout>
                <strong>Verify exit codes:</strong> <code>0</code> verified, <code>1</code> unknown,{" "}
                <code>2</code> revoked, <code>3</code> error (bad args, missing file, RPC failure,
                or <code>PrecompileUnavailable</code>).
              </Callout>
              <FactList
                rows={[
                  ["FORREL_RPC", `JSON-RPC endpoint (default ${DIANA_RPC_URL}).`],
                  ["FORREL_REGISTRY", "Deployed ForrelRegistry address (auto-reads deployments/diana.json if present)."],
                  ["FORREL_SUBMITTER_KEY", "0x-prefixed secp256k1 private key with an open Diana EVM window."],
                  ["FORREL_PASSPHRASE", "Keyfile passphrase for non-interactive CI (falls back to hidden prompt)."],
                ]}
              />
            </section>

            <section id="bundles-keys" className="flex scroll-mt-24 flex-col gap-5 border-t border-dashed border-hairline pt-10">
              <div className="flex items-center gap-3">
                <Badge variant="brand">05</Badge>
                <h2 className="text-title-lg">Bundles &amp; Keyfiles</h2>
              </div>
              <p className="text-body text-muted-foreground">
                Keyfiles encrypt only the 32-byte seed using <code>scrypt</code> (
                <code>N=131072, r=8, p=1</code>) and <code>AES-256-GCM</code> with AAD{" "}
                <code>forrel-keyfile/v1</code>; the expanded 4,896-byte secret key is derived in
                memory and zeroed after signing. Signed bundles (<code>*.forrel.json</code>) carry
                the base64 signature, sequence number, and hashes for separated offline signing and
                CI publishing.
              </p>
            </section>

            <section id="architecture" className="flex scroll-mt-24 flex-col gap-5 border-t border-dashed border-hairline pt-10">
              <div className="flex items-center gap-3">
                <Badge variant="brand">06</Badge>
                <h2 className="text-title-lg">Architecture &amp; SSTORE2 Storage</h2>
              </div>
              <p className="text-body text-muted-foreground">
                Testnet nodes prune historical event logs. To keep verification durable without an
                indexer or database, <code>ForrelRegistry</code> writes every{" "}
                {ML_DSA_87_PUBKEY_BYTES.toLocaleString("en-US")}-byte public key and{" "}
                {ML_DSA_87_SIGNATURE_BYTES.toLocaleString("en-US")}-byte signature into contract
                bytecode using SSTORE2 pointers. Verdicts and live signature re-checks read strictly
                from contract state.
              </p>
            </section>

            <section id="messages" className="flex scroll-mt-24 flex-col gap-5 border-t border-dashed border-hairline pt-10">
              <div className="flex items-center gap-3">
                <Badge variant="brand">07</Badge>
                <h2 className="text-title-lg">Signed Message Spec</h2>
              </div>
              <p className="text-body text-muted-foreground">
                Messages are <code>abi.encodePacked</code> byte sequences prefixed with a domain
                tag. Shared test vectors in <code>packages/core/vectors/</code> pin TypeScript and
                Solidity together.
              </p>
              <div className="flex flex-col gap-10">
                {SPECS.map((s) => (
                  <div key={s.name} className="flex flex-col gap-3">
                    <div>
                      <h3 className="text-title">FORREL/v1/{s.name}</h3>
                      <p className="text-body-sm text-muted-foreground">{s.purpose}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[26rem] border-collapse text-left text-body-sm">
                        <thead>
                          <tr className="border-y border-dashed border-hairline text-muted-foreground">
                            <th scope="col" className="py-2.5 pr-4 font-normal">#</th>
                            <th scope="col" className="py-2.5 pr-4 font-normal">Field</th>
                            <th scope="col" className="py-2.5 pr-4 font-normal">Type</th>
                            <th scope="col" className="py-2.5 text-right font-normal">Bytes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.msg.fields.map((f, i) => (
                            <tr key={f.name} className="border-b border-dashed border-hairline">
                              <td className="py-2.5 pr-4 text-muted-foreground">
                                {String(i + 1).padStart(2, "0")}
                              </td>
                              <th scope="row" className="py-2.5 pr-4 font-normal">
                                {f.name === "domain" ? `"FORREL/v1/${s.name}"` : f.name}
                              </th>
                              <td className="py-2.5 pr-4 text-muted-foreground">{f.type}</td>
                              <td className="py-2.5 text-right tabular-nums">{f.bytes.length}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="py-2.5 text-muted-foreground">Total</td>
                            <td className="py-2.5 text-right tabular-nums">{s.msg.bytes.length}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="contract" className="flex scroll-mt-24 flex-col gap-5 border-t border-dashed border-hairline pt-10">
              <div className="flex items-center gap-3">
                <Badge variant="brand">08</Badge>
                <h2 className="text-title-lg">ForrelRegistry Contract</h2>
              </div>
              <FactList
                rows={[
                  ["pqcVerify precompile", PQC_VERIFY_ADDRESS],
                  ["pqcKeyStatus precompile", `${PQC_KEY_STATUS_ADDRESS} (4-tuple return)`],
                  ["registerProject", "~1.4M gas (2x SSTORE2 pubkeys, requires possessionProven)"],
                  ["publish", "~1.3M gas (pqcVerify + SSTORE2 signature + state)"],
                  ["rotateKey", "~0.8M gas (current or recovery key)"],
                  ["revoke", "~0.15M gas (marks release revoked with reason 0–3)"],
                ]}
              />
            </section>

            <section id="security" className="flex scroll-mt-24 flex-col gap-5 border-t border-dashed border-hairline pt-10">
              <div className="flex items-center gap-3">
                <Badge variant="brand">09</Badge>
                <h2 className="text-title-lg">Threat Model</h2>
              </div>
              <div className="border-t border-dashed border-hairline">
                {THREATS.map(([threat, fix]) => (
                  <div
                    key={threat}
                    className="grid gap-2 border-b border-dashed border-hairline py-4 md:grid-cols-[1fr_1.4fr] md:gap-8"
                  >
                    <p className="text-title">{threat}</p>
                    <p className="text-body-sm text-muted-foreground">{fix}</p>
                  </div>
                ))}
              </div>
            </section>
          </main>

          {/* Right column: On this page + live metadata */}
          <aside className="flex flex-col gap-6 border border-hairline bg-surface p-5 lg:sticky lg:top-24">
            <div className="flex flex-col gap-2">
              <p className="text-eyebrow text-muted-foreground">On this page</p>
              <ul className="flex flex-col gap-1.5 text-body-sm">
                {TOC.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 border-t border-dashed border-hairline pt-4">
              <p className="text-eyebrow text-muted-foreground">Specification</p>
              <dl className="flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Chain</dt>
                  <dd>Diana ({CHAIN_ID})</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Signature</dt>
                  <dd>ML-DSA-87</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Digest</dt>
                  <dd>SHA3-256</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Mode</dt>
                  <dd>{CHAIN_MODE}</dd>
                </div>
              </dl>
              <HashDisplay value={REGISTRY_ADDRESS} label="registry address" />
              <div className="flex flex-col gap-1.5 pt-1 text-body-sm">
                {CHAIN_MODE === "live" && (
                  <TextLink href={addressUrl(REGISTRY_ADDRESS)} external>
                    Explorer contract
                  </TextLink>
                )}
                <TextLink href={VECTORS_URL} external>
                  Test vectors
                </TextLink>
                <TextLink href={GITHUB_URL} external>
                  GitHub repo
                </TextLink>
                <TextLink href="/privacy">Privacy Policy</TextLink>
                <TextLink href="/terms">Terms of Service</TextLink>
              </div>
            </div>
          </aside>
        </div>
      </Container>

      <SiteFooter />
    </div>
  );
}
