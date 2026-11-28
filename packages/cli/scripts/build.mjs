import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [path.join(root, "src", "index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(root, "dist", "index.js"),
  external: [
    "commander",
    "viem",
    "@noble/ciphers",
    "@noble/hashes",
    "@noble/post-quantum",
    "@qorechain/qoresign",
  ],
});
