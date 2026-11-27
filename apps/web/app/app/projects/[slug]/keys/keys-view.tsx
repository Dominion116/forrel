"use client";

import {
  REVOKE_REASONS,
  createKeyfile,
  encodeRevokeMsg,
  encodeRotateMsg,
  generateSeed,
  keyFingerprint,
  keypairFromSeed,
  signMessage,
  toHex,
  type Hex,
  type Keyfile,
  type Project,
  type RevokeReasonCode,
} from "@forrel/core";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";

import { ConnectButton } from "@/components/app/connect-button";
import { DemoKeyfile } from "@/components/app/demo-keyfile";
import { KeyFingerprint } from "@/components/app/key-fingerprint";
import { KeyfileLoader, type LoadedKey } from "@/components/app/keyfile-loader";
import { MessageFieldTable } from "@/components/app/message-field-table";
import { PassphraseField } from "@/components/app/passphrase-field";
import { FactList } from "@/components/app/primitives";
import { ProjectGate } from "@/components/app/project-gate";
import { TxStatus } from "@/components/app/tx-status";
import { useWalletChecks } from "@/components/app/window-status-panel";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/typography";
import { getChainClient } from "@/lib/chain";
import { useProjectReleases } from "@/lib/chain/hooks";
import { CHAIN_ID, GAS_ESTIMATES, REGISTRY_ADDRESS } from "@/lib/config";
import { downloadJson } from "@/lib/download";
import { formatInt } from "@/lib/format";
import { passphraseStrength } from "@/lib/passphrase";
import { useTx } from "@/lib/tx";
import { cn } from "@/lib/utils";

export function KeysView({ slug }: { slug: string }) {
  const [tab, setTab] = useState<"rotate" | "revoke">("rotate");
  return (
    <Container className="pb-20">
      <ProjectGate slug={slug}>
        {(p) => (
          <div className="flex flex-col gap-8">
            <div className="grid gap-4 md:grid-cols-2">
              <KeyFingerprint label="Current signing key" fingerprint={p.signingKeyFingerprint} epoch={p.keyEpoch} />
              <KeyFingerprint label="Recovery key" fingerprint={p.recoveryKeyFingerprint} />
            </div>
            <div role="tablist" aria-label="Key actions" className="flex border-b border-hairline">
              {(["rotate", "revoke"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "-mb-px border-b-2 px-5 py-3 text-body transition-colors",
                    tab === t ? "border-brand-ink text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "rotate" ? "Rotate signing key" : "Revoke a release"}
                </button>
              ))}
            </div>
            <div role="tabpanel">{tab === "rotate" ? <Rotate project={p} /> : <Revoke project={p} />}</div>
            <Link href={`/app/projects/${p.slug}`} className="text-body-sm text-muted-foreground hover:text-foreground">
              ← Back to {p.slug}
            </Link>
          </div>
        )}
      </ProjectGate>
    </Container>
  );
}

/** Wallet readiness line shown above every submit button. */
function SubmitGate({ children }: { children: (ready: boolean) => ReactNode }) {
  const { allOk } = useWalletChecks();
  return (
    <div className="flex flex-col gap-3">
      {!allOk && (
        <div className="flex flex-wrap items-center gap-3 text-body-sm text-muted-foreground">
          Connect QoreX on Diana with an open EVM window to submit.
          <ConnectButton />
          <Link href="/app/new" className="underline">
            Check details
          </Link>
        </div>
      )}
      {children(allOk)}
    </div>
  );
}

/* ---------- Rotate ---------- */

