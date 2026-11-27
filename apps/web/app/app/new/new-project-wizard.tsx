"use client";

import {
  SLUG_REGEX,
  createKeyfile,
  generateSeed,
  keyFingerprint,
  keypairFromSeed,
  projectIdOf,
  toHex,
  type Hex,
  type Keyfile,
} from "@forrel/core";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { PassphraseField } from "@/components/app/passphrase-field";
import { FactList } from "@/components/app/primitives";
import { StepBody, Stepper } from "@/components/app/stepper";
import { TxStatus } from "@/components/app/tx-status";
import { WindowStatusPanel, useWalletChecks } from "@/components/app/window-status-panel";
import { ArrowRight, Button } from "@/components/ui/button";
import { getChainClient } from "@/lib/chain";
import { GAS_ESTIMATES, txUrl } from "@/lib/config";
import { downloadJson } from "@/lib/download";
import { formatInt } from "@/lib/format";
import { formatQor } from "@/lib/format-qor";
import { passphraseStrength } from "@/lib/passphrase";
import { useTx } from "@/lib/tx";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/use-wallet";

const STEPS = ["Connect QoreX", "Choose a name", "Generate keys", "Protect the keys", "Review and submit", "Done"];

type Keys = {
  signing: { publicKey: Hex; fingerprint: Hex; seed: Uint8Array };
  recovery: { publicKey: Hex; fingerprint: Hex; seed: Uint8Array };
};

export function NewProjectWizard() {
  const [step, setStep] = useState(0);
  const [slug, setSlug] = useState("");
  const [keys, setKeys] = useState<Keys | null>(null);
  const [files, setFiles] = useState<{ signing: Keyfile; recovery: Keyfile } | null>(null);
  const tx = useTx();

  // Wipe seeds from memory when leaving the page.
  useEffect(
    () => () => {
      keys?.signing.seed.fill(0);
      keys?.recovery.seed.fill(0);
    },
    [keys],
  );

  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={STEPS} current={step} />
      {step === 0 && <ConnectStep onNext={() => setStep(1)} />}
      {step === 1 && <SlugStep slug={slug} setSlug={setSlug} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
      {step === 2 && (
        <KeysStep
          keys={keys}
          setKeys={(k) => {
            setKeys(k);
            setFiles(null);
          }}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && keys && (
        <ProtectStep slug={slug} keys={keys} files={files} setFiles={setFiles} onBack={() => setStep(2)} onNext={() => setStep(4)} />
      )}
      {step === 4 && keys && (
        <ReviewStep
          slug={slug}
          keys={keys}
          tx={tx}
          onBack={() => setStep(3)}
          onDone={() => {
            keys.signing.seed.fill(0);
            keys.recovery.seed.fill(0);
            setStep(5);
          }}
        />
      )}
      {step === 5 && <DoneStep slug={slug} txHash={tx.state.phase === "confirmed" ? tx.state.txHash : null} />}
    </div>
  );
}

/* ---------- 1. Connect ---------- */

function ConnectStep({ onNext }: { onNext: () => void }) {
  const { checks, allOk, loading, refetch } = useWalletChecks();
  return (
    <StepBody
      title="Connect QoreX"
      description="The account that registers the project becomes its owner. QoreChain needs a few things in place before it accepts the transaction."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => void refetch()} disabled={loading}>
            Check again
          </Button>
          <Button onClick={onNext} disabled={!allOk}>
            Continue <ArrowRight />
          </Button>
        </>
      }
    >
      <WindowStatusPanel checks={checks} />
    </StepBody>
  );
}

/* ---------- 2. Slug ---------- */

