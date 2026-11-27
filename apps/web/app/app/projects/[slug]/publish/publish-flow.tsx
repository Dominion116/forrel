"use client";

import {
  encodePublishMsg,
  fromBase64,
  metaHashOf,
  signMessage,
  toBase64,
  type Hex,
  type Project,
  type SignedBundle,
} from "@forrel/core";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ConnectButton } from "@/components/app/connect-button";
import { DemoKeyfile } from "@/components/app/demo-keyfile";
import { KeyfileLoader, type LoadedKey } from "@/components/app/keyfile-loader";
import { MessageFieldTable } from "@/components/app/message-field-table";
import { FactList } from "@/components/app/primitives";
import { ProjectGate } from "@/components/app/project-gate";
import { StepBody, Stepper } from "@/components/app/stepper";
import { TxStatus } from "@/components/app/tx-status";
import { WindowStatusPanel, useWalletChecks } from "@/components/app/window-status-panel";
import { ArrowRight, Button } from "@/components/ui/button";
import { HashDisplay } from "@/components/ui/hash-display";
import { Container } from "@/components/ui/typography";
import { getChainClient } from "@/lib/chain";
import { useProjectReleases } from "@/lib/chain/hooks";
import { CHAIN_ID, GAS_ESTIMATES, REGISTRY_ADDRESS } from "@/lib/config";
import { downloadJson } from "@/lib/download";
import { formatInt } from "@/lib/format";
import { hashFile } from "@/lib/hash/hash-file";
import { useTx } from "@/lib/tx";
import { cn } from "@/lib/utils";
import { normalizeHash } from "@/lib/verify/verdict";

const STEPS = ["Load key", "Artifact", "Version", "Review", "Sign", "Submit", "Done"];
const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z.+\-_]{0,63}$/;

export function PublishFlow({ slug }: { slug: string }) {
  return (
    <Container className="pb-20">
      <ProjectGate slug={slug}>{(p) => <Flow project={p} />}</ProjectGate>
    </Container>
  );
}

function Flow({ project }: { project: Project }) {
  const [step, setStep] = useState(0);
  const [key, setKey] = useState<LoadedKey | null>(null);
  const [artifact, setArtifact] = useState<{ hash: Hex; name: string } | null>(null);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<Uint8Array | null>(null);
  const tx = useTx();

  // Wipe the decrypted key when leaving.
  useEffect(
    () => () => {
      key?.pair.secretKey.fill(0);
      key?.pair.seed.fill(0);
    },
    [key],
  );

  const metaHash = useMemo(() => metaHashOf(notes.trim()), [notes]);
  const message = useMemo(
    () =>
      artifact && version
        ? encodePublishMsg({
            chainId: CHAIN_ID,
            registry: REGISTRY_ADDRESS,
            projectId: project.projectId,
            seq: project.nextSeq,
            version,
            artifactHash: artifact.hash,
            metaHash,
          })
        : null,
    [artifact, version, metaHash, project.projectId, project.nextSeq],
  );

  const bundle: SignedBundle | null =
    signature && artifact
      ? {
          v: 1,
          chainId: CHAIN_ID,
          registry: REGISTRY_ADDRESS,
          projectId: project.projectId,
          slug: project.slug,
          seq: Number(project.nextSeq),
          version,
          artifactHash: artifact.hash,
          metaHash,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          keyFingerprint: project.signingKeyFingerprint,
          signature: toBase64(signature),
        }
      : null;

  // Changing anything that is signed invalidates an existing signature.
  useEffect(() => setSignature(null), [message?.hex]);

  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <StepBody
          title="Load your signing keyfile"
          description={`It must be ${project.slug}'s current signing key (epoch ${project.keyEpoch}). The fingerprint is checked before you type the passphrase.`}
          footer={
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/app/projects/${project.slug}`}>Cancel</Link>
              </Button>
              <Button onClick={() => setStep(1)} disabled={!key}>
                Continue <ArrowRight />
              </Button>
            </>
          }
        >
          {key ? (
            <div className="flex flex-col gap-2 border-l-2 border-verified py-1 pl-4">
              <p className="text-body text-verified">✓ Key unlocked in memory</p>
              <p className="text-body-sm text-muted-foreground">
                {key.fileName} · {key.fingerprint}
              </p>
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setKey(null)}>
                Use a different key
              </Button>
            </div>
          ) : (
            <>
              <KeyfileLoader expectedFingerprint={project.signingKeyFingerprint} onLoaded={setKey} />
              <DemoKeyfile project={project} role="signing" />
            </>
          )}
        </StepBody>
      )}

      {step === 1 && (
        <ArtifactStep
          artifact={artifact}
          setArtifact={setArtifact}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <VersionStep
          project={project}
          version={version}
          setVersion={setVersion}
          notes={notes}
          setNotes={setNotes}
          metaHash={metaHash}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && message && (
        <StepBody
          title="Review the signed message"
          description="This is exactly what your key will sign. The contract rebuilds the same bytes and checks them with pqcVerify."
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Looks right <ArrowRight />
              </Button>
            </>
          }
        >
          <MessageFieldTable message={message} />
        </StepBody>
      )}

      {step === 4 && message && key && (
        <StepBody
          title="Sign locally"
          description="ML-DSA-87 signs the message in this browser. You can also download the signed bundle and submit it later from CI with `forrel publish`."
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={() => setStep(5)} disabled={!signature}>
                Continue to submit <ArrowRight />
              </Button>
            </>
          }
        >
          {!signature ? (
            <Button
              className="self-start"
              onClick={() => setSignature(signMessage(message.bytes, key.pair.secretKey))}
            >
              Sign with ML-DSA-87
            </Button>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-body text-verified">✓ Signed · {formatInt(signature.length)} bytes</p>
              {bundle && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => downloadJson(`${project.slug}-${version}.forrel.json`, bundle)}
                >
                  Download bundle (.forrel.json)
                </Button>
              )}
            </div>
          )}
        </StepBody>
      )}

      {step === 5 && bundle && (
        <SubmitStep
          bundle={bundle}
          tx={tx}
          onBack={() => setStep(4)}
          onDone={() => {
            key?.pair.secretKey.fill(0);
            setStep(6);
          }}
        />
      )}

      {step === 6 && artifact && (
        <StepBody title={`${project.slug} v${version} is published`} description="Anyone can now verify this file, with no wallet.">
          <div className="flex flex-col gap-4">
            <HashDisplay value={artifact.hash} label="artifact hash" full />
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/app/r/${artifact.hash}`}>
                  Open the permalink <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/verify">Verify a file</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/app/projects/${project.slug}/releases/${encodeURIComponent(version)}`}>Release details</Link>
              </Button>
            </div>
          </div>
        </StepBody>
      )}
    </div>
  );
}

