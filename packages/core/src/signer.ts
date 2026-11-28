import { ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";

/**
 * One interface for ML-DSA-87 (FIPS 204) so the web app, the CLI and the on-chain gate all
 * sign through the same code path, whatever library is underneath.
 *
 * Variant (checked against the real `pqcVerify` precompile on Diana, see docs/message-spec.md):
 * - "pure" ML-DSA (not HashML-DSA), empty context string;
 * - the signature covers the raw message bytes;
 * - keys come from a 32-byte seed ξ via ML-DSA.KeyGen_internal;
 * - hedged (randomised) and deterministic signatures are both valid on-chain.
 */
export interface Signer {
  /** Library name, for logs and the gate report. */
  readonly name: string;
  keypairFromSeed(seed: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array };
  /**
   * Sign raw message bytes. Hedged by default (FIPS 204's recommendation);
   * `deterministic: true` gives reproducible signatures for test vectors.
   */
  sign(message: Uint8Array, secretKey: Uint8Array, opts?: { deterministic?: boolean }): Uint8Array;
  /** Never throws on malformed input; returns false. */
  verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
}

/** `@noble/post-quantum` (audited, pure TS). The default: smallest browser bundle. */
export const nobleSigner: Signer = {
  name: "@noble/post-quantum",
  keypairFromSeed(seed) {
    const { publicKey, secretKey } = ml_dsa87.keygen(seed);
    return { publicKey, secretKey };
  },
  sign(message, secretKey, opts) {
    return ml_dsa87.sign(message, secretKey, opts?.deterministic ? { extraEntropy: false } : undefined);
  },
  verify(signature, message, publicKey) {
    try {
      return ml_dsa87.verify(signature, message, publicKey);
    } catch {
      return false;
    }
  },
};

let active: Signer = nobleSigner;

/** The signer every helper in this package uses (keys.ts, keyfile.ts). */
export function getSigner(): Signer {
  return active;
}

/** Swap the backend, e.g. `setSigner(qoresignSigner)` from `@forrel/core/signers/qoresign`. */
export function setSigner(signer: Signer): void {
  active = signer;
}
