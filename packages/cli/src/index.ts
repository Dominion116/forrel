#!/usr/bin/env node
import { Command } from "commander";
import { DIANA_CHAIN_ID, DIANA_RPC_URL } from "@forrel/core";

import { runHash } from "./commands/hash";
import { runKeygen } from "./commands/keygen";
import { runPublish } from "./commands/publish";
import { runRevoke } from "./commands/revoke";
import { runRotate } from "./commands/rotate";
import { runSign } from "./commands/sign";
import { runVerify } from "./commands/verify";

const program = new Command();

program
  .name("forrel")
  .description("Post-quantum release and firmware signing log CLI for QoreChain")
  .version("0.1.0");

program
  .command("info")
  .description("Show target QoreChain network configuration")
  .action(() => {
    console.log(`Target network: QoreChain Diana testnet (chainId ${DIANA_CHAIN_ID})`);
    console.log(`Default RPC:    ${process.env.FORREL_RPC || DIANA_RPC_URL}`);
  });

program
  .command("keygen")
  .description("Generate an ML-DSA-87 keypair and save as an encrypted keyfile (offline)")
  .requiredOption("--out <file>", "Output keyfile path (*.forrel-key.json)")
  .option("--force", "Overwrite existing keyfile")
  .option("--json", "Emit JSON output")
  .action(async (opts) => {
    await runKeygen(opts);
  });

program
  .command("hash <file>")
  .description("Print the SHA3-256 digest of a file (offline)")
  .option("--json", "Emit JSON output")
  .action(async (file, opts) => {
    await runHash(file, opts);
  });

program
  .command("sign <file>")
  .description("Sign a release artifact into a *.forrel.json bundle (offline-capable with --seq)")
  .requiredOption("--project <slug>", "Project slug")
  .requiredOption("--version <v>", "Release version string")
  .requiredOption("--key <keyfile>", "Signing keyfile path")
  .option("--notes <file>", "Optional release notes file (hashed into metaHash)")
  .option("--seq <n>", "Override sequence number (skips online lookup)")
  .option("--registry <addr>", "ForrelRegistry contract address")
  .option("--rpc <url>", "Diana JSON-RPC URL")
  .option("--out <bundle>", "Output bundle path (defaults to <file>.forrel.json)")
  .option("--force", "Overwrite existing bundle file")
  .option("--json", "Emit JSON output")
  .action(async (file, opts) => {
    await runSign(file, opts);
  });

program
  .command("publish <bundle>")
  .description("Submit a signed *.forrel.json bundle to ForrelRegistry")
  .option("--registry <addr>", "ForrelRegistry contract address")
  .option("--rpc <url>", "Diana JSON-RPC URL")
  .option("--key-evm <hex>", "Submitter secp256k1 private key (or FORREL_SUBMITTER_KEY)")
  .option("--json", "Emit JSON output")
  .action(async (bundle, opts) => {
    await runPublish(bundle, opts);
  });

program
  .command("verify <file>")
  .description("Verify a file against ForrelRegistry (exit: 0 verified, 1 unknown, 2 revoked, 3 error)")
  .option("--project <slug>", "Filter matches to a specific project slug")
  .option("--registry <addr>", "ForrelRegistry contract address")
  .option("--rpc <url>", "Diana JSON-RPC URL")
  .option("--no-recheck", "Skip live pqcVerify eth_call recheck")
  .option("--json", "Emit JSON output")
  .action(async (file, opts) => {
    try {
      const code = await runVerify(file, opts);
      process.exitCode = code;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (opts.json) {
        console.log(JSON.stringify({ verdict: "error", exitCode: 3, error: message }, null, 2));
      } else {
        console.error(`ERROR: ${message}`);
      }
      process.exitCode = 3;
    }
  });

program
  .command("rotate")
  .description("Rotate a project's ML-DSA-87 signing key")
  .requiredOption("--project <slug>", "Project slug")
  .requiredOption("--key <authority-keyfile>", "Current signing keyfile (or recovery keyfile with --recovery)")
  .requiredOption("--out <newkey>", "Output path for the new encrypted signing keyfile")
  .option("--recovery", "Authorize rotation with the project's recovery key")
  .option("--registry <addr>", "ForrelRegistry contract address")
  .option("--rpc <url>", "Diana JSON-RPC URL")
  .option("--key-evm <hex>", "Submitter secp256k1 private key (or FORREL_SUBMITTER_KEY)")
  .option("--force", "Overwrite existing --out keyfile")
  .option("--json", "Emit JSON output")
  .action(async (opts) => {
    await runRotate(opts);
  });

program
  .command("revoke")
  .description("Revoke an existing release")
  .requiredOption("--project <slug>", "Project slug")
  .requiredOption("--version <v>", "Release version to revoke")
  .requiredOption("--reason <code>", "Revocation reason: 0=unspecified, 1=compromised, 2=critical bug, 3=superseded")
  .requiredOption("--key <keyfile>", "Signing keyfile path")
  .option("--registry <addr>", "ForrelRegistry contract address")
  .option("--rpc <url>", "Diana JSON-RPC URL")
  .option("--key-evm <hex>", "Submitter secp256k1 private key (or FORREL_SUBMITTER_KEY)")
  .option("--json", "Emit JSON output")
  .action(async (opts) => {
    await runRevoke(opts);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
