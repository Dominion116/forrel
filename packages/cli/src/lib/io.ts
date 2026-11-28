import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashStream, type Hex } from "@forrel/core";

/** Stream-hash a local file with SHA3-256 without loading it into memory. */
export async function hashFile(filePath: string): Promise<Hex> {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const stream = createReadStream(filePath);
  return hashStream(stream as unknown as AsyncIterable<Uint8Array>);
}

export async function readTextFile(filePath: string): Promise<string> {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return readFile(filePath, "utf8");
}

export async function writeJsonFile(
  filePath: string,
  value: unknown,
  opts: { force?: boolean } = {},
): Promise<void> {
  if (existsSync(filePath) && !opts.force) {
    throw new Error(`File already exists: ${filePath} (pass --force to overwrite)`);
  }
  await mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
