import {
  ML_DSA_87_PUBKEY_BYTES,
  ML_DSA_87_SIGNATURE_BYTES,
  PQC_KEY_STATUS_ADDRESS,
  PQC_VERIFY_ADDRESS,
  encodePublishMsg,
  encodeRevokeMsg,
  encodeRotateMsg,
  type EncodedMessage,
} from "@forrel/core";

import { PageHeader, Panel } from "@/components/app/primitives";
import { CardGrid, Card } from "@/components/ui/card";
import { HashDisplay } from "@/components/ui/hash-display";
import { ArrowList } from "@/components/ui/list";
import { Callout } from "@/components/ui/notice";
import { Container, TextLink } from "@/components/ui/typography";
import { CHAIN_ID, CHAIN_MODE, GITHUB_URL, REGISTRY_ADDRESS, VECTORS_URL, addressUrl } from "@/lib/config";

export const metadata = {
  title: "How it works",
  description: "Forrel's signed message format, trust model and threat model.",
};

const PK = `0x${"00".repeat(ML_DSA_87_PUBKEY_BYTES)}` as const;
const ZERO32 = `0x${"00".repeat(32)}` as const;

/** Example encodings, used only to list each field's packed type and byte length. */
const SPECS: { name: string; purpose: string; msg: EncodedMessage }[] = [
  {
    name: "PUBLISH",
    purpose: "Adds a release. Signed by the current signing key.",
    msg: encodePublishMsg({ chainId: CHAIN_ID, registry: REGISTRY_ADDRESS, projectId: ZERO32, seq: 1, version: "1.0.0", artifactHash: ZERO32, metaHash: ZERO32 }),
  },
  {
    name: "ROTATE",
    purpose: "Replaces the signing key. Signed by the current key, or by the recovery key.",
    msg: encodeRotateMsg({ chainId: CHAIN_ID, registry: REGISTRY_ADDRESS, projectId: ZERO32, keyEpoch: 1, newPubkey: PK, viaRecovery: false }),
  },
  {
    name: "REVOKE",
    purpose: "Marks a release as revoked, with a reason. Signed by the current signing key.",
    msg: encodeRevokeMsg({ chainId: CHAIN_ID, registry: REGISTRY_ADDRESS, projectId: ZERO32, releaseId: 0, reason: 0 }),
  },
];

