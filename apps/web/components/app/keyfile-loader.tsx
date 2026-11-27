"use client";

import {
  InvalidKeyfileError,
  WrongPassphraseError,
  keyFingerprint,
  keyfilePublicKey,
  openKeyfile,
  parseKeyfile,
  type KeyPair,
  type Keyfile,
} from "@forrel/core";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { PassphraseField } from "./passphrase-field";

export interface LoadedKey {
  pair: KeyPair;
  fingerprint: string;
  fileName: string;
}

/**
 * Pick a `.forrel-key.json`, enter its passphrase, decrypt in memory.
 * Shows the fingerprint before decrypting so a wrong file is caught early.
 * `expectedFingerprint` blocks a key that does not match the on-chain one.
 */
export function KeyfileLoader({
  label = "Signing keyfile",
  expectedFingerprint,
  expectedLabel = "the project's current signing key",
  onLoaded,
}: {
  label?: string;
  expectedFingerprint?: string;
  expectedLabel?: string;
  onLoaded: (key: LoadedKey) => void;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; keyfile: Keyfile; fingerprint: string } | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const mismatch =
    file && expectedFingerprint && file.fingerprint.toLowerCase() !== expectedFingerprint.toLowerCase();

  async function pick(f: File) {
    setError(null);
    try {
      const keyfile = parseKeyfile(await f.text());
      setFile({ name: f.name, keyfile, fingerprint: keyFingerprint(keyfilePublicKey(keyfile)) });
    } catch (e) {
      setFile(null);
      setError(e instanceof InvalidKeyfileError ? e.message : "Could not read that file.");
    }
  }

  async function unlock() {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const pair = await openKeyfile(file.keyfile, passphrase, { onProgress: (p) => setProgress(p) });
      setPassphrase("");
      onLoaded({ pair, fingerprint: file.fingerprint, fileName: file.name });
    } catch (e) {
      setError(
        e instanceof WrongPassphraseError
          ? e.message
          : e instanceof InvalidKeyfileError
            ? e.message
            : "Could not decrypt the keyfile.",
      );
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-eyebrow text-muted-foreground">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pick(f);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            {file ? "Choose another file" : "Choose keyfile"}
          </Button>
          {file && <span className="truncate text-body-sm text-muted-foreground">{file.name}</span>}
        </div>
      </div>

      {file && (
        <div className={cn("flex flex-col gap-1 border-l-2 py-1 pl-4", mismatch ? "border-danger" : "border-brand-ink")}>
          <p className="text-body-sm text-muted-foreground">Key fingerprint</p>
          <p className="font-pixel tracking-[0.12em]">{file.fingerprint}</p>
          {expectedFingerprint && (
            <p className={cn("text-body-sm", mismatch ? "text-danger" : "text-verified")}>
              {mismatch
                ? `✕ This is not ${expectedLabel} (${expectedFingerprint}). A signature from it would be rejected on-chain.`
                : `✓ Matches ${expectedLabel}.`}
            </p>
          )}
        </div>
      )}

      {file && !mismatch && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void unlock();
          }}
        >
          <PassphraseField
            label="Passphrase"
            value={passphrase}
            onChange={setPassphrase}
            meter={false}
            autoComplete="current-password"
          />
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={!passphrase || progress !== null}>
              {progress !== null ? `Decrypting… ${Math.round(progress * 100)}%` : "Unlock key"}
            </Button>
            <p className="text-body-sm text-muted-foreground">Decrypted in memory only. Nothing is uploaded.</p>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
