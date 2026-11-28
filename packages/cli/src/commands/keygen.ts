import { createKeyfile, generateSeed, keyFingerprint, keypairFromSeed } from "@forrel/core";

import { writeJsonFile } from "../lib/io";
import { readPassphrase } from "../lib/prompt";

export interface KeygenOptions {
  out: string;
  force?: boolean;
  json?: boolean;
}

export async function runKeygen(opts: KeygenOptions): Promise<void> {
  const passphrase = await readPassphrase({
    label: "New keyfile passphrase: ",
    confirm: true,
  });

  const seed = generateSeed();
  const pair = keypairFromSeed(seed);
  try {
    const keyfile = await createKeyfile(seed, passphrase);
    const fingerprint = keyFingerprint(pair.publicKey);
    await writeJsonFile(opts.out, keyfile, { force: opts.force });

    if (opts.json) {
      console.log(JSON.stringify({ out: opts.out, alg: keyfile.alg, fingerprint }, null, 2));
    } else {
      console.log(`Generated ML-DSA-87 keyfile: ${opts.out}`);
      console.log(`Fingerprint: ${fingerprint}`);
    }
  } finally {
    seed.fill(0);
    pair.secretKey.fill(0);
  }
}
