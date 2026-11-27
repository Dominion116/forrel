# Forrel

**Releases that still verify after Q-Day.**

Forrel is a post-quantum release and firmware signing log on QoreChain's Diana testnet. Maintainers publish SHA3-256 artifact fingerprints signed with ML-DSA-87 keys, verified on-chain via QoreChain's `pqcVerify` precompile.

> Scaffolded with `create-qorechain-dapp@0.14.0` (`viem-wagmi` and `foundry` templates adapted into an npm workspace monorepo with Next.js App Router). See [docs/scaffold-notes.md](docs/scaffold-notes.md).

## Workspaces

- `apps/web` — Next.js App Router frontend (`/` landing + `/app/*`)
- `packages/core` — Shared domain types, message encoding, hashing, keyfile, signing, ABI
- `packages/cli` — `forrel` CLI (`@forrel/cli`)
- `contracts` — Foundry contracts (`ForrelRegistry`) and QoreChain EVM window helper

## Development

```bash
npm install
npm run dev
```

Run checks:

```bash
npm run typecheck
npm run lint
npm test
```

## License

MIT — see [LICENSE](LICENSE).
