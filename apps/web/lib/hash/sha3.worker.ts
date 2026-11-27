/**
 * Streaming SHA3-256 over a File, off the main thread.
 * The file is read in chunks through `File.stream()`, so memory stays flat for large builds.
 * Nothing is uploaded: the bytes never leave this worker.
 */
import { sha3_256 } from "@noble/hashes/sha3";
import { bytesToHex } from "@noble/hashes/utils";

export type HashRequest = { id: number; file: File };
export type HashResponse =
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "done"; hash: `0x${string}`; ms: number }
  | { id: number; type: "error"; message: string };

// Typed narrowly instead of pulling in lib "webworker", which clashes with lib "dom".
const ctx = self as unknown as {
  postMessage(message: HashResponse): void;
  onmessage: ((event: MessageEvent<HashRequest>) => void) | null;
};
const PROGRESS_EVERY = 4 * 1024 * 1024;

ctx.onmessage = async (event: MessageEvent<HashRequest>) => {
  const { id, file } = event.data;
  const started = performance.now();
  try {
    const hasher = sha3_256.create();
    const reader = file.stream().getReader();
    let done = 0;
    let nextReport = PROGRESS_EVERY;
    for (;;) {
      const { value, done: finished } = await reader.read();
      if (finished) break;
      hasher.update(value);
      done += value.byteLength;
      if (done >= nextReport) {
        nextReport = done + PROGRESS_EVERY;
        ctx.postMessage({ id, type: "progress", done, total: file.size } satisfies HashResponse);
      }
    }
    const hash = `0x${bytesToHex(hasher.digest())}` as const;
    ctx.postMessage({
      id,
      type: "done",
      hash,
      ms: Math.round(performance.now() - started),
    } satisfies HashResponse);
  } catch (err) {
    ctx.postMessage({
      id,
      type: "error",
      message: err instanceof Error ? err.message : "Could not read the file.",
    } satisfies HashResponse);
  }
};
