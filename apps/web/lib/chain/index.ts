import { LiveChainClient } from "./live-client";
import { MockChainClient } from "./mock-client";
import type { ChainClient } from "./types";

export type { ChainClient } from "./types";
export { MockChainClient } from "./mock-client";
export { LiveChainClient } from "./live-client";
export { SHARED_ARTIFACT_HASH } from "./fixtures";

let cachedClient: ChainClient | null = null;

/** Return the active `ChainClient` selected by `NEXT_PUBLIC_CHAIN_MODE`. */
export function getChainClient(): ChainClient {
  if (cachedClient) {
    return cachedClient;
  }
  const mode = process.env.NEXT_PUBLIC_CHAIN_MODE === "live" ? "live" : "mock";
  cachedClient = mode === "live" ? new LiveChainClient() : new MockChainClient();
  return cachedClient;
}
