// Regenerate the signed-message vectors: npm --workspace=@forrel/core run vectors
import { writeFileSync } from "node:fs";
import { encodePublishMsg, encodeRotateMsg, encodeRevokeMsg, projectIdOf, metaHashOf } from "../src/index";
const chainId = 9800;
const registry = "0x5eed00000000000000000000000000000000f0e1" as const;
const slug = "acme-router";
const projectId = projectIdOf(slug);
const notes = "Fixes CVE-2026-0001.";
const artifactHash = `0x${"4b".repeat(32)}` as const;
const newPubkey = `0x${"11".repeat(2592)}` as const;
const publish = { chainId, registry, projectId, seq: 7, version: "2.4.1", artifactHash, metaHash: metaHashOf(notes) };
const rotate = { chainId, registry, projectId, keyEpoch: 2, newPubkey, viaRecovery: true };
const revoke = { chainId, registry, projectId, releaseId: 17, reason: 1 as const };
const out = {
  description: "Signed-message vectors generated from @forrel/core. Consumed by contracts/test/CoreVectors.t.sol (and later the CLI). Regenerate if the encoding changes.",
  slug,
  notes,
  publish: { input: publish, message: encodePublishMsg(publish).hex },
  rotate: { input: { ...rotate, newPubkey: "0x11 repeated 2592 times" }, message: encodeRotateMsg(rotate).hex },
  revoke: { input: revoke, message: encodeRevokeMsg(revoke).hex },
};
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 2) + "\n");
console.log("wrote", process.argv[2]);
