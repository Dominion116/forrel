import { gcm } from "@noble/ciphers/aes.js";
import { scryptAsync } from "@noble/hashes/scrypt";
import { randomBytes } from "@noble/hashes/utils";

import { fromBase64, toBase64, utf8ToBytes } from "./encoding";
import { keypairFromSeed, type KeyPair } from "./keys";
import type { Keyfile } from "./types";

/**
 * Encrypted keyfile (`*.forrel-key.json`, PRD §14):
 * scrypt(N=2^17, r=8, p=1) → 32-byte key → AES-256-GCM over the 32-byte seed.
 * The public key is stored in clear so tools can show the fingerprint without the passphrase.
 */

export const KEYFILE_SCRYPT = { N: 131072, r: 8, p: 1 } as const;
const AAD = utf8ToBytes("forrel-keyfile/v1");

export class WrongPassphraseError extends Error {
  constructor() {
    super("Wrong passphrase, or the keyfile was modified.");
    this.name = "WrongPassphraseError";
  }
}

export class InvalidKeyfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidKeyfileError";
  }
}

type Progress = (fraction: number) => void;

export async function createKeyfile(
  seed: Uint8Array,
  passphrase: string,
  opts: { onProgress?: Progress; N?: number } = {},
): Promise<Keyfile> {
  const { publicKey } = keypairFromSeed(seed);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const N = opts.N ?? KEYFILE_SCRYPT.N;
  const key = await scryptAsync(utf8ToBytes(passphrase.normalize("NFKC")), salt, {
    N,
    r: KEYFILE_SCRYPT.r,
    p: KEYFILE_SCRYPT.p,
    dkLen: 32,
    onProgress: opts.onProgress,
  });
  const ct = gcm(key, iv, AAD).encrypt(seed);
  key.fill(0);
  return {
    v: 1,
    alg: "ML-DSA-87",
    publicKey: toBase64(publicKey),
    crypto: {
      kdf: "scrypt",
      N,
      r: KEYFILE_SCRYPT.r,
      p: KEYFILE_SCRYPT.p,
      salt: toBase64(salt),
      cipher: "aes-256-gcm",
      iv: toBase64(iv),
      ct: toBase64(ct),
    },
  };
}

/** Parse untrusted JSON into a Keyfile, with readable errors. */
export function parseKeyfile(json: string): Keyfile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new InvalidKeyfileError("This file is not JSON. Choose a .forrel-key.json file.");
  }
  const k = data as Partial<Keyfile>;
  if (
    !k ||
    k.v !== 1 ||
    k.alg !== "ML-DSA-87" ||
    typeof k.publicKey !== "string" ||
    !k.crypto ||
    k.crypto.kdf !== "scrypt" ||
    k.crypto.cipher !== "aes-256-gcm"
  ) {
    throw new InvalidKeyfileError("This is not a Forrel ML-DSA-87 keyfile.");
  }
  return k as Keyfile;
}

/** Public key bytes from a keyfile, no passphrase needed. */
export function keyfilePublicKey(keyfile: Keyfile): Uint8Array {
  return fromBase64(keyfile.publicKey);
}

/**
 * Decrypt a keyfile in memory. The caller should `.fill(0)` `seed` and `secretKey`
 * when done with them.
 */
export async function openKeyfile(
  keyfile: Keyfile,
  passphrase: string,
  opts: { onProgress?: Progress } = {},
): Promise<KeyPair> {
  const { N, r, p } = keyfile.crypto;
  const key = await scryptAsync(utf8ToBytes(passphrase.normalize("NFKC")), fromBase64(keyfile.crypto.salt), {
    N,
    r,
    p,
    dkLen: 32,
    onProgress: opts.onProgress,
  });
  let seed: Uint8Array;
  try {
    seed = gcm(key, fromBase64(keyfile.crypto.iv), AAD).decrypt(fromBase64(keyfile.crypto.ct));
  } catch {
    throw new WrongPassphraseError();
  } finally {
    key.fill(0);
  }
  const pair = keypairFromSeed(seed);
  const stored = keyfilePublicKey(keyfile);
  if (stored.length !== pair.publicKey.length || stored.some((b, i) => b !== pair.publicKey[i])) {
    throw new InvalidKeyfileError("The keyfile's public key does not match its encrypted seed.");
  }
  return pair;
}
