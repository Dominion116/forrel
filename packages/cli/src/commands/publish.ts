import { fromBase64, toHex, type Hex, type SignedBundle } from "@forrel/core";

import {
  createDianaPublicClient,
  createDianaWalletClient,
  explorerTxUrl,
  resolveRegistryAddress,
  resolveRpcUrl,
  resolveSubmitterKey,
  simulateAndSend,
} from "../lib/env";
import { readTextFile } from "../lib/io";

export interface PublishOptions {
  rpc?: string;
  registry?: string;
  keyEvm?: string;
  json?: boolean;
}

function parseBundle(raw: string): SignedBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Bundle file is not valid JSON.");
  }
  const b = parsed as Partial<SignedBundle>;
  if (
    !b ||
    b.v !== 1 ||
    typeof b.projectId !== "string" ||
    typeof b.version !== "string" ||
    typeof b.artifactHash !== "string" ||
    typeof b.metaHash !== "string" ||
    typeof b.signature !== "string"
  ) {
    throw new Error("Invalid Forrel bundle format.");
  }
  return b as SignedBundle;
}

export async function runPublish(bundlePath: string, opts: PublishOptions): Promise<void> {
  const bundle = parseBundle(await readTextFile(bundlePath));
  const registry = (opts.registry
    ? resolveRegistryAddress(opts.registry)
    : bundle.registry || resolveRegistryAddress()) as Hex;
  const rpcUrl = resolveRpcUrl(opts.rpc);
  const submitterKey = resolveSubmitterKey(opts.keyEvm);

  const publicClient = createDianaPublicClient(rpcUrl);
  const walletClient = createDianaWalletClient(submitterKey, rpcUrl);

  const signatureHex = toHex(fromBase64(bundle.signature));
  const { txHash, blockNumber } = await simulateAndSend(
    publicClient,
    walletClient,
    registry,
    "publish",
    [bundle.projectId, bundle.version, bundle.artifactHash, bundle.metaHash, signatureHex],
  );

  const url = explorerTxUrl(txHash);
  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          txHash,
          blockNumber: blockNumber.toString(),
          explorerUrl: url,
          slug: bundle.slug,
          version: bundle.version,
          artifactHash: bundle.artifactHash,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Published ${bundle.slug} v${bundle.version}`);
    console.log(`  tx:    ${txHash}`);
    console.log(`  block: ${blockNumber.toString()}`);
    console.log(`  url:   ${url}`);
  }
}
