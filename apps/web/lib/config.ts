import { DIANA_CHAIN_ID, DIANA_EXPLORER_URL, type Hex } from "@forrel/core";

import { MOCK_REGISTRY } from "@/lib/chain/fixtures";

/** App-wide settings read from public env vars. */

export const CHAIN_MODE: "mock" | "live" = process.env.NEXT_PUBLIC_CHAIN_MODE === "live" ? "live" : "mock";

/** Deployed registry, or `null` before Phase 3 deploys it. */
export const DEPLOYED_REGISTRY: Hex | null =
  (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS?.trim() as Hex | undefined) || null;

/**
 * The registry address bound into every signed message.
 * Mock mode always uses the mock address so demo signatures stay valid.
 */
export const REGISTRY_ADDRESS: Hex = CHAIN_MODE === "mock" ? MOCK_REGISTRY : (DEPLOYED_REGISTRY ?? MOCK_REGISTRY);

export const CHAIN_ID = DIANA_CHAIN_ID;

export const GITHUB_URL = "https://github.com/Dominion116/forrel";
export const VECTORS_URL = `${GITHUB_URL}/tree/main/packages/core/vectors`;

export const txUrl = (hash: string) => `${DIANA_EXPLORER_URL}/tx/${hash}`;
export const addressUrl = (addr: string) => `${DIANA_EXPLORER_URL}/address/${addr}`;

/** Rough gas per action (PRD §12.4), shown before submitting. */
export const GAS_ESTIMATES = {
  registerProject: 1_400_000n,
  publish: 1_300_000n,
  rotateKey: 800_000n,
  revoke: 150_000n,
} as const;
