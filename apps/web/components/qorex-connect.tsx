"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { evmWindowStatus } from "@qorechain/evm";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { Badge } from "@/components/ui/badge";
import { qorechainTestnet } from "@/lib/wallet/wagmi";

/** QoreX connection control plus Diana testnet window readout for Phase 0 risk check. */
export function QoreXConnect() {
  const { address, chainId, isConnected } = useAccount();
  const isDiana = chainId === qorechainTestnet.id;

  const { data: windowInfo } = useQuery({
    queryKey: ["evm-window", chainId, address],
    queryFn: () =>
      evmWindowStatus({
        rest: isDiana ? "/lcd-testnet" : "/lcd-mainnet",
        address: address!,
      }),
    enabled: Boolean(isConnected && address && chainId),
    refetchInterval: 15_000,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">Diana testnet (9800)</Badge>
      {isConnected && windowInfo && (
        <Badge variant={windowInfo.live ? "verified" : "warning"}>
          {windowInfo.found
            ? windowInfo.live
              ? `Window live (${windowInfo.remainingTxs.toString()} txs left)`
              : "Window exhausted"
            : "No EVM window"}
        </Badge>
      )}
      <ConnectButton showBalance={false} chainStatus="icon" />
    </div>
  );
}
