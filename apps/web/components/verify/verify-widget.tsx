"use client";

import type { Hex } from "@forrel/core";
import { sha3_256 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import { FileUp } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { getChainClient } from "@/lib/chain";
import { useRecentReleases } from "@/lib/chain/hooks";
import { hashFile } from "@/lib/hash/hash-file";
import { cn } from "@/lib/utils";
import { normalizeHash, resolveVerdict, type Verdict } from "@/lib/verify/verdict";

import { VerdictCard } from "./verdict-card";

type State =
  | { phase: "idle" }
  | { phase: "hashing"; name: string; size: number; done: number }
  | { phase: "looking"; hash: Hex; source: string }
  | { phase: "result"; verdict: Verdict; source: string; ms: number | null };

const SHOW_PROGRESS_OVER = 20 * 1024 * 1024;

/** A hash no one has published, for the "never published" sample. */
const UNPUBLISHED_SAMPLE = `0x${bytesToHex(sha3_256(utf8ToBytes("forrel: a file nobody signed")))}` as Hex;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * Wallet-free verifier: drop or pick a file (hashed locally with streaming SHA3-256 in a
 * Web Worker) or paste a hash, then read the registry with a read-only call.
 * Shared by the landing page (compact) and /app/verify.
 */
export function VerifyWidget({
  className,
  initialHash,
}: {
  className?: string;
  /** Prefill and check this hash on mount (e.g. /app/verify?hash=…). */
  initialHash?: string;
}) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState(initialHash ?? "");
  const ranInitial = useRef(false);
  useEffect(() => {
    if (!initialHash || ranInitial.current) return;
    ranInitial.current = true;
    runHash(initialHash, "linked hash");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHash]);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastRun = useRef<(() => void) | null>(null);
  const inputId = useId();
  const pasteId = useId();
  const pasteErrId = useId();

  const recent = useRecentReleases(30);
  const samples = useMemo(() => {
    const list = recent.data ?? [];
    const counts = new Map<string, number>();
    list.forEach((r) => counts.set(r.artifactHash, (counts.get(r.artifactHash) ?? 0) + 1));
    const verified = list.find((r) => !r.revoked && counts.get(r.artifactHash) === 1);
    const revoked = list.find((r) => r.revoked);
    const shared = list.find((r) => (counts.get(r.artifactHash) ?? 0) > 1);
    return [
      verified && { label: "A verified release", hash: verified.artifactHash },
      revoked && { label: "A revoked release", hash: revoked.artifactHash },
      shared && { label: "Published twice", hash: shared.artifactHash },
      { label: "Never published", hash: UNPUBLISHED_SAMPLE },
    ].filter(Boolean) as { label: string; hash: Hex }[];
  }, [recent.data]);

  async function lookup(hash: Hex, source: string, ms: number | null) {
    setState({ phase: "looking", hash, source });
    try {
      const client = getChainClient();
      const matches = await client.findByArtifact(hash);
      const projectReleases =
        matches.length === 1 && matches[0]!.revoked
          ? await client.listReleases(matches[0]!.projectId, { offset: 0, limit: 200 })
          : [];
      setState({ phase: "result", verdict: resolveVerdict(hash, matches, projectReleases), source, ms });
    } catch (err) {
      setState({
        phase: "result",
        source,
        ms,
        verdict: {
          kind: "error",
          hash,
          message:
            err instanceof Error
              ? `The registry could not be reached (${err.message}).`
              : "The registry could not be reached.",
        },
      });
    }
  }

  async function runFile(file: File) {
    lastRun.current = () => void runFile(file);
    setPasteError(null);
    setState({ phase: "hashing", name: file.name, size: file.size, done: 0 });
    try {
      const { hash, ms } = await hashFile(file, (done) =>
        setState((s) => (s.phase === "hashing" ? { ...s, done } : s)),
      );
      await lookup(hash, file.name, ms);
    } catch (err) {
      setState({
        phase: "result",
        source: file.name,
        ms: null,
        verdict: {
          kind: "error",
          hash: null,
          message: err instanceof Error ? `Hashing failed: ${err.message}` : "Hashing failed.",
        },
      });
    }
  }

  function runHash(raw: string, source = "pasted hash") {
    const hash = normalizeHash(raw);
    if (!hash) {
      setPasteError("Paste 64 hex characters (a SHA3-256 hash), with or without 0x.");
      return;
    }
    setPasteError(null);
    lastRun.current = () => void lookup(hash, source, null);
    void lookup(hash, source, null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void runFile(file);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runHash(pasted);
  }

  const busy = state.phase === "hashing" || state.phase === "looking";

  return (
    <div className={cn("flex min-w-0 flex-col gap-6", className)}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "group/zone relative flex flex-col items-center justify-center gap-4 overflow-hidden border border-dashed px-6 py-12 text-center transition-colors duration-150 sm:py-16",
          dragging ? "border-brand-ink bg-surface-2" : "border-control bg-surface hover:border-brand-ink",
        )}
      >
        {/* Scanner line: sweeps while hovered, dragged over or hashing */}
        <span
          aria-hidden="true"
          className={cn(
            "animate-scan-zone pointer-events-none absolute inset-x-0 h-px bg-brand-ink shadow-[0_0_18px_2px_var(--brand-ink)] transition-opacity duration-300",
            dragging || state.phase === "hashing" || state.phase === "looking"
              ? "opacity-100"
              : "opacity-0 group-hover/zone:opacity-100",
          )}
        />
        <FileUp aria-hidden="true" className={cn("size-8", dragging ? "text-brand-ink" : "text-muted-foreground")} />
        <div className="flex flex-col gap-1">
          <p className="text-title">Drop a file to verify</p>
          <p className="text-body-sm text-muted-foreground">
            Hashed on this device with SHA3-256. Nothing is uploaded.
          </p>
        </div>
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void runFile(file);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          Choose a file
        </Button>

        {state.phase === "hashing" && (
          <div className="flex w-full max-w-sm flex-col gap-2" aria-live="polite">
            <p className="text-body-sm truncate text-muted-foreground">
              Hashing {state.name} · {formatBytes(state.size)}
            </p>
            {state.size > SHOW_PROGRESS_OVER ? (
              <div
                role="progressbar"
                aria-label="Hashing progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((state.done / state.size) * 100)}
                className="h-1.5 w-full bg-hairline"
              >
                <div
                  className="h-full bg-brand-ink transition-[width] duration-150"
                  style={{ width: `${(state.done / state.size) * 100}%` }}
                />
              </div>
            ) : (
              <p className="text-eyebrow text-brand-ink">
                Hashing<span className="animate-blink">_</span>
              </p>
            )}
          </div>
        )}
        {state.phase === "looking" && (
          <p className="text-eyebrow text-brand-ink" aria-live="polite">
            Reading the registry<span className="animate-blink">_</span>
          </p>
        )}
      </div>

      {/* Paste a hash */}
      <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
        <label htmlFor={pasteId} className="text-eyebrow text-muted-foreground">
          Or paste a SHA3-256 hash
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={pasteId}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="0x4b22…bf8a"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={pasteError ? true : undefined}
            aria-describedby={pasteError ? pasteErrId : undefined}
            className={cn(
              "h-10 min-w-0 flex-1 border bg-transparent px-3 font-mono text-body-sm text-foreground placeholder:text-muted-foreground/70",
              pasteError ? "border-danger" : "border-control focus:border-foreground",
            )}
          />
          <Button type="submit" variant="primary" size="md" disabled={busy}>
            Check hash
          </Button>
        </div>
        {pasteError && (
          <p id={pasteErrId} className="text-body-sm text-danger">
            {pasteError}
          </p>
        )}
      </form>

      {/* Samples, so anyone can see every verdict without a matching file */}
      {samples.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-eyebrow text-muted-foreground">No file handy? Try one</p>
          <div className="flex flex-wrap gap-2">
            {samples.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={busy}
                onClick={() => {
                  setPasted(s.hash);
                  runHash(s.hash, s.label.toLowerCase());
                }}
                className="h-8 border border-hairline px-3 text-body-sm text-muted-foreground transition-colors duration-150 hover:border-foreground hover:text-foreground disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      <div aria-live="polite" aria-atomic="true">
        {state.phase === "result" && (
          <div className="flex flex-col gap-2">
            <p className="text-body-sm text-muted-foreground">
              {state.source}
              {state.ms !== null && ` · hashed locally in ${state.ms} ms`}
            </p>
            <VerdictCard verdict={state.verdict} onRetry={() => lastRun.current?.()} />
          </div>
        )}
      </div>
    </div>
  );
}
