# Forrel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![QoreChain Diana](https://img.shields.io/badge/Network-QoreChain%20Diana%20(9800)-daff52)](https://explorer-testnet.qore.host)
[![ML-DSA-87](https://img.shields.io/badge/Signature-ML--DSA--87%20(FIPS%20204)-0a0a0a)](./docs/message-spec.md)
[![SHA3-256](https://img.shields.io/badge/Digest-SHA3--256%20(FIPS%20202)-0a0a0a)](./packages/core/src/hash.ts)

> **Releases that still verify after Q-Day.** A post-quantum release and firmware signing log on QoreChain, verified on-chain by `pqcVerify`.

Forrel lets software and firmware maintainers publish a record of each release: the file's SHA3-256 hash signed with an **ML-DSA-87** key. Every record is checked on-chain by QoreChain's `pqcVerify` precompile (`0x…0a01`) before it is accepted, and public keys and signatures are stored in contract state via SSTORE2 so verification survives testnet log pruning. Anyone can drop a file into the web app or run `forrel verify` with no wallet required.

---

## Features

- ✅ **Wallet-free verification** — Drop any file in the browser (stream-hashed locally in a Web Worker) or run `forrel verify` via read-only `eth_call`.
- ✅ **On-chain post-quantum verification** — `ForrelRegistry` verifies every `publish`, `rotateKey`, and `revoke` signature through QoreChain's `pqcVerify` precompile.
- ✅ **Offline-capable CLI** — Generate encrypted keyfiles (`scrypt` + `AES-256-GCM`), sign bundles offline (`--seq`), and submit separately from CI.
- ✅ **Durable state storage (SSTORE2)** — Public keys (2,592 B), signatures (4,627 B), and rotation history live in contract state rather than pruned event logs.
- ✅ **Key safety built in** — Rotate signing keys via the active key or an offline recovery key, and revoke bad releases with a reason code.
- ✅ **Deterministic mock & live modes** — Switch between `MockChainClient` and `LiveChainClient` via `NEXT_PUBLIC_CHAIN_MODE`.

---

## Architecture

```text
          ┌──────────────────────── Browser ────────────────────────┐
          │  Landing (/)          /app (verify, projects, publish)  │
          │      │                         │                        │
          │  hash.worker (SHA3-256)   @forrel/core (encode, sign)   │
          │      │                         │                        │
          │  viem public client ──── eth_call ────┐   QoreX (tx) ───┼──┐
          └────────────────────────────────────────┼─────────────────┘  │
                                                   ▼                    ▼
                                   ┌──────── QoreChain Diana (EVM, 9800) ─────────┐
                                   │  ForrelRegistry                              │
                                   │   ├─ pqcVerify     0x…0a01  (ML-DSA-87)       │
                                   │   ├─ pqcKeyStatus  0x…0a02  (owner check)     │
                                   │   └─ SSTORE2 blobs (pubkeys, signatures)     │
                                   └──────────────────────────────────────────────┘
                                                   ▲
          CI / offline machine:  forrel sign  →  bundle.json  →  forrel publish
```

---

## Quick Start

```bash
# 1. Clone and install dependencies
git clone https://github.com/Dominion116/forrel.git
cd forrel
npm install

# 2. Start the web app (defaults to NEXT_PUBLIC_CHAIN_MODE=mock)
npm run dev
```

Open `http://localhost:3000` for the landing page, `http://localhost:3000/app` for the registry app, and `http://localhost:3000/docs` for the full 3-column technical documentation.

---

## Installation

### Prerequisites

- **Node.js** `>= 20.0.0`
- **npm** `>= 10` (uses npm workspaces)
- **Foundry** (`forge`, `cast`) — required only for building/testing/deploying `contracts/`

### Workspace Structure

```text
forrel/
├── apps/web/          # Next.js App Router (/, /app/*, /docs, /privacy, /terms)
├── packages/core/     # @forrel/core — encoders, SHA3-256, keyfiles, Signer, ABI, vectors
├── packages/cli/      # @forrel/cli — `forrel` CLI
├── contracts/         # @forrel/contracts — ForrelRegistry.sol, PQC.sol, SSTORE2.sol, window.ts
└── docs/              # Message spec, scaffold notes, illustration brief
```

---

## CLI Usage (`forrel`)

The `@forrel/cli` workspace shares `@forrel/core` with the web app so browser and CLI produce byte-identical signed messages.

### Commands

| Command | Description | Network |
|---|---|---|
| `forrel keygen --out <file>` | Generate an ML-DSA-87 keypair and save as an encrypted keyfile | Offline |
| `forrel hash <file>` | Print the SHA3-256 digest of a file | Offline |
| `forrel sign <file> --project <slug> --version <v> --key <keyfile> [--seq <n>]` | Sign a release into `<file>.forrel.json` | Offline-capable |
| `forrel publish <bundle.json>` | Submit a signed bundle to `ForrelRegistry` | Online |
| `forrel verify <file> [--project <slug>] [--json]` | Verify a file + live `pqcVerify` re-check (exit `0`/`1`/`2`/`3`) | Read-only |
| `forrel rotate --project <slug> --key <keyfile> [--recovery] --out <newkey>` | Rotate the project signing key | Online |
| `forrel revoke --project <slug> --version <v> --reason <0-3> --key <keyfile>` | Revoke an existing release | Online |

### Offline Sign → CI Publish Example

```bash
# Offline machine: generate keyfile and sign release
npx --workspace=@forrel/cli forrel keygen --out ./signing.forrel-key.json
npx --workspace=@forrel/cli forrel sign ./dist/firmware.bin \
  --project acme-router \
  --version 2.4.1 \
  --key ./signing.forrel-key.json \
  --seq 1

# Online CI runner: publish bundle and verify
export FORREL_REGISTRY="0x..."
export FORREL_SUBMITTER_KEY="0x..."
npx --workspace=@forrel/cli forrel publish ./dist/firmware.bin.forrel.json
npx --workspace=@forrel/cli forrel verify ./dist/firmware.bin --project acme-router
```

See [.github/workflows/forrel.yml](./.github/workflows/forrel.yml) for a tag-triggered GitHub Actions workflow example.

---

## Configuration

### Web App (`apps/web/.env.local`)

Copy `apps/web/.env.example` to `apps/web/.env.local`:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_MODE` | `mock` (deterministic fixtures) or `live` (QoreChain Diana) | `mock` |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | Deployed `ForrelRegistry` address (required when `live`) | — |
| `NEXT_PUBLIC_REGISTRY_DEPLOY_BLOCK` | Optional deploy block for best-effort tx hash links | — |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional WalletConnect ID (not needed for QoreX) | — |

### CLI Environment Variables

| Variable | Description | Required |
|---|---|---|
| `FORREL_RPC` | QoreChain Diana JSON-RPC URL (`https://evm-testnet.qore.host`) | No |
| `FORREL_REGISTRY` | Deployed `ForrelRegistry` address (or auto-read from `deployments/diana.json`) | Online / Sign |
| `FORREL_SUBMITTER_KEY` | `0x`-prefixed secp256k1 key with an open Diana EVM window | Write commands |
| `FORREL_PASSPHRASE` | Keyfile passphrase for non-interactive CI (prompts if omitted) | No |

---

## What Is Post-Quantum (and What Isn't)

| Layer | Status | Details |
|---|---|---|
| Release signatures | **Post-quantum** | ML-DSA-87 (FIPS 204 pure, empty context), verified on-chain via `pqcVerify` |
| Artifact & notes digests | **Post-quantum safe** | SHA3-256 (FIPS 202) |
| QoreChain account | **Hybrid** | `eth_secp256k1` + registered ML-DSA-87 key (`pqcKeyStatus`) |
| EVM transaction transport | **Classical gas payer** | Submitter key only pays gas; cannot forge, rotate, or revoke releases |
| Deployment target | **Testnet only** | QoreChain Diana (`chainId 9800`); `pqcVerify` is not on mainnet yet |

---

## Smart Contracts & Gate

`contracts/` is a Foundry project adapted from `create-qorechain-dapp@0.14.0`:

```bash
# Install forge-std and run Foundry tests
npm --workspace=@forrel/contracts run forge-std
npm --workspace=@forrel/contracts run test

# Manage QoreChain PQC key & EVM authorisation window
npm --workspace=@forrel/contracts run window -- status
npm --workspace=@forrel/contracts run window -- open

# Run the live Diana pqcVerify gate (checks @qorechain/qoresign & @noble/post-quantum)
npm --workspace=@forrel/core run gate
```

---

## Documentation

- **Interactive Web Docs**: `/docs` (3-column reference), `/app/how-it-works`
- **Message Specification**: [docs/message-spec.md](./docs/message-spec.md)
- **Scaffold Notes**: [docs/scaffold-notes.md](./docs/scaffold-notes.md)
- **Privacy & Terms**: `/privacy`, `/terms`

---

## Development

```bash
# Typecheck all workspaces
npm run typecheck

# Start Next.js dev server
npm run dev

# Format with Prettier
npm run format
```

> Note: Per workspace rules in [AGENTS.md](./AGENTS.md), web lint, JS tests, and production Next.js builds run on Vercel CI rather than locally.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE).

## Acknowledgments

- Scaffolded with [`create-qorechain-dapp`](https://www.npmjs.com/package/create-qorechain-dapp) (`0.14.0`) — see [docs/scaffold-notes.md](./docs/scaffold-notes.md)
- [QoreChain](https://github.com/qorechain/qorechain-sdk) (`@qorechain/sdk`, `@qorechain/evm`, `@qorechain/qorex-rainbowkit`, `@qorechain/qoresign`)
- [Noble Cryptography](https://paulmillr.com/noble/) (`@noble/post-quantum`, `@noble/hashes`, `@noble/ciphers`)
- [viem](https://viem.sh), [wagmi](https://wagmi.sh), [RainbowKit](https://www.rainbowkit.com), [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), and [Foundry](https://getfoundry.sh)
