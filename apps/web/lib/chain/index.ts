import { DIANA_CHAIN_ID, DIANA_RPC_URL, type Hex } from "@forrel/core";
import { createPublicClient, defineChain, http, type PublicClient, type WalletClient } from "viem";

import { CHAIN_MODE, DEPLOYED_REGISTRY, REGISTRY_DEPLOY_BLOCK } from "@/lib/config";

import { LiveChainClient } from "./live-client";
import { MockChainClient } from "./mock-client";
import type { ChainClient } from "./types";

export type { ChainClient } from "./types";
export { MockChainClient } from "./mock-client";
export { LiveChainClient } from "./live-client";
export { SHARED_ARTIFACT_HASH } from "./fixtures";

export const diana = defineChain({
  id: DIANA_CHAIN_ID,
  name: "QoreChain Diana",
  nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 },
  rpcUrls: { default: { http: [DIANA_RPC_URL] } },
});

/** QoreX through wagmi, imported only when a write happens (never during server rendering). */
async function connectedWallet(): Promise<WalletClient> {
  const [{ getWalletClient }, { wagmiConfig }] = await Promise.all([
    import("wagmi/actions"),
    import("@/lib/wallet/wagmi"),
  ]);
  return (await getWalletClient(wagmiConfig, { chainId: DIANA_CHAIN_ID })) as unknown as WalletClient;
}

function createLiveClient(registry: Hex): LiveChainClient {
  const isBrowser = typeof window !== "undefined";
  return new LiveChainClient({
    registry,
    publicClient: createPublicClient({
      chain: diana,
      transport: http(DIANA_RPC_URL, { retryCount: 3, timeout: 20_000 }),
    }) as PublicClient,
    getWalletClient: connectedWallet,
    // The REST API sends no CORS headers: the browser goes through next.config's /lcd-testnet proxy.
    rest: isBrowser ? "/lcd-testnet" : "https://api-testnet.qore.host",
    deployBlock: REGISTRY_DEPLOY_BLOCK ?? undefined,
  });
}

let cachedClient: ChainClient | null = null;

/** Return the active `ChainClient` selected by `NEXT_PUBLIC_CHAIN_MODE`. */
export function getChainClient(): ChainClient {
  if (cachedClient) return cachedClient;
  if (CHAIN_MODE === "live") {
    if (!DEPLOYED_REGISTRY) {
      throw new Error(
        "NEXT_PUBLIC_CHAIN_MODE=live needs NEXT_PUBLIC_REGISTRY_ADDRESS (see deployments/diana.json).",
      );
    }
    cachedClient = createLiveClient(DEPLOYED_REGISTRY);
  } else {
    cachedClient = new MockChainClient();
  }
  return cachedClient;
}
