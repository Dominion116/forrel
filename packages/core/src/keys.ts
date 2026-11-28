import { sha3_256 } from "@noble/hashes/sha3";
import { randomBytes } from "@noble/hashes/utils";

import { ML_DSA_87_PUBKEY_BYTES, ML_DSA_87_SIGNATURE_BYTES } from "./constants";
import { fromHex, toHex, utf8ToBytes } from "./encoding";
import { getSigner } from "./signer";
import type { Hex } from "./types";

/**
 * ML-DSA-87 (FIPS 204) keys. Keys are always derived from a 32-byte seed; the seed is what a
 * keyfile stores (encrypted), never the expanded 4,896-byte secret key.
 * All crypto goes through the active {@link Signer} (see signer.ts).
 */

export const SEED_BYTES = 32;

export interface KeyPair {
  seed: Uint8Array;
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export function generateSeed(): Uint8Array {
  return randomBytes(SEED_BYTES);
}

export function keypairFromSeed(seed: Uint8Array): KeyPair {
  if (seed.length !== SEED_BYTES) throw new RangeError(`Seed must be ${SEED_BYTES} bytes`);
  const { publicKey, secretKey } = getSigner().keypairFromSeed(seed);
  return { seed, publicKey, secretKey };
}

/** Fingerprint shown in the UI: the first 8 bytes of SHA3-256(publicKey), as hex. */
export function keyFingerprint(publicKey: Uint8Array | Hex): Hex {
  const pk = typeof publicKey === "string" ? fromHex(publicKey) : publicKey;
  return toHex(sha3_256(pk).slice(0, 8));
}

/**
 * Sign raw message bytes (FIPS 204 pure ML-DSA-87, empty context).
 * Hedged by default; `deterministic: true` for reproducible test vectors.
 */
export function signMessage(
  message: Uint8Array,
  secretKey: Uint8Array,
  opts?: { deterministic?: boolean },
): Uint8Array {
  const sig = getSigner().sign(message, secretKey, opts);
  if (sig.length !== ML_DSA_87_SIGNATURE_BYTES) throw new Error("Unexpected ML-DSA-87 signature length");
  return sig;
}

export function verifyMessage(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
  if (publicKey.length !== ML_DSA_87_PUBKEY_BYTES || signature.length !== ML_DSA_87_SIGNATURE_BYTES) return false;
  return getSigner().verify(signature, message, publicKey);
}

/**
 * Deterministic demo seed for the mock registry's fixture projects.
 * Never use for real keys: anyone can recompute it.
 */
export function demoSeed(slug: string, role: "signing" | "recovery", epoch: number): Uint8Array {
  return sha3_256(utf8ToBytes(`forrel/demo/${slug}/${role}/${epoch}`));
}
