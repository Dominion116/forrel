/**
 * Streaming SHA3-256 over a File, off the main thread, using @forrel/core's hasher (the same
 * code path as the CLI). The file is read in chunks through `File.stream()`, so memory stays
 * flat for large builds. Nothing is uploaded: the bytes never leave this worker.
 */
import { hashStream } from "@forrel/core";

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
    let nextReport = PROGRESS_EVERY;
    const hash = await hashStream(file.stream(), (done) => {
      if (done >= nextReport) {
        nextReport = done + PROGRESS_EVERY;
        ctx.postMessage({ id, type: "progress", done, total: file.size } satisfies HashResponse);
      }
    });
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
