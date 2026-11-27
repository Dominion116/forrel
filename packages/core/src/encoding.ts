import { bytesToHex as nobleBytesToHex, concatBytes, hexToBytes as nobleHexToBytes, utf8ToBytes } from "@noble/hashes/utils";

import type { Hex } from "./types";

export { concatBytes, utf8ToBytes };

/** Bytes → `0x…` lowercase hex. */
export function toHex(bytes: Uint8Array): Hex {
  return `0x${nobleBytesToHex(bytes)}` as Hex;
}

/** `0x…` (or bare) hex → bytes. Throws on odd length or non-hex. */
export function fromHex(hex: string): Uint8Array {
  return nobleHexToBytes(hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex);
}

/** Big-endian unsigned integer of `size` bytes (uint8 … uint256). */
export function uintBytes(value: bigint | number, size: number): Uint8Array {
  let v = BigInt(value);
  if (v < 0n) throw new RangeError("uintBytes: negative value");
  const out = new Uint8Array(size);
  for (let i = size - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new RangeError(`uintBytes: value does not fit in ${size} bytes`);
  return out;
}

/** Exactly-`size` bytes from hex, or a clear error. */
export function fixedBytes(hex: string, size: number, label: string): Uint8Array {
  const b = fromHex(hex);
  if (b.length !== size) throw new RangeError(`${label} must be ${size} bytes, got ${b.length}`);
  return b;
}

/** Standard base64 (with padding), browser and Node. */
export function toBase64(bytes: Uint8Array): string {
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64.trim());
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
