/** Hex-encoded byte string prefixed with `0x`. */
export type Hex = `0x${string}`;

/** Pagination parameters for storage view queries. */
export interface Page {
  offset: number;
  limit: number;
}

/** Revocation reason codes stored on-chain. */
export type RevokeReasonCode = 0 | 1 | 2 | 3;

/** Summary statistics across the Forrel registry. */
export interface RegistryStats {
  projectCount: number;
  releaseCount: number;
  revokedCount: number;
  latestBlock: bigint;
  lastPublishedAt: number | null;
}

/** Lightweight project entry returned by paginated project listings. */
export interface ProjectSummary {
  projectId: Hex;
  slug: string;
  owner: Hex;
  releaseCount: number;
  latestVersion: string | null;
  keyEpoch: number;
  createdAt: number;
}

/** Historical key rotation record for a project. */
export interface KeyRotationRecord {
  epoch: number;
  rotatedAt: number;
  viaRecovery: boolean;
  signingKeyFingerprint: Hex;
  /** From the KeyRotated event; absent once testnet logs are pruned. */
  txHash?: Hex;
}

/** Full project record including key fingerprints and rotation history. */
export interface Project extends ProjectSummary {
  signingKeyPtr: Hex;
  recoveryKeyPtr: Hex;
  signingKeyFingerprint: Hex;
  recoveryKeyFingerprint: Hex;
  signingKeyHex: Hex;
  recoveryKeyHex: Hex;
  nextSeq: bigint;
  rotations: KeyRotationRecord[];
}

/** On-chain release record with signature metadata. */
export interface Release {
  releaseId: bigint;
  projectId: Hex;
  slug: string;
  seq: bigint;
  keyEpoch: number;
  publishedAt: number;
  version: string;
  versionHash: Hex;
  artifactHash: Hex;
  metaHash: Hex;
  notes?: string;
  signaturePtr: Hex;
  signingKeyPtr: Hex;
  signingKeyFingerprint: Hex;
  signatureHex?: Hex;
  signingKeyHex?: Hex;
  /** From the ReleasePublished event; absent once testnet logs are pruned. */
  publishTxHash?: Hex;
  revoked: boolean;
  revokeReason?: RevokeReasonCode;
  revokedAt?: number;
  revokeTxHash?: Hex;
}

/** Offline-signable release bundle format (`*.forrel.json`). */
export interface SignedBundle {
  v: 1;
  chainId: number;
  registry: Hex;
  projectId: Hex;
  slug: string;
  seq: number;
  version: string;
  artifactHash: Hex;
  metaHash: Hex;
  notes?: string;
  keyFingerprint: Hex;
  signature: string;
}

/** Encrypted ML-DSA-87 keyfile format (`*.forrel-key.json`). */
export interface Keyfile {
  v: 1;
  alg: "ML-DSA-87";
  publicKey: string;
  crypto: {
    kdf: "scrypt";
    N: number;
    r: number;
    p: number;
    salt: string;
    cipher: "aes-256-gcm";
    iv: string;
    ct: string;
  };
}

/** EVM authorisation window status for a QoreChain account. */
export interface EvmWindowStatus {
  found: boolean;
  live: boolean;
  remainingBlocks: bigint;
  remainingTxs: bigint;
  /** In uqor (6 decimals). */
  remainingValue: bigint;
  /** Contracts this window may call; empty means any. The registry must be allowed. */
  allowedTargets?: Hex[];
  /** A native-only window admits plain transfers only, never contract calls. */
  nativeOnly?: boolean;
}

/** Result from the `pqcKeyStatus(address)` precompile. */
export interface PqcKeyStatus {
  registered: boolean;
  algorithmId: number;
  possessionProven: boolean;
  pubkey?: Hex;
}

/** Input to register a new Forrel project on-chain. */
export interface RegisterInput {
  slug: string;
  signingPubkey: Hex;
  recoveryPubkey: Hex;
}

/** Input to rotate a project's signing key on-chain. */
export interface RotateInput {
  projectId: Hex;
  newPubkey: Hex;
  viaRecovery: boolean;
  signature: Hex;
}

/** Input to revoke an existing release on-chain. */
export interface RevokeInput {
  releaseId: bigint;
  reason: RevokeReasonCode;
  signature: Hex;
}

/** Result returned by a state-changing registry transaction. */
export interface TxResult {
  txHash: Hex;
  blockNumber?: bigint;
}

/** Possible verifier verdicts for an artifact or hash lookup. */
export type VerdictKind = "verified" | "revoked" | "multiple" | "unknown" | "error";
