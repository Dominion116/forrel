/**
 * window.ts - check and open the EVM authorisation window for your deployer.
 *
 * Adapted from `create-qorechain-dapp@0.14.0` (`foundry` template).
 *
 * On QoreChain every EVM transaction (a deploy included) needs:
 *   1. a registered ML-DSA-87 key for the sending account, and
 *   2. a live EVM authorisation window, opened by a native-lane message signed
 *      hybrid (secp256k1 + ML-DSA-87).
 *
 * Usage:
 *   npm --workspace=@forrel/contracts run window -- status
 *   npm --workspace=@forrel/contracts run window -- register
 *   npm --workspace=@forrel/contracts run window -- open
 *   npm --workspace=@forrel/contracts run window -- recovery-code
 */
import { StargateClient } from "@cosmjs/stargate";
import {
  EthNativeSigner,
  getNetwork,
  buildRegisterPqcKeyMsg,
  deriveUnifiedAccount,
  fetchPqcStatus,
  generatePqcRecoveryCode,
  isRegisteredPqcKey,
  isValidRecoveryCode,
  openEvmWindowMsg,
  signProofOfPossession,
  unifiedAccountFromSeed,
  type UnifiedAccount,
} from "@qorechain/sdk";
import { evmWindowCost, evmWindowStatus } from "@qorechain/evm";

const preset = (name: "testnet" | "mainnet") => {
  const n = getNetwork(name);
  return {
    chainId: n.chainId,
    rest: process.env.QORE_REST_URL?.trim() || n.endpoints.rest,
    rpc: process.env.QORE_RPC_URL?.trim() || n.endpoints.rpc,
  };
};

const NETWORKS = {
  testnet: preset("testnet"),
  mainnet: preset("mainnet"),
} as const;

type NetworkName = keyof typeof NETWORKS;

function network(): (typeof NETWORKS)[NetworkName] {
  const name = (process.env.QORE_NETWORK ?? "testnet") as NetworkName;
  const n = NETWORKS[name];
  if (!n) throw new Error(`QORE_NETWORK must be "testnet" or "mainnet", got "${name}"`);
  return n;
}

async function account(): Promise<UnifiedAccount> {
  const mnemonic = process.env.QORE_MNEMONIC?.trim();
  if (mnemonic) return deriveUnifiedAccount(mnemonic, 0);
  const key = process.env.PRIVATE_KEY?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "Set QORE_MNEMONIC, or PRIVATE_KEY as 0x followed by 64 hex characters, in .env",
    );
  }
  const recoveryCode = process.env.QORE_PQC_RECOVERY_CODE?.trim();
  if (!recoveryCode) {
    throw new Error(
      "Set QORE_PQC_RECOVERY_CODE in .env: with PRIVATE_KEY the account's ML-DSA-87 key comes from a separate " +
        "recovery code. Create one with `npm run window -- recovery-code` and store it apart from the private key, or set QORE_MNEMONIC instead.",
    );
  }
  if (!isValidRecoveryCode(recoveryCode)) {
    throw new Error("QORE_PQC_RECOVERY_CODE is not a valid QRC1 recovery code (check for a typo)");
  }
  return unifiedAccountFromSeed(Uint8Array.from(Buffer.from(key.slice(2), "hex")), {
    recoveryCode,
  });
}

async function accountSequence(
  rest: string,
  address: string,
): Promise<{ accountNumber: bigint; sequence: bigint }> {
  const res = await fetch(`${rest}/cosmos/auth/v1beta1/accounts/${address}`);
  if (res.status === 404) {
    throw new Error(`${address} does not exist on chain yet: send it some QOR first`);
  }
  if (!res.ok) throw new Error(`account query failed: HTTP ${res.status}`);
  const body = (await res.json()) as { account?: Record<string, unknown> };
  const acc = (body.account?.base_account ?? body.account ?? {}) as Record<string, string>;
  return { accountNumber: BigInt(acc.account_number ?? "0"), sequence: BigInt(acc.sequence ?? "0") };
}