function Rotate({ project }: { project: Project }) {
  const [viaRecovery, setViaRecovery] = useState(false);
  const [authority, setAuthority] = useState<LoadedKey | null>(null);
  const [newKey, setNewKey] = useState<{ seed: Uint8Array; publicKey: Hex; fingerprint: Hex } | null>(null);
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [file, setFile] = useState<Keyfile | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [signature, setSignature] = useState<Hex | null>(null);
  const tx = useTx();
  const busy = tx.state.phase === "confirming" || tx.state.phase === "pending";

  useEffect(
    () => () => {
      authority?.pair.secretKey.fill(0);
      newKey?.seed.fill(0);
    },
    [authority, newKey],
  );

  const message = useMemo(
    () =>
      newKey
        ? encodeRotateMsg({
            chainId: CHAIN_ID,
            registry: REGISTRY_ADDRESS,
            projectId: project.projectId,
            keyEpoch: project.keyEpoch,
            newPubkey: newKey.publicKey,
            viaRecovery,
          })
        : null,
    [newKey, viaRecovery, project.projectId, project.keyEpoch],
  );

  function generate() {
    const k = keypairFromSeed(generateSeed());
    k.secretKey.fill(0);
    setNewKey({ seed: k.seed, publicKey: toHex(k.publicKey), fingerprint: keyFingerprint(k.publicKey) });
    setFile(null);
    setDownloaded(false);
    setSignature(null);
  }

  async function encrypt() {
    if (!newKey) return;
    setProgress(0);
    try {
      setFile(await createKeyfile(newKey.seed, pass, { onProgress: setProgress }));
      setPass("");
      setConfirm("");
    } finally {
      setProgress(null);
    }
  }

  const done = tx.state.phase === "confirmed";
  const fileName = `${project.slug}.signing.epoch${project.keyEpoch + 1}.forrel-key.json`;

  return (
    <div className="flex flex-col gap-10">
      <Section n={1} title="Who authorises the rotation?">
        <div className="flex flex-col gap-3 sm:flex-row">
          {[
            { v: false, label: "Current signing key", hint: "Routine rotation." },
            { v: true, label: "Recovery key", hint: "The signing key is lost or stolen." },
          ].map((o) => (
            <label
              key={o.label}
              className={cn(
                "flex flex-1 cursor-pointer flex-col gap-1 border p-4",
                viaRecovery === o.v ? "border-brand-ink" : "border-hairline hover:border-control",
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="authority"
                  checked={viaRecovery === o.v}
                  onChange={() => {
                    setViaRecovery(o.v);
                    setAuthority(null);
                    setSignature(null);
                  }}
                  className="accent-[var(--brand-ink)]"
                />
                <span className="text-title">{o.label}</span>
              </span>
              <span className="pl-7 text-body-sm text-muted-foreground">{o.hint}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section n={2} title={`Load the ${viaRecovery ? "recovery" : "signing"} keyfile`}>
        {authority ? (
          <p className="text-body text-verified">
            ✓ {authority.fileName} unlocked · {authority.fingerprint}
          </p>
        ) : (
          <>
            <KeyfileLoader
              key={String(viaRecovery)}
              label={viaRecovery ? "Recovery keyfile" : "Signing keyfile"}
              expectedFingerprint={viaRecovery ? project.recoveryKeyFingerprint : project.signingKeyFingerprint}
              expectedLabel={viaRecovery ? "the project's recovery key" : "the project's current signing key"}
              onLoaded={setAuthority}
            />
            <DemoKeyfile project={project} role={viaRecovery ? "recovery" : "signing"} />
          </>
        )}
      </Section>

      <Section n={3} title="Generate the new signing key">
        {!newKey ? (
          <Button className="self-start" onClick={generate}>
            Generate new key
          </Button>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="font-pixel text-xl tracking-[0.12em]">{newKey.fingerprint}</p>
            {!file ? (
              <form
                className="flex max-w-lg flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void encrypt();
                }}
              >
                <PassphraseField label="Passphrase for the new keyfile" value={pass} onChange={setPass} />
                <PassphraseField
                  label="Repeat passphrase"
                  value={confirm}
                  onChange={setConfirm}
                  meter={false}
                  error={confirm && confirm !== pass ? "The passphrases do not match." : null}
                />
                <Button
                  type="submit"
                  className="self-start"
                  disabled={!passphraseStrength(pass).ok || pass !== confirm || progress !== null}
                >
                  {progress !== null ? `Encrypting… ${Math.round(progress * 100)}%` : "Encrypt new keyfile"}
                </Button>
              </form>
            ) : (
              <Button
                variant={downloaded ? "outline" : "primary"}
                className="self-start"
                onClick={() => {
                  downloadJson(fileName, file);
                  setDownloaded(true);
                }}
              >
                {downloaded ? `✓ Downloaded ${fileName}` : `Download ${fileName}`}
              </Button>
            )}
          </div>
        )}
      </Section>

      <Section n={4} title="Sign and submit">
        {message && <MessageFieldTable message={message} />}
        <SubmitGate>
          {(ready) => (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={!authority || !message || !downloaded || Boolean(signature)}
                  onClick={() => message && authority && setSignature(toHex(signMessage(message.bytes, authority.pair.secretKey)))}
                >
                  {signature ? "✓ Signed" : "Sign rotation"}
                </Button>
                <Button
                  disabled={!signature || !ready || busy || done}
                  onClick={() =>
                    void tx.run(() =>
                      getChainClient().rotateKey({
                        projectId: project.projectId,
                        newPubkey: newKey!.publicKey,
                        viaRecovery,
                        signature: signature!,
                      }),
                    )
                  }
                >
                  {busy ? "Submitting…" : done ? "Rotated" : "Rotate key"}
                </Button>
              </div>
              <p className="text-body-sm text-muted-foreground">
                Estimated gas ≈ {formatInt(GAS_ESTIMATES.rotateKey)}. New epoch: {project.keyEpoch + 1}.
                {!downloaded && newKey && " Download the new keyfile first: you can't publish without it."}
              </p>
              <TxStatus state={tx.state} />
            </div>
          )}
        </SubmitGate>
      </Section>
    </div>
  );
}

/* ---------- Revoke ---------- */

function Revoke({ project }: { project: Project }) {
  const releaseId = useId();
  const reasonId = useId();
  const releases = useProjectReleases(project.projectId);
  const active = (releases.data ?? []).filter((r) => !r.revoked);
  const [selected, setSelected] = useState<string>("");
  const [reason, setReason] = useState<RevokeReasonCode>(2);
  const [key, setKey] = useState<LoadedKey | null>(null);
  const [signature, setSignature] = useState<Hex | null>(null);
  const tx = useTx();
  const busy = tx.state.phase === "confirming" || tx.state.phase === "pending";
  const release = active.find((r) => r.releaseId.toString() === selected);

  useEffect(
    () => () => {
      key?.pair.secretKey.fill(0);
    },
    [key],
  );

  const message = useMemo(
    () =>
      release
        ? encodeRevokeMsg({
            chainId: CHAIN_ID,
            registry: REGISTRY_ADDRESS,
            projectId: project.projectId,
            releaseId: release.releaseId,
            reason,
          })
        : null,
    [release, reason, project.projectId],
  );

  const done = tx.state.phase === "confirmed";

  return (
    <div className="flex flex-col gap-10">
      <Section n={1} title="Pick the release and reason">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={releaseId} className="text-eyebrow text-muted-foreground">
              Release
            </label>
            <select
              id={releaseId}
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setSignature(null);
                tx.reset();
              }}
              className="h-11 border border-control bg-background px-3 font-mono text-body-sm"
            >
              <option value="">Choose…</option>
              {active.map((r) => (
                <option key={r.releaseId.toString()} value={r.releaseId.toString()}>
                  v{r.version} · seq {r.seq.toString()}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={reasonId} className="text-eyebrow text-muted-foreground">
              Reason
            </label>
            <select
              id={reasonId}
              value={reason}
              onChange={(e) => {
                setReason(Number(e.target.value) as RevokeReasonCode);
                setSignature(null);
              }}
              className="h-11 border border-control bg-background px-3 font-mono text-body-sm"
            >
              {([0, 1, 2, 3] as RevokeReasonCode[]).map((c) => (
                <option key={c} value={c}>
                  {c} · {REVOKE_REASONS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {releases.data && active.length === 0 && <p className="text-body-sm text-muted-foreground">Every release is already revoked.</p>}
        {release && (
          <FactList
            rows={[
              ["Artifact", <span key="a" className="break-all">{release.artifactHash}</span>],
              ["After revoking", "Anyone checking this file sees “Revoked” and the reason. The record is never deleted."],
            ]}
          />
        )}
      </Section>

      <Section n={2} title="Load the current signing keyfile">
        {key ? (
          <p className="text-body text-verified">
            ✓ {key.fileName} unlocked · {key.fingerprint}
          </p>
        ) : (
          <>
            <KeyfileLoader expectedFingerprint={project.signingKeyFingerprint} onLoaded={setKey} />
            <DemoKeyfile project={project} role="signing" />
          </>
        )}
      </Section>

      <Section n={3} title="Sign and submit">
        {message && <MessageFieldTable message={message} />}
        <SubmitGate>
          {(ready) => (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={!key || !message || Boolean(signature)}
                  onClick={() => message && key && setSignature(toHex(signMessage(message.bytes, key.pair.secretKey)))}
                >
                  {signature ? "✓ Signed" : "Sign revocation"}
                </Button>
                <Button
                  variant="destructive"
                  disabled={!signature || !ready || busy || done || !release}
                  onClick={() =>
                    void tx.run(() =>
                      getChainClient().revoke({ releaseId: release!.releaseId, reason, signature: signature! }),
                    )
                  }
                >
                  {busy ? "Submitting…" : done ? "Revoked" : "Revoke release"}
                </Button>
              </div>
              <p className="text-body-sm text-muted-foreground">Estimated gas ≈ {formatInt(GAS_ESTIMATES.revoke)}. This can't be undone.</p>
              <TxStatus state={tx.state} />
            </div>
          )}
        </SubmitGate>
      </Section>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-dashed border-hairline pt-8 sm:grid-cols-[3rem_1fr]">
      <span aria-hidden="true" className="font-pixel text-3xl leading-none text-brand-ink">
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-5">
        <h2 className="text-title-lg">{title}</h2>
        {children}
      </div>
    </section>
  );
}
