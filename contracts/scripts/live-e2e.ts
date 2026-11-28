/**
 * End-to-end check of the web app's LiveChainClient against a local anvil chain.
 *
 *   anvil --chain-id 9800                      # in another terminal
 *   npm --workspace=@forrel/contracts run abi  # builds out/ (and refreshes the core ABI)
 *   npx tsx scripts/live-e2e.ts                # from contracts/
 *
 * Deploys the real ForrelRegistry bytecode, etches the mock precompiles at 0x0a01/0x0a02 (anvil
 * can't run QoreChain's), then drives the exact client the browser uses through
 * register → publish → verify → re-check → revoke → rotate, plus revert decoding and the
 * event-log tx links. Real ML-DSA-87 verification on Diana is covered by the core gate.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DIANA_CHAIN_ID,
  encodePublishMsg,
  encodeRevokeMsg,
  encodeRotateMsg,
  isRegistryError,
  keyFingerprint,
  keypairFromSeed,
  metaHashOf,
  projectIdOf,
  toBase64,
  toHex,
  type Hex,
} from "@forrel/core";
import {
  concat,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  parseAbi,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { LiveChainClient } from "../../apps/web/lib/chain/live-client";

const here = path.dirname(fileURLToPath(import.meta.url));
const artifact = (file: string, name: string) =>
  JSON.parse(readFileSync(path.join(here, "..", "out", file, `${name}.json`), "utf8"));

const RPC = process.env.ANVIL_RPC ?? "http://127.0.0.1:8545";
// anvil's well-known first dev account (never use on a real network).
const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const chain = defineChain({
  id: DIANA_CHAIN_ID,
  name: "anvil-as-diana",
  nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const publicClient = createPublicClient({ chain, transport: http(RPC) }) as PublicClient;
const wallet = createWalletClient({ account, chain, transport: http(RPC) });

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` · ${detail}` : ""}`);
}

/** The mock verifier's toy scheme: first 32 bytes = keccak256(pubkey ‖ message), padded to 4,627. */
function mockSign(pubkey: Uint8Array, message: Uint8Array): Uint8Array {
  const sig = new Uint8Array(4627);
  const h = keccak256(concat([toHex(pubkey), toHex(message)]));
  sig.set(Buffer.from(h.slice(2), "hex"), 0);
  return sig;
}

async function expectRegistryError(name: string, code: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(name, false, "no revert");
  } catch (err) {
    check(name, isRegistryError(err) && err.code === code, isRegistryError(err) ? err.code : String(err).slice(0, 120));
  }
}