const FEE = { amount: [{ denom: "uqor", amount: "100000" }], gas: "800000" };

async function status(): Promise<void> {
  const net = network();
  const acc = await account();
  console.log(`account:  ${acc.evm}  (${acc.cosmos})`);
  const pqc = await fetchPqcStatus({ rest: net.rest, address: acc.cosmos });
  const mine = pqc.registered ? isRegisteredPqcKey(pqc, acc.pqc.publicKey) : false;
  console.log(
    `PQC key:  ${pqc.registered ? (mine === false ? "registered, but NOT this key" : "registered") : "not registered (run: npm run window -- register)"}`,
  );
  const w = await evmWindowStatus({ rest: net.rest, address: acc.cosmos });
  if (!w.found) {
    console.log("window:   none (run: npm run window -- open)");
  } else {
    console.log(
      `window:   ${w.live ? "live" : "not usable"}; ${w.remainingBlocks} blocks, ${w.remainingTxs} txs, ${w.remainingValue} uqor left`,
    );
  }
}

async function broadcast(
  acc: UnifiedAccount,
  mode: "hybrid" | "classical",
  messages: Parameters<EthNativeSigner["sign"]>[0]["messages"],
): Promise<string> {
  const net = network();
  const { accountNumber, sequence } = await accountSequence(net.rest, acc.cosmos);
  const signer = new EthNativeSigner(acc, { signMode: mode, rest: net.rest });
  const transport = await StargateClient.connect(net.rpc);
  try {
    const res = await signer.signAndBroadcast(transport, {
      chainId: net.chainId,
      accountNumber,
      sequence,
      fee: FEE,
      messages,
    });
    return res.transactionHash;
  } finally {
    transport.disconnect();
  }
}

async function register(): Promise<void> {
  const net = network();
  const acc = await account();
  const pqc = await fetchPqcStatus({ rest: net.rest, address: acc.cosmos });
  if (pqc.registered) {
    console.log("The account already has a PQC key; nothing to do.");
    return;
  }
  const proofOfPossession = signProofOfPossession({
    chainId: net.chainId,
    account: acc.cosmos,
    keypair: acc.pqc,
  });
  const msg = buildRegisterPqcKeyMsg(acc.cosmos, { pqcKeypair: acc.pqc, proofOfPossession });
  console.log(`registered: ${await broadcast(acc, "classical", [msg])}`);
}

async function open(): Promise<void> {
  const net = network();
  const acc = await account();
  const blocks = BigInt(process.env.QORE_WINDOW_BLOCKS ?? "600");
  const maxTxs = BigInt(process.env.QORE_WINDOW_TXS ?? "5");
  const perTx = evmWindowCost({ gas: 3_000_000n, maxFeePerGas: 250_000_000_000n });
  const maxValue = BigInt(process.env.QORE_WINDOW_MAX_UQOR ?? (perTx * maxTxs).toString());
  const msg = openEvmWindowMsg({ sender: acc.cosmos, blocks, maxTxs, maxValue });
  console.log(`opened: ${await broadcast(acc, "hybrid", [msg])}`);
  console.log(`window: ${blocks} blocks, ${maxTxs} txs, ${maxValue} uqor (value plus fees)`);
  console.log("Opening advanced the account's nonce; deploy now.");
}

async function recoveryCode(): Promise<void> {
  console.log(generatePqcRecoveryCode());
  console.log("Put it in .env as QORE_PQC_RECOVERY_CODE and keep a copy apart from PRIVATE_KEY.");
  console.log(
    "Use the same code every time: a new code gives the account a different ML-DSA-87 key.",
  );
}

const commands: Record<string, () => Promise<void>> = {
  status,
  register,
  open,
  "recovery-code": recoveryCode,
};
const cmd = process.argv[2] ?? "status";
const run = commands[cmd];
if (!run) {
  console.error(`Unknown command "${cmd}". Use: status | register | open | recovery-code`);
  process.exit(1);
}
run().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
