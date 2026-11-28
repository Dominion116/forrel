/**
 * The on-chain verification gate (PRD Phase 4).
 *
 * Signs the shared PUBLISH test vector with @forrel/core's signers and asks QoreChain's real
 * `pqcVerify` precompile (0x0a01 on Diana) whether each signature is valid, through a read-only
 * `eth_call`. No transaction, no key, no gas. Exits non-zero if any expectation fails.
 *
 *   npm --workspace=@forrel/core run gate              # Diana (default RPC)
 *   FORREL_RPC=https://… npm --workspace=@forrel/core run gate
 *
 * Writes vectors/signatures.json (a deterministic, reproducible signature for the vector) and
 * prints a report. The findings are recorded in docs/message-spec.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPublicClient, decodeFunctionResult, encodeFunctionData, http, parseAbi, type Hex as VHex } from "viem";

import {
  DIANA_CHAIN_ID,
  DIANA_RPC_URL,
  PQC_KEY_STATUS_ADDRESS,
  PQC_VERIFY_ADDRESS,
  fromHex,
  keyFingerprint,
  nobleSigner,
  toHex,
  type Signer,
} from "../src/index";
import { qoresignSigner } from "../src/signers/qoresign";
import { sha3_256 } from "@noble/hashes/sha3";
import { utf8ToBytes } from "@noble/hashes/utils";

const here = path.dirname(fileURLToPath(import.meta.url));
const vectorsDir = path.join(here, "..", "vectors");
const rpc = process.env.FORREL_RPC ?? DIANA_RPC_URL;

const ABI = parseAbi([
  "function pqcVerify(bytes pubkey, bytes signature, bytes message) view returns (bool)",
  "function pqcKeyStatus(address account) view returns (bool registered, uint8 algorithmId, bytes pubkey, bool possessionProven)",
]);

const client = createPublicClient({ transport: http(rpc, { timeout: 30_000, retryCount: 3 }) });

type Row = { check: string; expected: string; actual: string; ok: boolean };
const rows: Row[] = [];
function record(check: string, expected: unknown, actual: unknown) {
  const ok = String(expected) === String(actual);
  rows.push({ check, expected: String(expected), actual: String(actual), ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${check}: expected ${String(expected)}, got ${String(actual)}`);
}

async function onChainVerify(publicKey: Uint8Array, signature: Uint8Array, message: Uint8Array): Promise<string> {
  const data = encodeFunctionData({
    abi: ABI,
    functionName: "pqcVerify",
    args: [toHex(publicKey) as VHex, toHex(signature) as VHex, toHex(message) as VHex],
  });
  const res = await client.call({ to: PQC_VERIFY_ADDRESS, data });
  if (!res.data || res.data === "0x") return "empty (precompile inactive)";
  return String(decodeFunctionResult({ abi: ABI, functionName: "pqcVerify", data: res.data }));
}

async function main() {
  const chainId = await client.getChainId();
  const block = await client.getBlockNumber();
  console.log(`RPC ${rpc} · chain ${chainId} · block ${block}\n`);
  record("chain id is Diana", DIANA_CHAIN_ID, chainId);

  // The shared PUBLISH vector (the same bytes the contract rebuilds, see CoreVectors.t.sol).
  const vectors = JSON.parse(readFileSync(path.join(vectorsDir, "messages.json"), "utf8"));
  const message = fromHex(vectors.publish.message as string);
  const tampered = message.slice();
  tampered[tampered.length - 1] ^= 0x01; // flip one bit of metaHash

  // A fixed, public test seed (never a real key).
  const seed = sha3_256(utf8ToBytes("forrel/gate/v1"));

  const signers: Signer[] = [qoresignSigner, nobleSigner];
  const results: Record<string, { publicKey: Uint8Array; deterministic: Uint8Array; passed: boolean }> = {};

  for (const s of signers) {
    console.log(`\n— ${s.name}`);
    const { publicKey, secretKey } = s.keypairFromSeed(seed);
    record(`${s.name}: public key length`, 2592, publicKey.length);
    const det = s.sign(message, secretKey, { deterministic: true });
    const hedged = s.sign(message, secretKey);
    record(`${s.name}: signature length`, 4627, det.length);
    record(`${s.name}: local verify (deterministic)`, true, s.verify(det, message, publicKey));

    const before = rows.length;
    record(`${s.name}: pqcVerify on-chain, deterministic`, true, await onChainVerify(publicKey, det, message));
    record(`${s.name}: pqcVerify on-chain, hedged`, true, await onChainVerify(publicKey, hedged, message));
    record(`${s.name}: pqcVerify on-chain, tampered message`, false, await onChainVerify(publicKey, det, tampered));
    const passed = rows.slice(before).every((r) => r.ok);
    results[s.name] = { publicKey, deterministic: det, passed };
    secretKey.fill(0);
  }

  // Both libraries implement FIPS 204 from the same seed: keys and deterministic signatures must match.
  const [a, b] = signers.map((s) => results[s.name]!);
  console.log("\n— cross-library");
  // Compare by SHA3-256 so the report stays readable (the full bytes are in signatures.json).
  const digest = (bytes: Uint8Array) => toHex(sha3_256(bytes));
  record("same public key from the same seed (SHA3-256)", digest(a!.publicKey), digest(b!.publicKey));
  record("same deterministic signature (SHA3-256)", digest(a!.deterministic), digest(b!.deterministic));
  record(
    "noble verifies qoresign's signature",
    true,
    nobleSigner.verify(a!.deterministic, message, a!.publicKey),
  );

  // pqcKeyStatus return shape: (bool, uint8, bytes, bool) has 4 head words, offset 0x80.
  console.log("\n— pqcKeyStatus shape");
  const ks = await client.call({
    to: PQC_KEY_STATUS_ADDRESS,
    data: encodeFunctionData({ abi: ABI, functionName: "pqcKeyStatus", args: ["0x000000000000000000000000000000000000dEaD"] }),
  });
  const words = (ks.data ?? "0x").slice(2).match(/.{64}/g) ?? [];
  record("pqcKeyStatus bytes offset word (0x80 = 4 outputs)", "0x80", `0x${BigInt(`0x${words[2] ?? "0"}`).toString(16)}`);

  const winner = results[qoresignSigner.name]!.passed
    ? qoresignSigner.name
    : results[nobleSigner.name]!.passed
      ? nobleSigner.name
      : null;

  const report = {
    description:
      "Deterministic ML-DSA-87 signature for the PUBLISH vector in messages.json, verified true by pqcVerify on Diana. Public test seed: SHA3-256(\"forrel/gate/v1\"). Regenerate with `npm --workspace=@forrel/core run gate`.",
    gate: {
      rpc,
      chainId,
      block: block.toString(),
      checkedAt: new Date().toISOString(),
      variant: "FIPS 204 ML-DSA-87, pure (not HashML-DSA), empty context, signature over the raw message bytes",
      passed: rows.every((r) => r.ok),
      winner,
      checks: rows,
    },
    seed: toHex(seed),
    publicKey: toHex(a!.publicKey),
    publicKeyFingerprint: keyFingerprint(a!.publicKey),
    message: vectors.publish.message,
    signature: toHex(a!.deterministic),
  };
  writeFileSync(path.join(vectorsDir, "signatures.json"), JSON.stringify(report, null, 2) + "\n");

  const failed = rows.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? "GATE PASSED" : `GATE FAILED (${failed.length})`} · winner: ${winner ?? "none"}`);
  console.log("wrote vectors/signatures.json");
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
