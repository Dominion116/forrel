import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import {
  qorechain as rawQorechain,
  qorechainTestnet as rawQorechainTestnet,
} from "@qorechain/evm";
import { qorexWallet } from "@qorechain/qorex-rainbowkit";
import type { Chain } from "viem";
import { createConfig, http } from "wagmi";

// `@qorechain/evm` targets viem ~2.53 where `PrepareTransactionRequestPhase` did not yet include
// `"afterFillTransactionError"`; widen to the workspace `viem` `Chain` type.
export const qorechainTestnet = rawQorechainTestnet as unknown as Chain;
export const qorechain = rawQorechain as unknown as Chain;

// QoreX first, then any other injected (EIP-1193) wallet, adapted from
// `create-qorechain-dapp`'s `viem-wagmi` template for Next.js App Router.
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [() => qorexWallet({ pollAccountsOnFocus: true }), injectedWallet],
    },
  ],
  {
    appName: "Forrel",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "unused",
  },
);

// Diana testnet is listed first so fresh connections default to it.
export const wagmiConfig = createConfig({
  chains: [qorechainTestnet, qorechain],
  connectors,
  ssr: true,
  transports: {
    [qorechainTestnet.id]: http(),
    [qorechain.id]: http(),
  },
});
