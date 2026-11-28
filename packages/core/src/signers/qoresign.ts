import { pqKeyFromSeed, pqSign, pqVerify } from "@qorechain/qoresign";

import type { Signer } from "../signer";

/**
 * `@qorechain/qoresign` (QoreChain's own signing library, which wraps `@qorechain/pqc` and,
 * underneath, `@noble/post-quantum`). Kept as a separate entry point so the browser bundle
 * doesn't pull in its HD-wallet and hybrid-transaction code unless asked:
 *
 *   import { qoresignSigner } from "@forrel/core/signers/qoresign";
 *   setSigner(qoresignSigner);
 */
export const qoresignSigner: Signer = {
  name: "@qorechain/qoresign",
  keypairFromSeed(seed) {
    const { publicKey, secretKey } = pqKeyFromSeed(seed);
    return { publicKey, secretKey };
  },
  sign(message, secretKey, opts) {
    // qoresign is deterministic by default; hedged unless asked for determinism, like nobleSigner.
    return pqSign(secretKey, message, { hedged: !opts?.deterministic });
  },
  verify(signature, message, publicKey) {
    return pqVerify(publicKey, message, signature);
  },
};