const THREATS: [string, string][] = [
  ["A quantum attacker forges a release signature", "ML-DSA-87 signatures, verified on-chain. Classical signatures never carry release authority."],
  ["A stolen classical EVM key", "It only pays gas. It can't publish, rotate or revoke without a valid ML-DSA-87 signature."],
  ["The signing key is compromised", "Revoke the affected releases, then rotate with the offline recovery key."],
  ["A replayed signature", "seq, keyEpoch, chainId and the registry address are inside every signed message."],
  ["A download page shows the wrong hash", "You hash the file yourself; the verdict comes from the chain."],
  ["Forrel's website is compromised", "The CLI verifies independently, Re-check uses a raw eth_call, and the contract is open source."],
  ["pqcVerify is inactive or returns nothing", "The contract reverts with PrecompileUnavailable. Empty data is never treated as valid."],
  ["Testnet log pruning", "Everything verification needs lives in contract storage (SSTORE2), not in event logs."],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader eyebrow="How it works" lead="What gets signed," title="And why you can trust it.">
        The technical reference: message formats, the trust model, and what Forrel defends against.
      </PageHeader>

      <Container className="flex flex-col gap-20 pb-20">
        <Panel title="The flow">
          <CardGrid cols={3}>
            {[
              ["01", "Fingerprint", "SHA3-256 (FIPS 202) of the exact artifact bytes, computed on your machine."],
              ["02", "Sign", "ML-DSA-87 (FIPS 204, pure, empty context) over the packed message below. Keys come from 32-byte seeds."],
              ["03", "Verify on-chain", `The registry rebuilds the message and calls pqcVerify at ${PQC_VERIFY_ADDRESS.slice(0, 6)}…0a01. No valid signature, no record.`],
            ].map(([n, t, d]) => (
              <Card key={n} className="gap-3 p-6">
                <p className="text-body-sm text-brand-ink">{n}</p>
                <h3 className="text-title">{t}</h3>
                <p className="text-body-sm text-muted-foreground">{d}</p>
              </Card>
            ))}
          </CardGrid>
        </Panel>

        <Panel title="Signed message formats">
          <p className="max-w-2xl text-body text-muted-foreground">
            Every message is <code>abi.encodePacked</code>, starting with a domain tag so a signature for
            one action can never be replayed as another.
          </p>
          <div className="flex flex-col gap-12">
            {SPECS.map((s) => (
              <div key={s.name} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-title-lg">FORREL/v1/{s.name}</h3>
                  <p className="text-body-sm text-muted-foreground">{s.purpose}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] border-collapse text-left text-body-sm">
                    <thead>
                      <tr className="border-y border-dashed border-hairline text-muted-foreground">
                        <th scope="col" className="py-3 pr-4 font-normal">#</th>
                        <th scope="col" className="py-3 pr-4 font-normal">Field</th>
                        <th scope="col" className="py-3 pr-4 font-normal">Packed type</th>
                        <th scope="col" className="py-3 text-right font-normal">Bytes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.msg.fields.map((f, i) => (
                        <tr key={f.name} className="border-b border-dashed border-hairline">
                          <td className="py-3 pr-4 text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
                          <th scope="row" className="py-3 pr-4 font-normal">{f.name === "domain" ? `"FORREL/v1/${s.name}"` : f.name}</th>
                          <td className="py-3 pr-4 text-muted-foreground">{f.type}</td>
                          <td className="py-3 text-right tabular-nums">{f.bytes.length}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="py-3 text-muted-foreground">Total</td>
                        <td className="py-3 text-right tabular-nums">{s.msg.bytes.length}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
          <Callout>
            Public keys are {ML_DSA_87_PUBKEY_BYTES.toLocaleString("en-US")} bytes and signatures{" "}
            {ML_DSA_87_SIGNATURE_BYTES.toLocaleString("en-US")} bytes. Both are stored on-chain with
            SSTORE2 so a release can be re-verified at any time.
          </Callout>
        </Panel>

        <Panel title="Trust model">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h3 className="text-title">What carries authority</h3>
              <ArrowList
                items={[
                  "The project's current ML-DSA-87 signing key: publish and revoke.",
                  "The signing key or the offline recovery key: rotate.",
                  "Nothing else. The account that submits only pays gas.",
                ]}
              />
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="text-title">What the owner account does</h3>
              <ArrowList
                items={[
                  "Registers the project (it needs a registered, possession-proven ML-DSA-87 key on QoreChain).",
                  "Can transfer project metadata ownership. This grants no signing power.",
                  `Talks to QoreChain through an EVM window, checked with pqcKeyStatus at ${PQC_KEY_STATUS_ADDRESS.slice(0, 6)}…0a02.`,
                ]}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Threat model">
          <div className="border-t border-dashed border-hairline">
            {THREATS.map(([threat, fix]) => (
              <div key={threat} className="grid gap-2 border-b border-dashed border-hairline py-5 md:grid-cols-[1fr_1.4fr] md:gap-8">
                <p className="text-title">{threat}</p>
                <p className="text-body-sm text-muted-foreground">{fix}</p>
              </div>
            ))}
          </div>
          <p className="text-body-sm text-muted-foreground">Out of scope: device-side secure boot, artifact hosting, and mainnet economics.</p>
        </Panel>

        <Panel title="Contract and sources">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-body-sm text-muted-foreground">
                ForrelRegistry on Diana (chain {CHAIN_ID}){CHAIN_MODE === "mock" ? " · demo address until deployment" : ""}
              </p>
              <HashDisplay value={REGISTRY_ADDRESS} label="registry address" full />
            </div>
            <ul className="flex flex-col gap-2 text-body">
              {CHAIN_MODE === "live" && (
                <li>
                  <TextLink href={addressUrl(REGISTRY_ADDRESS)} external>
                    Contract on the explorer
                  </TextLink>
                </li>
              )}
              <li>
                <TextLink href={GITHUB_URL} external>
                  Source on GitHub
                </TextLink>
              </li>
              <li>
                <TextLink href={VECTORS_URL} external>
                  Test vectors
                </TextLink>
              </li>
            </ul>
          </div>
        </Panel>
      </Container>
    </>
  );
}