async function main() {
  check("anvil runs as chain 9800", (await publicClient.getChainId()) === DIANA_CHAIN_ID);

  // Mock precompiles where QoreChain's real ones live.
  const setCode = (address: Hex, code: Hex) =>
    publicClient.request({ method: "anvil_setCode" as never, params: [address, code] as never });
  await setCode("0x0000000000000000000000000000000000000a01", artifact("PQCMocks.sol", "MockPQCVerifier").deployedBytecode.object);
  await setCode("0x0000000000000000000000000000000000000a02", artifact("PQCMocks.sol", "MockPQCKeyStatus").deployedBytecode.object);
  const setStatus = await wallet.writeContract({
    address: "0x0000000000000000000000000000000000000a02",
    abi: parseAbi(["function set(address,bool,uint8,bool)"]),
    functionName: "set",
    args: [account.address, true, 1, true],
  });
  await publicClient.waitForTransactionReceipt({ hash: setStatus });

  // Deploy the real registry bytecode.
  const reg = artifact("ForrelRegistry.sol", "ForrelRegistry");
  const deployHash = await wallet.deployContract({ abi: reg.abi, bytecode: reg.bytecode.object, args: [] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const registry = receipt.contractAddress as Hex;
  console.log(`registry ${registry} at block ${receipt.blockNumber}\n`);

  const client = new LiveChainClient({
    registry,
    publicClient,
    getWalletClient: async () => wallet as never,
    rest: "http://unused.invalid",
    deployBlock: receipt.blockNumber,
  });

  const slug = "e2e-router";
  const signing = keypairFromSeed(new Uint8Array(32).fill(1));
  const recovery = keypairFromSeed(new Uint8Array(32).fill(2));
  const pid = projectIdOf(slug);

  // ---- register
  check("unknown project reads as null", (await client.getProject(slug)) === null);
  const reg1 = await client.registerProject({ slug, signingPubkey: toHex(signing.publicKey), recoveryPubkey: toHex(recovery.publicKey) });
  check("register returns a tx hash and block", /^0x[0-9a-f]{64}$/.test(reg1.txHash) && reg1.blockNumber !== undefined);
  let p = (await client.getProject(slug))!;
  check("project reads back", p.projectId === pid && p.owner.toLowerCase() === account.address.toLowerCase() && p.keyEpoch === 1);
  check("signing key fingerprint", p.signingKeyFingerprint === keyFingerprint(signing.publicKey));
  check("recovery key read from SSTORE2", p.recoveryKeyHex.toLowerCase() === toHex(recovery.publicKey));
  await expectRegistryError("duplicate slug decodes as SlugTaken", "SlugTaken", () =>
    client.registerProject({ slug, signingPubkey: toHex(signing.publicKey), recoveryPubkey: toHex(recovery.publicKey) }),
  );

  // ---- publish two releases
  const art1 = `0x${"a1".repeat(32)}` as Hex;
  const art2 = `0x${"a2".repeat(32)}` as Hex;
  async function publish(version: string, artifactHash: Hex, key = signing) {
    const proj = (await client.getProject(slug))!;
    const metaHash = metaHashOf(`notes ${version}`);
    const msg = encodePublishMsg({ chainId: DIANA_CHAIN_ID, registry, projectId: pid, seq: proj.nextSeq, version, artifactHash, metaHash });
    return client.publish({
      v: 1, chainId: DIANA_CHAIN_ID, registry, projectId: pid, slug, seq: Number(proj.nextSeq), version,
      artifactHash, metaHash, keyFingerprint: proj.signingKeyFingerprint,
      signature: toBase64(mockSign(key.publicKey, msg.bytes)),
    });
  }
  const pub1 = await publish("1.0.0", art1);
  await publish("1.1.0", art2);
  check("publish returns a tx hash", /^0x[0-9a-f]{64}$/.test(pub1.txHash));
  await expectRegistryError("duplicate version decodes as VersionExists", "VersionExists", () => publish("1.0.0", art1));
  await expectRegistryError("wrong key decodes as SignatureInvalid", "SignatureInvalid", () => publish("2.0.0", art1, recovery));

  // ---- reads
  const stats = await client.getStats();
  check("stats", stats.projectCount === 1 && stats.releaseCount === 2 && stats.revokedCount === 0 && stats.lastPublishedAt !== null);
  const projects = await client.listProjects({ offset: 0, limit: 10 });
  check("listProjects with latest version", projects.length === 1 && projects[0]!.latestVersion === "1.1.0" && projects[0]!.releaseCount === 2);
  const rels = await client.listReleases(pid, { offset: 0, limit: 10 });
  check("listReleases newest first", rels.map((r) => r.version).join(",") === "1.1.0,1.0.0");
  const page2 = await client.listReleases(pid, { offset: 1, limit: 1 });
  check("listReleases paging", page2.length === 1 && page2[0]!.version === "1.0.0");
  const recent = await client.listRecentReleases({ offset: 0, limit: 5 });
  check("listRecentReleases newest first", recent.map((r) => r.version).join(",") === "1.1.0,1.0.0");

  // ---- verify (find by artifact) + permalink data
  const found = await client.findByArtifact(art1);
  check("findByArtifact", found.length === 1 && found[0]!.slug === slug && found[0]!.version === "1.0.0" && !found[0]!.revoked);
  check("publish tx hash from logs", found[0]!.publishTxHash === pub1.txHash);
  check("unknown artifact finds nothing", (await client.findByArtifact(`0x${"00".repeat(32)}`)).length === 0);
  const full = (await client.getReleaseById(found[0]!.releaseId))!;
  check("release detail: signature and key bytes", (full.signatureHex!.length - 2) / 2 === 4627 && (full.signingKeyHex!.length - 2) / 2 === 2592);
  check("unknown release reads as null", (await client.getReleaseById(999n)) === null);

  // ---- re-check (eth_call through recheck → pqcVerify)
  const recheck = await client.recheckSignature(found[0]!.releaseId);
  check("re-check signature", recheck.valid && recheck.checkedAtBlock > 0n);

  // ---- revoke
  const revMsg = encodeRevokeMsg({ chainId: DIANA_CHAIN_ID, registry, projectId: pid, releaseId: found[0]!.releaseId, reason: 2 });
  const rev = await client.revoke({ releaseId: found[0]!.releaseId, reason: 2, signature: toHex(mockSign(signing.publicKey, revMsg.bytes)) });
  const afterRevoke = (await client.findByArtifact(art1))[0]!;
  check("revoked with reason and time", afterRevoke.revoked && afterRevoke.revokeReason === 2 && (afterRevoke.revokedAt ?? 0) > 0);
  check("revoke tx hash from logs", afterRevoke.revokeTxHash === rev.txHash);
  await expectRegistryError("revoking twice decodes as AlreadyRevoked", "AlreadyRevoked", () =>
    client.revoke({ releaseId: found[0]!.releaseId, reason: 2, signature: toHex(mockSign(signing.publicKey, revMsg.bytes)) }),
  );

  // ---- rotate via the recovery key
  const next = keypairFromSeed(new Uint8Array(32).fill(3));
  const rotMsg = encodeRotateMsg({ chainId: DIANA_CHAIN_ID, registry, projectId: pid, keyEpoch: 1, newPubkey: toHex(next.publicKey), viaRecovery: true });
  await client.rotateKey({ projectId: pid, newPubkey: toHex(next.publicKey), viaRecovery: true, signature: toHex(mockSign(recovery.publicKey, rotMsg.bytes)) });
  p = (await client.getProject(slug))!;
  check("rotated to epoch 2 with the new key", p.keyEpoch === 2 && p.signingKeyFingerprint === keyFingerprint(next.publicKey));
  check(
    "rotation history from storage",
    p.rotations.length === 1 && p.rotations[0]!.epoch === 2 && p.rotations[0]!.viaRecovery && p.rotations[0]!.signingKeyFingerprint === keyFingerprint(next.publicKey),
  );
  await expectRegistryError("old key after rotation decodes as SignatureInvalid", "SignatureInvalid", () => publish("3.0.0", art1, signing));
  const afterRotate = await publish("3.0.0", art1, next);
  check("new key publishes", /^0x[0-9a-f]{64}$/.test(afterRotate.txHash));
  const both = await client.findByArtifact(art1);
  check("same artifact now has two releases (revoked 1.0.0, live 3.0.0)", both.length === 2 && both.some((r) => r.revoked) && both.some((r) => !r.revoked));

  console.log(`\n${failures === 0 ? "E2E PASSED" : `E2E FAILED (${failures})`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
