"use client";

import { DIANA_CHAIN_ID, type Hex } from "@forrel/core";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useSyncExternalStore } from "react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";

import { CHAIN_MODE } from "@/lib/config";

import {
  getMockWallet,
  getServerMockWallet,
  subscribeMockWallet,
  updateMockWallet,
  type MockScenario,
} from "./mock-wallet";

export interface WalletView {
  mode: "mock" | "live";
  status: "disconnected" | "connected";
  address: Hex | null;
  chainId: number | null;
  onDiana: boolean;
  scenario: MockScenario | null;
  connect: () => void;
  disconnect: () => void;
  switchToDiana: () => void;
}

/**
 * One wallet interface for the whole app.
 * Mock mode: a pretend QoreX wallet (see mock-wallet.ts). Live mode: wagmi + RainbowKit + QoreX.
 */
export function useWallet(): WalletView {
  const mock = useSyncExternalStore(subscribeMockWallet, getMockWallet, getServerMockWallet);
  const account = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  if (CHAIN_MODE === "mock") {
    return {
      mode: "mock",
      status: mock.connected ? "connected" : "disconnected",
      address: mock.connected ? mock.address : null,
      chainId: mock.connected ? mock.chainId : null,
      onDiana: mock.chainId === DIANA_CHAIN_ID,
      scenario: mock.scenario,
      connect: () => updateMockWallet({ connected: true }),
      disconnect: () => updateMockWallet({ connected: false }),
      switchToDiana: () => updateMockWallet({ chainId: DIANA_CHAIN_ID }),
    };
  }

  return {
    mode: "live",
    status: account.isConnected ? "connected" : "disconnected",
    address: (account.address as Hex | undefined) ?? null,
    chainId: account.chainId ?? null,
    onDiana: account.chainId === DIANA_CHAIN_ID,
    scenario: null,
    connect: () => openConnectModal?.(),
    disconnect: () => disconnect(),
    switchToDiana: () => switchChain({ chainId: DIANA_CHAIN_ID }),
  };
}

/** Pretend wallet confirmation + block time, mock mode only, so TxStatus states are visible. */
export function mockDelay(ms: number): Promise<void> {
  return CHAIN_MODE === "mock" ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}
