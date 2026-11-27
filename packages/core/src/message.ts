import { keccak_256, sha3_256 } from "@noble/hashes/sha3";

import { MESSAGE_DOMAINS } from "./constants";
import { concatBytes, fixedBytes, toHex, uintBytes, utf8ToBytes } from "./encoding";
import type { Hex, RevokeReasonCode } from "./types";

/**
 * Forrel signed messages (PRD §12.2), `abi.encodePacked` layout:
 *
 *   PUBLISH = "FORREL/v1/PUBLISH" ‖ uint256 chainId ‖ address registry ‖ bytes32 projectId
 *             ‖ uint64 seq ‖ bytes32 keccak256(version) ‖ bytes32 artifactHash ‖ bytes32 metaHash
 *   ROTATE  = "FORREL/v1/ROTATE"  ‖ uint256 chainId ‖ address registry ‖ bytes32 projectId
 *             ‖ uint32 keyEpoch ‖ bytes32 keccak256(newPubkey) ‖ bool viaRecovery
 *   REVOKE  = "FORREL/v1/REVOKE"  ‖ uint256 chainId ‖ address registry ‖ bytes32 projectId
 *             ‖ uint256 releaseId ‖ uint8 reason
 *
 * The ML-DSA-87 signature covers these raw bytes (FIPS 204 pure, empty context).
 * Each encoder also returns the fields one by one so the UI can show exactly what is signed.
 */

export interface MessageField {
  /** Field name as in the spec, e.g. "seq". */
  name: string;
  /** Solidity packed type, e.g. "uint64". */
  type: string;
  /** Human-readable value (the input, before hashing where relevant). */
  display: string;
  /** The exact bytes this field contributes. */
  bytes: Uint8Array;
}

export interface EncodedMessage {
  fields: MessageField[];
  bytes: Uint8Array;
  hex: Hex;
}

const ZERO32 = new Uint8Array(32);

function finish(fields: MessageField[]): EncodedMessage {
  const bytes = concatBytes(...fields.map((f) => f.bytes));
  return { fields, bytes, hex: toHex(bytes) };
}

function domainField(domain: string): MessageField {
  return { name: "domain", type: "bytes (utf-8)", display: domain, bytes: utf8ToBytes(domain) };
}

function commonFields(chainId: number, registry: Hex, projectId: Hex): MessageField[] {
  return [
    { name: "chainId", type: "uint256", display: String(chainId), bytes: uintBytes(chainId, 32) },
    { name: "registry", type: "address", display: registry, bytes: fixedBytes(registry, 20, "registry") },
    { name: "projectId", type: "bytes32", display: projectId, bytes: fixedBytes(projectId, 32, "projectId") },
  ];
}

/** `projectId = keccak256(bytes(slug))`. */
export function projectIdOf(slug: string): Hex {
  return toHex(keccak_256(utf8ToBytes(slug)));
}

/** `keccak256(bytes(version))`. */
export function versionHashOf(version: string): Hex {
  return toHex(keccak_256(utf8ToBytes(version)));
}

/** SHA3-256 of the release notes, or 32 zero bytes when there are none. */
export function metaHashOf(notes?: string | null): Hex {
  return notes && notes.length > 0 ? toHex(sha3_256(utf8ToBytes(notes))) : toHex(ZERO32);
}

export interface PublishMessageInput {
  chainId: number;
  registry: Hex;
  projectId: Hex;
  seq: bigint | number;
  version: string;
  artifactHash: Hex;
  metaHash: Hex;
}

export function encodePublishMsg(m: PublishMessageInput): EncodedMessage {
  const versionHash = keccak_256(utf8ToBytes(m.version));
  return finish([
    domainField(MESSAGE_DOMAINS.PUBLISH),
    ...commonFields(m.chainId, m.registry, m.projectId),
    { name: "seq", type: "uint64", display: String(m.seq), bytes: uintBytes(m.seq, 8) },
    { name: "versionHash", type: "bytes32", display: `keccak256("${m.version}")`, bytes: versionHash },
    { name: "artifactHash", type: "bytes32", display: m.artifactHash, bytes: fixedBytes(m.artifactHash, 32, "artifactHash") },
    { name: "metaHash", type: "bytes32", display: m.metaHash, bytes: fixedBytes(m.metaHash, 32, "metaHash") },
  ]);
}

export interface RotateMessageInput {
  chainId: number;
  registry: Hex;
  projectId: Hex;
  /** The project's key epoch at the time of signing (before the rotation). */
  keyEpoch: number;
  newPubkey: Hex;
  viaRecovery: boolean;
}

export function encodeRotateMsg(m: RotateMessageInput): EncodedMessage {
  return finish([
    domainField(MESSAGE_DOMAINS.ROTATE),
    ...commonFields(m.chainId, m.registry, m.projectId),
    { name: "keyEpoch", type: "uint32", display: String(m.keyEpoch), bytes: uintBytes(m.keyEpoch, 4) },
    {
      name: "newPubkeyHash",
      type: "bytes32",
      display: "keccak256(newPubkey)",
      bytes: keccak_256(fixedBytes(m.newPubkey, 2592, "newPubkey")),
    },
    { name: "viaRecovery", type: "bool", display: String(m.viaRecovery), bytes: uintBytes(m.viaRecovery ? 1 : 0, 1) },
  ]);
}

export interface RevokeMessageInput {
  chainId: number;
  registry: Hex;
  projectId: Hex;
  releaseId: bigint | number;
  reason: RevokeReasonCode;
}

export function encodeRevokeMsg(m: RevokeMessageInput): EncodedMessage {
  return finish([
    domainField(MESSAGE_DOMAINS.REVOKE),
    ...commonFields(m.chainId, m.registry, m.projectId),
    { name: "releaseId", type: "uint256", display: String(m.releaseId), bytes: uintBytes(m.releaseId, 32) },
    { name: "reason", type: "uint8", display: String(m.reason), bytes: uintBytes(m.reason, 1) },
  ]);
}
