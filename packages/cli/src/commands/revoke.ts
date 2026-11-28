import {
  DIANA_CHAIN_ID,
  REVOKE_REASONS,
  encodeRevokeMsg,
  forrelRegistryAbi,
  openKeyfile,
  parseKeyfile,
  projectIdOf,
  signMessage,
  toHex,
  versionHashOf,
  type Hex,
  type RevokeReasonCode,
} from "@forrel/core";

import {
  createDianaPublicClient,
  createDianaWalletClient,
  decodeContractError,
  explorerTxUrl,
  resolveRegistryAddress,
  resolveRpcUrl,
  resolveSubmitterKey,
  simulateAndSend,
} from "../lib/env";
import { readTextFile } from "../lib/io";
import { readPassphrase } from "../lib/prompt";

export interface RevokeOptions {
  project: string;
  version: string;
  reason: string;
  key: string;
  rpc?: string;
  registry?: string;
  keyEvm?: string;
  json?: boolean;
}

export async function runRevoke(opts: RevokeOptions): Promise<void> {
  const reasonNum = Number(opts.reason);
  if (!Number.isInteger(reasonNum) || reasonNum < 0 || reasonNum > 3) {
    throw new Error("Invalid --reason. Must be 0 (unspecified), 1 (compromised), 2 (critical bug), or 3 (superseded).");
  }
  const reason = reasonNum as RevokeReasonCode;

  const registry = resolveRegistryAddress(opts.registry);
  const rpcUrl = resolveRpcUrl(opts.rpc);
  const submitterKey = resolveSubmitterKey(opts.keyEvm);

  const publicClient = createDianaPublicClient(rpcUrl);
  const walletClient = createDianaWalletClient(submitterKey, rpcUrl);

  const projectId = projectIdOf(opts.project);
  let idPlusOne: bigint;
  try {
    idPlusOne = (await publicClient.readContract({
      address: registry,
      abi: forrelRegistryAbi,
      functionName: "releaseIdPlusOne",
      args: [projectId, versionHashOf(opts.version)],
    })) as bigint;
  } catch (err) {
    throw decodeContractError(err);
  }

  if (idPlusOne === 0n) {
    throw new Error(`Release ${opts.project} v${opts.version} not found.`);
  }
  const releaseId = idPlusOne - 1n;

  const keyfile = parseKeyfile(await readTextFile(opts.key));
  const passphrase = await readPassphrase({ label: "Signing keyfile passphrase: " });
  const pair = await openKeyfile(keyfile, passphrase);

  try {
    const encoded = encodeRevokeMsg({
      chainId: DIANA_CHAIN_ID,
      registry,
      projectId,
      releaseId,
      reason,
    });
    const sig = signMessage(encoded.bytes, pair.secretKey);

    const { txHash, blockNumber } = await simulateAndSend(
      publicClient,
      walletClient,
      registry,
      "revoke",
      [releaseId, reason, toHex(sig)],
    );

    const url = explorerTxUrl(txHash);
    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            txHash,
            blockNumber: blockNumber.toString(),
            explorerUrl: url,
            project: opts.project,
            version: opts.version,
            releaseId: releaseId.toString(),
            reason: REVOKE_REASONS[reason],
          },
          null,
          2,
        ),
      );
    } else {
      console.log(`Revoked ${opts.project} v${opts.version} (${REVOKE_REASONS[reason]})`);
      console.log(`  tx:  ${txHash}`);
      console.log(`  url: ${url}`);
    }
  } finally {
    pair.seed.fill(0);
    pair.secretKey.fill(0);
  }
}