function SlugStep({
  slug,
  setSlug,
  onBack,
  onNext,
}: {
  slug: string;
  setSlug: (s: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const id = useId();
  const hintId = useId();
  const [debounced, setDebounced] = useState(slug);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(slug), 300);
    return () => clearTimeout(t);
  }, [slug]);

  const valid = SLUG_REGEX.test(debounced);
  const avail = useQuery({
    queryKey: ["registry", "slug-available", debounced],
    queryFn: async () => (await getChainClient().getProject(debounced)) === null,
    enabled: valid,
  });
  const settled = debounced === slug;
  const status: { tone: "ok" | "bad" | "muted"; text: string } = !slug
    ? { tone: "muted", text: "3–40 characters: lowercase letters, digits and dashes." }
    : !SLUG_REGEX.test(slug)
      ? { tone: "bad", text: "Use 3–40 lowercase letters, digits or dashes. No spaces or capitals." }
      : !settled || avail.isLoading
        ? { tone: "muted", text: "Checking availability…" }
        : avail.isError
          ? { tone: "bad", text: "Could not check availability. Try again." }
          : avail.data
            ? { tone: "ok", text: `✓ ${slug} is available.` }
            : { tone: "bad", text: `✕ ${slug} is already registered.` };

  return (
    <StepBody
      title="Choose a project name"
      description="The name is permanent and public. Your project ID is keccak256 of it."
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
        <label htmlFor={id} className="text-eyebrow text-muted-foreground">
          Project name
        </label>
        <input
          id={id}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          placeholder="acme-router"
          spellCheck={false}
          autoComplete="off"
          aria-describedby={hintId}
          aria-invalid={status.tone === "bad" ? true : undefined}
          className={cn(
            "h-11 border bg-transparent px-3 font-mono text-body",
            status.tone === "bad" ? "border-danger" : "border-control focus:border-foreground",
          )}
        />
        <p
          id={hintId}
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
        {SLUG_REGEX.test(slug) && <p className="text-body-sm break-all text-muted-foreground">Project ID {projectIdOf(slug)}</p>}
      </div>
    </StepBody>
  );
}

/* ---------- 3. Keys ---------- */

function KeysStep({
  keys,
  setKeys,
  onBack,
  onNext,
}: {
  keys: Keys | null;
  setKeys: (k: Keys) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    // Let the "Generating…" state paint before the CPU-heavy keygen.
    await new Promise((r) => setTimeout(r, 30));
    const s = keypairFromSeed(generateSeed());
    const r = keypairFromSeed(generateSeed());
    s.secretKey.fill(0);
    r.secretKey.fill(0);
    setKeys({
      signing: { publicKey: toHex(s.publicKey), fingerprint: keyFingerprint(s.publicKey), seed: s.seed },
      recovery: { publicKey: toHex(r.publicKey), fingerprint: keyFingerprint(r.publicKey), seed: r.seed },
    });
    setBusy(false);
  }

  return (
    <StepBody
      title="Generate your keys"
      description="Two ML-DSA-87 keys from fresh 32-byte random seeds, made right here. The signing key signs releases. The recovery key stays offline and can replace the signing key if it is lost or stolen."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!keys}>
            Continue <ArrowRight />
          </Button>
        </>
      }
    >
      {!keys ? (
        <Button onClick={generate} disabled={busy} className="self-start">
          {busy ? "Generating…" : "Generate keys"}
        </Button>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(["signing", "recovery"] as const).map((role) => (
            <div key={role} className="flex flex-col gap-2 border border-hairline p-5">
              <p className="text-eyebrow text-muted-foreground">{role === "signing" ? "Signing key" : "Recovery key"}</p>
              <p className="font-pixel text-xl tracking-[0.12em] break-all">{keys[role].fingerprint}</p>
              <p className="text-body-sm text-muted-foreground">2,592-byte public key · fingerprint shown</p>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={generate} disabled={busy} className="self-start">
            {busy ? "Generating…" : "Generate new ones"}
          </Button>
        </div>
      )}
    </StepBody>
  );
}

/* ---------- 4. Protect ---------- */

