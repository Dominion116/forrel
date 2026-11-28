import { sha3_256 } from "@noble/hashes/sha3";

import { toHex } from "./encoding";
import type { Hex } from "./types";

/**
 * SHA3-256 (FIPS 202) artifact fingerprints. Streaming, so a 2 GB firmware image never has to
 * fit in memory: the browser worker feeds `File.stream()` chunks, the CLI feeds `fs` streams.
 */

export interface ArtifactHasher {
  update(chunk: Uint8Array): ArtifactHasher;
  /** Finish and return the `0x…` digest. The hasher can't be reused afterwards. */
  digest(): Hex;
}

export function createArtifactHasher(): ArtifactHasher {
  const h = sha3_256.create();
  const api: ArtifactHasher = {
    update(chunk) {
      h.update(chunk);
      return api;
    },
    digest() {
      return toHex(h.digest());
    },
  };
  return api;
}

/** SHA3-256 of bytes already in memory. */
export function hashBytes(bytes: Uint8Array): Hex {
  return toHex(sha3_256(bytes));
}

/**
 * Hash a stream of chunks: a web `ReadableStream` (from `File.stream()`) or any async iterable
 * (Node `fs.createReadStream`). `onProgress` receives the running byte count.
 */
export async function hashStream(
  source: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
  onProgress?: (bytesDone: number) => void,
): Promise<Hex> {
  const hasher = createArtifactHasher();
  let done = 0;
  const feed = (chunk: Uint8Array) => {
    hasher.update(chunk);
    done += chunk.byteLength;
    onProgress?.(done);
  };
  if ("getReader" in source) {
    const reader = source.getReader();
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      feed(value);
    }
  } else {
    for await (const chunk of source) feed(chunk);
  }
  return hasher.digest();
}
