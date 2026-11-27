"use client";

import { REGISTRY_ERRORS, isRegistryError, type Hex, type TxResult } from "@forrel/core";
import { useCallback, useState } from "react";

import { useInvalidateRegistry } from "@/lib/chain/hooks";
import { mockDelay } from "@/lib/wallet/use-wallet";

export type TxState =
  | { phase: "idle" }
  /** Waiting for the user to approve in QoreX. */
  | { phase: "confirming" }
  | { phase: "pending"; txHash?: Hex }
  | { phase: "confirmed"; txHash: Hex; blockNumber?: bigint }
  | { phase: "failed"; code: string | null; message: string };

/** Turn any thrown error into a TxStatus failure with a decoded contract error when possible. */
export function decodeTxError(err: unknown): { code: string | null; message: string } {
  if (isRegistryError(err)) return { code: err.code, message: REGISTRY_ERRORS[err.code] };
  const msg = err instanceof Error ? err.message : String(err);
  if (/user rejected|denied/i.test(msg)) return { code: "UserRejected", message: "You rejected the request in your wallet." };
  for (const code of Object.keys(REGISTRY_ERRORS) as (keyof typeof REGISTRY_ERRORS)[]) {
    if (msg.includes(code)) return { code, message: REGISTRY_ERRORS[code] };
  }
  return { code: null, message: msg || "The transaction failed." };
}

/**
 * Run one registry write with visible states: confirming → pending → confirmed / failed.
 * In mock mode short delays stand in for the wallet prompt and block time.
 */
export function useTx() {
  const [state, setState] = useState<TxState>({ phase: "idle" });
  const invalidate = useInvalidateRegistry();

  const run = useCallback(
    async (send: () => Promise<TxResult>): Promise<TxResult | null> => {
      setState({ phase: "confirming" });
      try {
        await mockDelay(700);
        setState({ phase: "pending" });
        await mockDelay(1100);
        const res = await send();
        setState({ phase: "confirmed", txHash: res.txHash, blockNumber: res.blockNumber });
        await invalidate();
        return res;
      } catch (err) {
        setState({ phase: "failed", ...decodeTxError(err) });
        return null;
      }
    },
    [invalidate],
  );

  const reset = useCallback(() => setState({ phase: "idle" }), []);
  return { state, run, reset };
}
