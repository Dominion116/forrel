import { DIANA_CHAIN_ID, type Hex } from "@forrel/core";

import { MOCK_OWNER } from "@/lib/chain/fixtures";

/**
 * A pretend QoreX wallet for mock mode, so every wallet state can be clicked through
 * without an extension. Plain TS store (no React) so the mock registry can read the
 * same scenario. Persisted per tab in sessionStorage.
 */

export type MockScenario =
  /** Everything is set up. */
  | "ready"
  /** No ML-DSA-87 key registered with QoreChain for this account. */
  | "no-pq-key"
  /** Key registered but possession not proven. */
  | "unproven-key"
  /** No EVM authorisation window open. */
  | "no-window"
  /** Window open but the registry is not in allowed_targets. */
  | "window-missing-target"
  /** Window open but out of transactions. */
  | "window-exhausted"
  /** The next transaction reverts (to see TxStatus failures). */
  | "tx-reverts";

export interface MockWalletState {
  connected: boolean;
  address: Hex;
  chainId: number;
  scenario: MockScenario;
}

const KEY = "forrel:mock-wallet";
const DEFAULT: MockWalletState = {
  connected: false,
  address: MOCK_OWNER,
  chainId: DIANA_CHAIN_ID,
  scenario: "ready",
};

let state: MockWalletState = DEFAULT;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT, ...(JSON.parse(raw) as Partial<MockWalletState>) };
  } catch {
    /* storage unavailable: keep defaults */
  }
}

function emit() {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function getMockWallet(): MockWalletState {
  hydrate();
  return state;
}

export function getServerMockWallet(): MockWalletState {
  return DEFAULT;
}

export function subscribeMockWallet(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateMockWallet(patch: Partial<MockWalletState>) {
  hydrate();
  state = { ...state, ...patch };
  emit();
}

export const MOCK_SCENARIOS: { id: MockScenario; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "no-pq-key", label: "No PQ key" },
  { id: "unproven-key", label: "Key not proven" },
  { id: "no-window", label: "No EVM window" },
  { id: "window-missing-target", label: "Registry not allowed" },
  { id: "window-exhausted", label: "Window exhausted" },
  { id: "tx-reverts", label: "Tx reverts" },
];
