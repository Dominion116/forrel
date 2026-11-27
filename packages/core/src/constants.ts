import type { Hex, RevokeReasonCode } from "./types.js";

/** QoreChain Diana testnet EVM chain ID. */
export const DIANA_CHAIN_ID = 9800;

/** Public QoreChain Diana testnet EVM JSON-RPC endpoint. */
export const DIANA_RPC_URL = "https://evm-testnet.qore.host";

/** Public QoreChain Diana testnet block explorer base URL. */
export const DIANA_EXPLORER_URL = "https://explorer-testnet.qore.host";

/** Precompile address for `pqcVerify(bytes,bytes,bytes)`. */
export const PQC_VERIFY_ADDRESS: Hex = "0x0000000000000000000000000000000000000a01";

/** Precompile address for `pqcKeyStatus(address)`. */
export const PQC_KEY_STATUS_ADDRESS: Hex = "0x0000000000000000000000000000000000000a02";

/** Expected ML-DSA-87 public key byte length (FIPS 204). */
export const ML_DSA_87_PUBKEY_BYTES = 2592;

/** Expected ML-DSA-87 signature byte length (FIPS 204). */
export const ML_DSA_87_SIGNATURE_BYTES = 4627;

/** Valid project slug pattern (`^[a-z0-9-]{3,40}$`). */
export const SLUG_REGEX = /^[a-z0-9-]{3,40}$/;

/** Domain separation tags for Forrel signed messages. */
export const MESSAGE_DOMAINS = {
  PUBLISH: "FORREL/v1/PUBLISH",
  ROTATE: "FORREL/v1/ROTATE",
  REVOKE: "FORREL/v1/REVOKE",
} as const;

/** Human-readable labels for release revocation reason codes. */
export const REVOKE_REASONS: Record<RevokeReasonCode, string> = {
  0: "Unspecified",
  1: "Key compromised",
  2: "Critical bug",
  3: "Superseded",
};
