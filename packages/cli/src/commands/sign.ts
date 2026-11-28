import {
  DIANA_CHAIN_ID,
  SLUG_REGEX,
  encodePublishMsg,
  forrelRegistryAbi,
  keyFingerprint,
  metaHashOf,
  openKeyfile,
  parseKeyfile,
  projectIdOf,
  signMessage,
  toBase64,
  type Hex,
  type SignedBundle,
} from "@forrel/core";

import {
  createDianaPublicClient,
  decodeContractError,
  resolveRegistryAddress,
  resolveRpcUrl,
} from "../lib/env";
import { hashFile, readTextFile, writeJsonFile } from "../lib/io";
import { readPassphrase } from "../lib/prompt";

export interface SignOptions {
  project: string;
  version: string;
  key: string;
  notes?: string;
  seq?: string;
  registry?: string;
  rpc?: string;
  out?: string;
  force?: boolean;
  json?: boolean;
}

export async function runSign(file: string, opts: SignOptions): Promise<void> {
  if (!SLUG_REGEX.test(opts.project)) {
    throw new Error(`Invalid project slug "${opts.project}" (expected ^[a-z0-9-]{3,40}$).`);
  }
  if (!opts.version || opts.version.length > 64) {
    throw new Error("Version must be 1–64 characters.");
  }

  const registry = resolveRegistryAddress(opts.registry);
  const projectId = projectIdOf(opts.project);

  // Offline-capable: only query the chain for `nextSeq` if `--seq` was not provided.
  let seq: bigint;
  if (opts.seq !== undefined) {
    if (!/^\d+$/.test(opts.seq) || BigInt(opts.seq) < 1n) {
      throw new Error(`Invalid --seq "${opts.seq}" (must be a positive integer).`);
    }
    seq = BigInt(opts.seq);
  } else {
    const client = createDianaPublicClient(resolveRpcUrl(opts.rpc));
    try {
      const view = (await client.readContract({
        address: registry,
        abi: forrelRegistryAbi,
        functionName: "getProjectBySlug",
        args: [opts.project],
      })) as { nextSeq: bigint };
      seq = view.nextSeq;
    } catch (err) {
      throw decodeContractError(err);
    }
  }

  const [artifactHash, keyfileRaw, notesText] = await Promise.all([
    hashFile(file),
    readTextFile(opts.key),
    opts.notes ? readTextFile(opts.notes) : Promise.resolve(undefined),
  ]);

  const keyfile = parseKeyfile(keyfileRaw);
  const passphrase = await readPassphrase({ label: "Signing keyfile passphrase: " });
  const pair = await openKeyfile(keyfile, passphrase);

  try {
    const metaHash = metaHashOf(notesText);
    const encoded = encodePublishMsg({
      chainId: DIANA_CHAIN_ID,
      registry,
      projectId,
      seq,
      version: opts.version,
      artifactHash,
      metaHash,
    });
    const signature = signMessage(encoded.bytes, pair.secretKey);
    const fingerprint = keyFingerprint(pair.publicKey);

    const bundle: SignedBundle = {
      v: 1,
      chainId: DIANA_CHAIN_ID,
      registry,
      projectId,
      slug: opts.project,
      seq: Number(seq),
      version: opts.version,
      artifactHash,
      metaHash,
      ...(notesText !== undefined ? { notes: notesText } : {}),
      keyFingerprint: fingerprint as Hex,
      signature: toBase64(signature),
    };

    const outPath = opts.out ?? `${file}.forrel.json`;
    await writeJsonFile(outPath, bundle, { force: opts.force ?? true });

    if (opts.json) {
      console.log(JSON.stringify({ out: outPath, bundle }, null, 2));
    } else {
      console.log(`Signed bundle written to: ${outPath}`);
      console.log(`  project:      ${bundle.slug} (seq ${bundle.seq})`);
      console.log(`  version:      ${bundle.version}`);
      console.log(`  artifactHash: ${bundle.artifactHash}`);
      console.log(`  key:          ${bundle.keyFingerprint}`);
    }
  } finally {
    pair.seed.fill(0);
    pair.secretKey.fill(0);
  }
}
