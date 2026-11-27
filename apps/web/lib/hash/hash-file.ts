"use client";

import type { HashRequest, HashResponse } from "./sha3.worker";

let worker: Worker | null = null;
let nextId = 1;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./sha3.worker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

/**
 * Hash a file with SHA3-256 in a Web Worker.
 * `onProgress` receives (bytesDone, bytesTotal) roughly every 4 MB.
 */
export function hashFile(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{ hash: `0x${string}`; ms: number }> {
  const w = getWorker();
  const id = nextId++;

  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<HashResponse>) => {
      const msg = event.data;
      if (msg.id !== id) return;
      if (msg.type === "progress") {
        onProgress?.(msg.done, msg.total);
        return;
      }
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      if (msg.type === "done") resolve({ hash: msg.hash, ms: msg.ms });
      else reject(new Error(msg.message));
    };
    const onError = (event: ErrorEvent) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      worker?.terminate();
      worker = null;
      reject(new Error(event.message || "The hashing worker failed to start."));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({ id, file } satisfies HashRequest);
  });
}
