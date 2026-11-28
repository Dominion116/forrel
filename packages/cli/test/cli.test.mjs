import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cliDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binPath = path.join(cliDir, "bin", "forrel.mjs");

function runCli(args, env = {}) {
  return spawnSync(process.execPath, [binPath, ...args], {
    cwd: cliDir,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("hash, keygen, and offline sign produce valid deterministic structures", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "forrel-cli-test-"));
  try {
    const artifact = path.join(tmp, "firmware.bin");
    const keyfile = path.join(tmp, "signing.forrel-key.json");
    const notes = path.join(tmp, "notes.txt");
    const bundlePath = path.join(tmp, "firmware.bin.forrel.json");

    writeFileSync(artifact, "forrel-test-firmware-v1");
    writeFileSync(notes, "Initial firmware release");

    const hashRes = runCli(["hash", artifact, "--json"]);
    assert.equal(hashRes.status, 0, hashRes.stderr);
    const hashOut = JSON.parse(hashRes.stdout);
    assert.match(hashOut.hash, /^0x[0-9a-f]{64}$/);

    const keygenRes = runCli(["keygen", "--out", keyfile, "--json"], {
      FORREL_PASSPHRASE: "test-passphrase-for-ci",
    });
    assert.equal(keygenRes.status, 0, keygenRes.stderr);
    const keygenOut = JSON.parse(keygenRes.stdout);
    assert.equal(keygenOut.alg, "ML-DSA-87");
    assert.match(keygenOut.fingerprint, /^0x[0-9a-f]{16}$/);

    // Offline sign: --seq skips RPC entirely.
    const signRes = runCli(
      [
        "sign",
        artifact,
        "--project",
        "acme-router",
        "--version",
        "1.0.0",
        "--notes",
        notes,
        "--key",
        keyfile,
        "--seq",
        "1",
        "--registry",
        "0x0000000000000000000000000000000000000001",
        "--out",
        bundlePath,
      ],
      { FORREL_PASSPHRASE: "test-passphrase-for-ci" },
    );
    assert.equal(signRes.status, 0, signRes.stderr);

    const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
    assert.equal(bundle.v, 1);
    assert.equal(bundle.slug, "acme-router");
    assert.equal(bundle.seq, 1);
    assert.equal(bundle.version, "1.0.0");
    assert.equal(bundle.artifactHash, hashOut.hash);
    assert.equal(bundle.keyFingerprint, keygenOut.fingerprint);
    assert.ok(typeof bundle.signature === "string" && bundle.signature.length > 100);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("verify exits with code 3 on missing file", () => {
  const res = runCli(["verify", "non-existent-file.bin", "--json"]);
  assert.equal(res.status, 3);
  const out = JSON.parse(res.stdout);
  assert.equal(out.verdict, "error");
  assert.equal(out.exitCode, 3);
});
