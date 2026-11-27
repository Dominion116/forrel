"use client";

import { useId, useState } from "react";

import { passphraseStrength } from "@/lib/passphrase";
import { cn } from "@/lib/utils";

const barTone = ["bg-danger", "bg-danger", "bg-warning", "bg-brand-ink", "bg-brand-ink"];

/** Passphrase input with show/hide and a 4-segment strength meter (text label, not color alone). */
export function PassphraseField({
  label,
  value,
  onChange,
  meter = true,
  autoComplete = "new-password",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  meter?: boolean;
  autoComplete?: "new-password" | "current-password";
  error?: string | null;
}) {
  const id = useId();
  const hintId = useId();
  const [show, setShow] = useState(false);
  const s = passphraseStrength(value);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-eyebrow text-muted-foreground">
        {label}
      </label>
      <div className="flex">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          spellCheck={false}
          aria-describedby={hintId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-11 min-w-0 flex-1 border bg-transparent px-3 font-mono text-body text-foreground",
            error ? "border-danger" : "border-control focus:border-foreground",
          )}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-pressed={show}
          className="text-eyebrow h-11 shrink-0 border border-l-0 border-control px-3 text-muted-foreground hover:text-foreground"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {meter && (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-4 gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn("h-1.5", value && s.score >= i ? barTone[s.score] : "bg-hairline")} />
            ))}
          </div>
          <p id={hintId} className="text-body-sm text-muted-foreground">
            <span className="text-foreground">{value ? s.label : "Strength"}</span> · {s.hint}
          </p>
        </div>
      )}
      {!meter && <span id={hintId} className="sr-only">{label}</span>}
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