/* ---------- 2. Artifact ---------- */

function ArtifactStep({
  artifact,
  setArtifact,
  onBack,
  onNext,
}: {
  artifact: { hash: Hex; name: string } | null;
  setArtifact: (a: { hash: Hex; name: string } | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteId = useId();
  const [progress, setProgress] = useState<{ name: string; done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(file: File) {
    setError(null);
    setArtifact(null);
    setProgress({ name: file.name, done: 0, total: file.size });
    try {
      const { hash } = await hashFile(file, (done, total) => setProgress({ name: file.name, done, total }));
      setArtifact({ hash, name: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hashing failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <StepBody
      title="Choose the release file"
      description="The exact bytes you ship. It is hashed here with SHA3-256 and never uploaded."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!artifact}>
            Continue <ArrowRight />
          </Button>
        </>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void run(f);
        }}
        className={cn(
          "flex flex-col items-center gap-4 border border-dashed px-6 py-12 text-center",
          dragging ? "border-brand-ink bg-surface-2" : "border-control bg-surface",
        )}
      >
        <p className="text-title">Drop the release file</p>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void run(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={progress !== null}>
          Choose a file
        </Button>
        {progress && (
          <div className="flex w-full max-w-sm flex-col gap-2" aria-live="polite">
            <p className="truncate text-body-sm text-muted-foreground">Hashing {progress.name}</p>
            <div
              role="progressbar"
              aria-label="Hashing progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.total ? Math.round((progress.done / progress.total) * 100) : 0}
              className="h-1.5 w-full bg-hairline"
            >
              <div
                className="h-full bg-brand-ink transition-[width] duration-150"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const h = normalizeHash(pasted);
          if (!h) {
            setError("Paste 64 hex characters (a SHA3-256 hash).");
            return;
          }
          setError(null);
          setArtifact({ hash: h, name: "pasted hash" });
        }}
      >
        <label htmlFor={pasteId} className="text-eyebrow text-muted-foreground">
          Or paste its SHA3-256 (built elsewhere)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={pasteId}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            spellCheck={false}
            placeholder="0x…"
            className="h-10 min-w-0 flex-1 border border-control bg-transparent px-3 font-mono text-body-sm focus:border-foreground"
          />
          <Button type="submit" variant="outline">
            Use hash
          </Button>
        </div>
      </form>

      {artifact && (
        <div className="flex flex-col gap-1 border-l-2 border-verified py-1 pl-4">
          <p className="text-body-sm text-muted-foreground">{artifact.name}</p>
          <HashDisplay value={artifact.hash} label="artifact hash" full />
        </div>
      )}
      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </StepBody>
  );
}

/* ---------- 3. Version ---------- */

function VersionStep({
  project,
  version,
  setVersion,
  notes,
  setNotes,
  metaHash,
  onBack,
  onNext,
}: {
  project: Project;
  version: string;
  setVersion: (v: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  metaHash: Hex;
  onBack: () => void;
  onNext: () => void;
}) {
  const vId = useId();
  const nId = useId();
  const releases = useProjectReleases(project.projectId);
  const taken = releases.data?.some((r) => r.version === version) ?? false;
  const valid = VERSION_RE.test(version);
  const status = !version
    ? { tone: "muted", text: "For example 2.4.1 or 2026.11.27-rc1." }
    : !valid
      ? { tone: "bad", text: "Use letters, digits, dots, dashes, plus or underscore (max 64)." }
      : releases.isLoading
        ? { tone: "muted", text: "Checking…" }
        : taken
          ? { tone: "bad", text: `✕ ${project.slug} already has v${version}. Versions can't be reused.` }
          : { tone: "ok", text: `✓ v${version} is unused.` };

  return (
    <StepBody
      title="Version and notes"
      description="Notes are hashed into metaHash and kept in the bundle. Only the hash goes on-chain."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={status.tone !== "ok"}>
            Continue <ArrowRight />
          </Button>
        </>
      }
    >
      <div className="flex max-w-md flex-col gap-2">
        <label htmlFor={vId} className="text-eyebrow text-muted-foreground">
          Version
        </label>
        <input
          id={vId}
          value={version}
          onChange={(e) => setVersion(e.target.value.trim())}
          spellCheck={false}
          placeholder="2.5.0"
          aria-invalid={status.tone === "bad" ? true : undefined}
          className={cn(
            "h-11 border bg-transparent px-3 font-mono text-body",
            status.tone === "bad" ? "border-danger" : "border-control focus:border-foreground",
          )}
        />
        <p
          aria-live="polite"
          className={cn(
            "text-body-sm",
            status.tone === "ok" && "text-verified",
            status.tone === "bad" && "text-danger",
            status.tone === "muted" && "text-muted-foreground",
          )}
        >
          {status.text}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={nId} className="text-eyebrow text-muted-foreground">
          Release notes (optional)
        </label>
        <textarea
          id={nId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="border border-control bg-transparent p-3 font-mono text-body-sm focus:border-foreground"
        />
        <p className="text-body-sm break-all text-muted-foreground">metaHash {metaHash}</p>
      </div>
      <FactList rows={[["Sequence", `${project.nextSeq.toString()} (next for ${project.slug})`]]} />
    </StepBody>
  );
}

/* ---------- 6. Submit ---------- */

function SubmitStep({
  bundle,
  tx,
  onBack,
  onDone,
}: {
  bundle: SignedBundle;
  tx: ReturnType<typeof useTx>;
  onBack: () => void;
  onDone: () => void;
}) {
  const { checks, allOk } = useWalletChecks();
  const busy = tx.state.phase === "confirming" || tx.state.phase === "pending";

  async function submit() {
    const res = await tx.run(() => getChainClient().publish(bundle));
    if (res) onDone();
  }

  return (
    <StepBody
      title="Submit through QoreX"
      description="Any QoreChain account can submit. Authority comes from the ML-DSA-87 signature, not from the account paying gas."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onBack} disabled={busy}>
            Back
          </Button>
          <Button onClick={submit} disabled={busy || !allOk}>
            {busy ? "Submitting…" : tx.state.phase === "failed" ? "Try again" : "Publish"}
          </Button>
        </>
      }
    >
      {!allOk && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <p className="text-body-sm text-muted-foreground">Your wallet needs attention before submitting.</p>
            <ConnectButton />
          </div>
          <WindowStatusPanel checks={checks} />
        </div>
      )}
      <FactList
        rows={[
          ["Release", `${bundle.slug} v${bundle.version} · seq ${bundle.seq}`],
          ["Signature", `${formatInt(fromBase64(bundle.signature).length)} bytes (ML-DSA-87)`],
          ["Estimated gas", `≈ ${formatInt(GAS_ESTIMATES.publish)}`],
        ]}
      />
      <TxStatus state={tx.state} />
    </StepBody>
  );
}
