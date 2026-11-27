import {
  WrongPassphraseError,
  createKeyfile,
  encodePublishMsg,
  encodeRevokeMsg,
  encodeRotateMsg,
  fromBase64,
  generateSeed,
  keyFingerprint,
  keypairFromSeed,
  openKeyfile,
  projectIdOf,
  signMessage,
  toBase64,
  toHex,
  verifyMessage,
  type Hex,
} from "@forrel/core";
import { describe, expect, it } from "vitest";

const REG = "0x5eed00000000000000000000000000000000f0e1" as Hex;
const Z32 = `0x${"00".repeat(32)}` as Hex;

describe("message encoding (PRD §12.2)", () => {
  it("packs PUBLISH as 17+32+20+32+8+32+32+32 = 205 bytes", () => {
    const m = encodePublishMsg({ chainId: 9800, registry: REG, projectId: projectIdOf("acme-router"), seq: 7, version: "2.4.1", artifactHash: Z32, metaHash: Z32 });
    expect(m.fields.map((f) => f.bytes.length)).toEqual([17, 32, 20, 32, 8, 32, 32, 32]);
    expect(m.bytes.length).toBe(205);
    expect(m.hex.startsWith(toHex(new TextEncoder().encode("FORREL/v1/PUBLISH")))).toBe(true);
  });

  it("packs ROTATE as 16+32+20+32+4+32+1 = 137 bytes", () => {
    const m = encodeRotateMsg({ chainId: 9800, registry: REG, projectId: Z32, keyEpoch: 1, newPubkey: `0x${"11".repeat(2592)}` as Hex, viaRecovery: true });
    expect(m.bytes.length).toBe(137);
    expect(m.bytes[m.bytes.length - 1]).toBe(1);
  });

  it("packs REVOKE as 16+32+20+32+32+1 = 133 bytes", () => {
    const m = encodeRevokeMsg({ chainId: 9800, registry: REG, projectId: Z32, releaseId: 3, reason: 2 });
    expect(m.bytes.length).toBe(133);
    expect(m.bytes[m.bytes.length - 1]).toBe(2);
  });

  it("changes when any field changes", () => {
    const base = { chainId: 9800, registry: REG, projectId: Z32, seq: 1, version: "1.0.0", artifactHash: Z32, metaHash: Z32 };
    const a = encodePublishMsg(base).hex;
    expect(encodePublishMsg({ ...base, seq: 2 }).hex).not.toBe(a);
    expect(encodePublishMsg({ ...base, version: "1.0.1" }).hex).not.toBe(a);
    expect(encodePublishMsg({ ...base, chainId: 1 }).hex).not.toBe(a);
  });
});

describe("ML-DSA-87 keys", () => {
  it("signs 4,627-byte signatures that verify only for the right message", () => {
    const k = keypairFromSeed(generateSeed());
    expect(k.publicKey.length).toBe(2592);
    const msg = new TextEncoder().encode("hello");
    const sig = signMessage(msg, k.secretKey);
    expect(sig.length).toBe(4627);
    expect(verifyMessage(sig, msg, k.publicKey)).toBe(true);
    expect(verifyMessage(sig, new TextEncoder().encode("hellO"), k.publicKey)).toBe(false);
    expect(keyFingerprint(k.publicKey)).toMatch(/^0x[0-9a-f]{16}$/);
  });
});

describe("keyfile", () => {
  it("round-trips the seed and rejects a wrong passphrase", async () => {
    const seed = generateSeed();
    // Low N keeps the test fast; the app always uses N = 2^17.
    const file = await createKeyfile(seed, "correct horse battery staple", { N: 1024 });
    expect(file.alg).toBe("ML-DSA-87");
    expect(fromBase64(file.publicKey).length).toBe(2592);
    const pair = await openKeyfile(file, "correct horse battery staple");
    expect(toBase64(pair.seed)).toBe(toBase64(seed));
    await expect(openKeyfile(file, "wrong")).rejects.toBeInstanceOf(WrongPassphraseError);
  });
});
