#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const distEntry = path.join(pkgRoot, "dist", "index.js");

if (existsSync(distEntry)) {
  await import(pathToFileURL(distEntry).href);
} else {
  const srcEntry = path.join(pkgRoot, "src", "index.ts");
  const tsxBin = path.resolve(pkgRoot, "..", "..", "node_modules", "tsx", "dist", "cli.mjs");
  const result = spawnSync(process.execPath, [tsxBin, srcEntry, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}
