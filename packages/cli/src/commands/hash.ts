import { hashFile } from "../lib/io";

export interface HashOptions {
  json?: boolean;
}

export async function runHash(file: string, opts: HashOptions): Promise<void> {
  const digest = await hashFile(file);
  if (opts.json) {
    console.log(JSON.stringify({ file, algorithm: "sha3-256", hash: digest }, null, 2));
  } else {
    console.log(digest);
  }
}
