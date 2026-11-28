import {
  DIANA_CHAIN_ID,
  createKeyfile,
  encodeRotateMsg,
  forrelRegistryAbi,
  generateSeed,
  keyFingerprint,
  keypairFromSeed,
  openKeyfile,
  parseKeyfile,
  signMessage,
  toHex,
  type Hex,
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
import { readTextFile, writeJsonFile } from "../lib/io";
import { readPassphrase } from "../lib/prompt";

export interface RotateOptions {
  project: string;
  key: string;
  out: string;
  recovery?: boolean;
  rpc?: string;
  registry?: string;
  keyEvm?: string;
  force?: boolean;
  json?: boolean;
}

export async function runRotate(opts: RotateOptions): Promise<void> {
  const registry = resolveRegistryAddress(opts.registry);
  const rpcUrl = resolveRpcUrl(opts.rpc);
  const submitterKey = resolveSubmitterKey(opts.keyEvm);

  const publicClient = createDianaPublicClient(rpcUrl);
  const walletClient = createDianaWalletClient(submitterKey, rpcUrl);

  let projectView: { projectId: Hex; keyEpoch: number };
  try {
    projectView = (await publicClient.readContract({
      address: registry,
      abi: forrelRegistryAbi,
      functionName: "getProjectBySlug",
      args: [opts.project],
    })) as { projectId: Hex; keyEpoch: number };
  } catch (err) {
    throw decodeContractError(err);
  }

  const authorityFile = parseKeyfile(await readTextFile(opts.key));
  const authorityPass = await readPassphrase({
    label: opts.recovery ? "Recovery keyfile passphrase: " : "Current signing keyfile passphrase: ",
  });
  const authorityPair = await openKeyfile(authorityFile, authorityPass);

  const newPass = await readPassphrase({
    envVar: "FORREL_NEW_PASSPHRASE",
    label: "New signing keyfile passphrase: ",
    confirm: true,
  });
  const newSeed = generateSeed();
  const newPair = keypairFromSeed(newSeed);

  try {
    const newPubkeyHex = toHex(newPair.publicKey);
    const viaRecovery = Boolean(opts.recovery);
    const encoded = encodeRotateMsg({
      chainId: DIANA_CHAIN_ID,
      registry,
      projectId: projectView.projectId,
      keyEpoch: Number(projectView.keyEpoch),
      newPubkey: newPubkeyHex,
      viaRecovery,
    });
    const sig = signMessage(encoded.bytes, authorityPair.secretKey);
    const newKeyfile = await createKeyfile(newSeed, newPass);
    await writeJsonFile(opts.out, newKeyfile, { force: opts.force });

    const { txHash, blockNumber } = await simulateAndSend(
      publicClient,
      walletClient,
      registry,
      "rotateKey",
      [projectView.projectId, newPubkeyHex, viaRecovery, toHex(sig)],
    );

    const newFingerprint = keyFingerprint(newPair.publicKey);
    const url = explorerTxUrl(txHash);
    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            txHash,
            blockNumber: blockNumber.toString(),
            explorerUrl: url,
            newKeyfile: opts.out,
            newFingerprint,
            viaRecovery,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(`Rotated signing key for ${opts.project} (epoch ${Number(projectView.keyEpoch) + 1})`);
      console.log(`  new keyfile: ${opts.out}`);
      console.log(`  fingerprint: ${newFingerprint}`);
      console.log(`  tx:          ${txHash}`);
      console.log(`  url:         ${url}`);
    }
  } finally {
    authorityPair.seed.fill(0);
    authorityPair.secretKey.fill(0);
    newSeed.fill(0);
    newPair.secretKey.fill(0);
  }
}
