# Scaffold Notes (`create-qorechain-dapp@0.14.0`)

Per Phase 0 of `PRD.md`, we ran `npx create-qorechain-dapp` (`0.14.0`) to inspect the official starter templates and preserve their QoreX / QoreChain SDK wiring.

## Templates Inspected

1. `viem-wagmi` (`--template viem-wagmi --network testnet --package-manager npm`)
   - Stack: Vite + React 18 + wagmi `^2.19.5` + viem `~2.53.1` + `@rainbow-me/rainbowkit` `^2.2.11` + `@tanstack/react-query`
   - QoreChain packages:
     - `@qorechain/evm` (`^0.14.0`): exports `qorechain`, `qorechainTestnet`, `QORECHAIN_REST_ENDPOINTS`, `evmWindowStatus`, `classifyEvmWindowRejection`, `EvmWindowRejection`.
     - `@qorechain/qorex-rainbowkit` (`^0.1.0`): exports `qorexWallet` connector (`qorexWallet({ pollAccountsOnFocus: true })`).
   - Important finding: the public REST APIs (`https://api-testnet.qore.host`, `https://api.qore.host`) do not send CORS headers. The Vite template proxies `/lcd-testnet` and `/lcd-mainnet` to those endpoints. In `apps/web` (Next.js App Router), we replicate this using `rewrites()` in `next.config.ts`.

2. `foundry` (`--template foundry --network testnet --package-manager npm`)
   - Stack: Foundry (`solc_version = "0.8.28"`, `qorechain_testnet = "https://evm-testnet.qore.host"`) + TypeScript helper `scripts/window.ts`
   - QoreChain packages: `@qorechain/sdk` (`^0.14.0`), `@qorechain/evm` (`^0.14.0`), `@cosmjs/stargate` (`^0.39.0`).
   - `scripts/window.ts` implements `status`, `register`, `open`, and `recovery-code` commands for managing ML-DSA-87 PQC key registration and EVM authorisation windows on QoreChain.

3. `fullstack-web` (`--template fullstack-web --network testnet --package-manager npm`)
   - Uses `@qorechain/sdk` `createClient({ network: "testnet", endpoints: { rest, evmRpc } })`.

## Adaptation into Forrel Monorepo

- `apps/web`: Next.js App Router + Tailwind CSS + shadcn/ui, integrating the `viem-wagmi` QoreX + `qorechainTestnet` + `evmWindowStatus` wiring in `lib/wallet/` and `next.config.ts`.
- `contracts`: Adopts the `foundry` template (`foundry.toml`, `scripts/window.ts`, `.env.example`) for Diana testnet deployment and EVM window management.
