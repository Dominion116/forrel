#!/usr/bin/env node
import { Command } from "commander";
import { DIANA_CHAIN_ID } from "@forrel/core";

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
  });

program.parse();
