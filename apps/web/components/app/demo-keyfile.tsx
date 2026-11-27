"use client";

import { createKeyfile, demoSeed, type Project } from "@forrel/core";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DEMO_FINGERPRINTS } from "@/lib/chain/fixtures";
import { CHAIN_MODE } from "@/lib/config";
import { downloadJson } from "@/lib/download";

export const DEMO_PASSPHRASE = "forrel demo key only";

/**
 * Mock mode only: download the public demo keyfile for a fixture project, so the publish,
 * rotate and revoke flows can be clicked through. These seeds are public; never real keys.
 */
export function DemoKeyfile({ project, role }: { project: Project; role: "signing" | "recovery" }) {
  const [busy, setBusy] = useState(false);
  const demo = DEMO_FINGERPRINTS[project.slug];
  if (CHAIN_MODE !== "mock" || !demo) return null;

  const epoch = role === "signing" ? project.keyEpoch : 1;
  const expected = role === "signing" ? demo.signing[epoch - 1] : demo.recovery;
  const current = role === "signing" ? project.signingKeyFingerprint : project.recoveryKeyFingerprint;
  if (!expected || expected.toLowerCase() !== current.toLowerCase()) return null;

  async function download() {
    setBusy(true);
    try {
      const file = await createKeyfile(demoSeed(project.slug, role, epoch), DEMO_PASSPHRASE);
      downloadJson(`${project.slug}.${role}.DEMO.forrel-key.json`, file);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border border-dashed border-warning p-4">
      <p className="text-eyebrow text-warning">Demo data</p>
      <p className="text-body-sm text-muted-foreground">
        {project.slug} uses a public demo {role} key. Download its keyfile to try this flow. Passphrase:{" "}
        <code className="text-foreground">{DEMO_PASSPHRASE}</code>
      </p>
      <Button variant="outline" size="sm" className="self-start" onClick={download} disabled={busy}>
        {busy ? "Encrypting…" : `Download demo ${role} keyfile`}
      </Button>
    </div>
  );
}