function ProtectStep({
  slug,
  keys,
  files,
  setFiles,
  onBack,
  onNext,
}: {
  slug: string;
  keys: Keys;
  files: { signing: Keyfile; recovery: Keyfile } | null;
  setFiles: (f: { signing: Keyfile; recovery: Keyfile }) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState({ signing: false, recovery: false });
  const [stored, setStored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkId = useId();
  const strength = passphraseStrength(pass);
  const mismatch = confirm.length > 0 && confirm !== pass;

  async function encrypt() {
    setError(null);
    setProgress(0);
    try {
      const signing = await createKeyfile(keys.signing.seed, pass, { onProgress: (p) => setProgress(p / 2) });
      const recovery = await createKeyfile(keys.recovery.seed, pass, { onProgress: (p) => setProgress(0.5 + p / 2) });
      setFiles({ signing, recovery });
      setPass("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Encryption failed.");
    } finally {
      setProgress(null);
    }
  }

  const names = { signing: `${slug}.signing.forrel-key.json`, recovery: `${slug}.recovery.forrel-key.json` };

  return (
    <StepBody
      title="Protect the keys"
      description="Each key's seed is encrypted with your passphrase (scrypt, then AES-256-GCM) and saved as a file. There is no account and no reset: lose the file or the passphrase and the key is gone."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!files || !downloaded.signing || !downloaded.recovery || !stored}>
            Continue <ArrowRight />
          </Button>
        </>
      }
    >
      {!files ? (
        <form
          className="flex max-w-lg flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void encrypt();
          }}
        >
          <PassphraseField label="Passphrase" value={pass} onChange={setPass} />
          <PassphraseField
            label="Repeat passphrase"
            value={confirm}
            onChange={setConfirm}
            meter={false}
            error={mismatch ? "The passphrases do not match." : null}
          />
          <Button type="submit" className="self-start" disabled={!strength.ok || confirm !== pass || progress !== null}>
            {progress !== null ? `Encrypting… ${Math.round(progress * 100)}%` : "Encrypt keyfiles"}
          </Button>
          {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            {(["signing", "recovery"] as const).map((role) => (
              <div key={role} className="flex flex-col gap-3 border border-hairline p-5">
                <p className="text-eyebrow text-muted-foreground">{role === "signing" ? "Signing keyfile" : "Recovery keyfile"}</p>
                <code className="text-body-sm break-all">{names[role]}</code>
                <Button
                  variant={downloaded[role] ? "outline" : "primary"}
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    downloadJson(names[role], files[role]);
                    setDownloaded((d) => ({ ...d, [role]: true }));
                  }}
                >
                  {downloaded[role] ? "✓ Downloaded · again" : "Download"}
                </Button>
                {role === "recovery" && (
                  <p className="text-body-sm text-muted-foreground">Keep this one offline: a USB stick in a drawer, not your laptop.</p>
                )}
              </div>
            ))}
          </div>
          <label htmlFor={checkId} className="flex cursor-pointer items-start gap-3 text-body">
            <input
              id={checkId}
              type="checkbox"
              checked={stored}
              onChange={(e) => setStored(e.target.checked)}
              className="mt-1 size-4 accent-[var(--brand-ink)]"
            />
            I stored the recovery key offline.
          </label>
        </div>
      )}
    </StepBody>
  );
}

/* ---------- 5. Review ---------- */

function ReviewStep({
  slug,
  keys,
  tx,
  onBack,
  onDone,
}: {
  slug: string;
  keys: Keys;
  tx: ReturnType<typeof useTx>;
  onBack: () => void;
  onDone: () => void;
}) {
  const w = useWallet();
  const { window: win } = useWalletChecks();
  const busy = tx.state.phase === "confirming" || tx.state.phase === "pending";

  async function submit() {
    const res = await tx.run(() =>
      getChainClient().registerProject({
        slug,
        signingPubkey: keys.signing.publicKey,
        recoveryPubkey: keys.recovery.publicKey,
      }),
    );
    if (res) onDone();
  }

  return (
    <StepBody
      title="Review and submit"
      description="This is everything that goes on-chain. Public keys only: your seeds and passphrase stay here."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onBack} disabled={busy}>
            Back
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Submitting…" : tx.state.phase === "failed" ? "Try again" : "Register with QoreX"}
          </Button>
        </>
      }
    >
      <FactList
        rows={[
          ["Project name", slug],
          ["Project ID", <span key="id" className="break-all">{projectIdOf(slug)}</span>],
          ["Owner", <span key="o" className="break-all">{w.address ?? "—"}</span>],
          ["Signing key", `${keys.signing.fingerprint} · 2,592 bytes`],
          ["Recovery key", `${keys.recovery.fingerprint} · 2,592 bytes`],
          ["Estimated gas", `≈ ${formatInt(GAS_ESTIMATES.registerProject)} (two SSTORE2 writes)`],
          [
            "Window headroom",
            win ? `${formatInt(win.remainingTxs)} txs · ${formatQor(win.remainingValue)} · ${formatInt(win.remainingBlocks)} blocks` : "—",
          ],
        ]}
      />
      <TxStatus state={tx.state} />
    </StepBody>
  );
}

/* ---------- 6. Done ---------- */

function DoneStep({ slug, txHash }: { slug: string; txHash: Hex | null }) {
  return (
    <StepBody title={`${slug} is registered`} description="Your keys are on-chain. Next, sign and publish your first release.">
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/app/projects/${slug}/publish`}>
            Publish your first release <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/app/projects/${slug}`}>Open the project page</Link>
        </Button>
        {txHash && (
          <Button asChild variant="ghost">
            <a href={txUrl(txHash)} target="_blank" rel="noreferrer">
              View transaction
            </a>
          </Button>
        )}
      </div>
    </StepBody>
  );
}
