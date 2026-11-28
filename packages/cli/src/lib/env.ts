import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  DIANA_CHAIN_ID,
  DIANA_EXPLORER_URL,
  DIANA_RPC_URL,
  RegistryError,
  forrelRegistryAbi,
  isRegistryErrorCode,
  type Hex,
} from "@forrel/core";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const dianaChain = defineChain({
  id: DIANA_CHAIN_ID,
  name: "QoreChain Diana",
  nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 },
  rpcUrls: { default: { http: [DIANA_RPC_URL] } },
  blockExplorers: { default: { name: "QoreChain Explorer", url: DIANA_EXPLORER_URL } },
});

export function resolveRpcUrl(flag?: string): string {
  return flag?.trim() || process.env.FORREL_RPC?.trim() || DIANA_RPC_URL;
}

/**
 * Resolve the deployed ForrelRegistry address from `--registry`, `FORREL_REGISTRY`,
 * or `deployments/diana.json` walking up from the current directory.
 */
export function resolveRegistryAddress(flag?: string): Hex {
  const raw = flag?.trim() || process.env.FORREL_REGISTRY?.trim();
  if (raw) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
      throw new Error(`Invalid registry address: ${raw}`);
    }
    return raw as Hex;
  }

  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "deployments", "diana.json");
    if (existsSync(candidate)) {
      const parsed = JSON.parse(readFileSync(candidate, "utf8")) as { address?: string };
      if (parsed.address && /^0x[0-9a-fA-F]{40}$/.test(parsed.address)) {
        return parsed.address as Hex;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    "Registry address not configured. Pass --registry <0x…> or set FORREL_REGISTRY.",
  );
}

export function resolveSubmitterKey(flag?: string): Hex {
  const raw = flag?.trim() || process.env.FORREL_SUBMITTER_KEY?.trim();
  if (!raw || !/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      "Missing or invalid submitter key. Set FORREL_SUBMITTER_KEY (0x + 64 hex chars) for an account with an open EVM window.",
    );
  }
  return raw as Hex;
}

export function createDianaPublicClient(rpcUrl: string): PublicClient {
  return createPublicClient({
    chain: dianaChain,
    transport: http(rpcUrl, { retryCount: 3, timeout: 20_000 }),
  }) as PublicClient;
}

export function createDianaWalletClient(privateKey: Hex, rpcUrl: string): WalletClient {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: dianaChain,
    transport: http(rpcUrl, { retryCount: 3, timeout: 20_000 }),
  });
}

export function decodeContractError(err: unknown): Error {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && isRegistryErrorCode(name)) {
        return new RegistryError(name);
      }
    }
    return new Error(err.shortMessage || err.message);
  }
  return err instanceof Error ? err : new Error(String(err));
}

export async function simulateAndSend(
  publicClient: PublicClient,
  walletClient: WalletClient,
  registry: Hex,
  functionName: string,
  args: readonly unknown[],
): Promise<{ txHash: Hex; blockNumber: bigint }> {
  const account = walletClient.account;
  if (!account) throw new Error("Wallet client has no account.");
  try {
    const { request } = await publicClient.simulateContract({
      address: registry,
      abi: forrelRegistryAbi,
      functionName,
      args,
      account,
    } as never);
    const txHash = await walletClient.writeContract(request as never);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new Error(`Transaction ${txHash} reverted on-chain.`);
    }
    return { txHash, blockNumber: receipt.blockNumber };
  } catch (err) {
    throw decodeContractError(err);
  }
}

export function explorerTxUrl(txHash: Hex): string {
  return `${DIANA_EXPLORER_URL}/tx/${txHash}`;
}
