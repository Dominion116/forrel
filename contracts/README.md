# Forrel contracts

`ForrelRegistry` is the on-chain release log. A release, key rotation or revocation is accepted
only when its ML-DSA-87 signature passes QoreChain's `pqcVerify` precompile (`0x…0a01`).

| File | What it is |
|---|---|
| `src/ForrelRegistry.sol` | Projects, releases, rotate, revoke, paginated views, message builders |
| `src/lib/PQC.sol` | Wrappers for `pqcVerify` and `pqcKeyStatus`; empty return data reverts with `PrecompileUnavailable` |
| `src/lib/SSTORE2.sol` | Stores 2,592-byte public keys and 4,627-byte signatures as contract code |
| `test/ForrelRegistry.t.sol` | Unit and fuzz tests (PRD §12.5), with mock precompiles etched at `0x0a01` / `0x0a02` |
| `test/SSTORE2.t.sol` | SSTORE2 round trips |
| `script/Deploy.s.sol` | Deploys the registry and writes `../deployments/diana.json` |

## Signed messages

`abi.encodePacked`, identical to `encodePublishMsg` / `encodeRotateMsg` / `encodeRevokeMsg` in
`@forrel/core`. The contract also exposes `publishMessage`, `rotateMessage` and `revokeMessage` so
clients can compare bytes.

```
PUBLISH = "FORREL/v1/PUBLISH" ‖ uint256 chainId ‖ address registry ‖ bytes32 projectId
          ‖ uint64 seq ‖ bytes32 keccak256(version) ‖ bytes32 artifactHash ‖ bytes32 metaHash   (205 bytes)
ROTATE  = "FORREL/v1/ROTATE"  ‖ uint256 chainId ‖ address registry ‖ bytes32 projectId
          ‖ uint32 keyEpoch (current) ‖ bytes32 keccak256(newPubkey) ‖ bool viaRecovery         (137 bytes)
REVOKE  = "FORREL/v1/REVOKE"  ‖ uint256 chainId ‖ address registry ‖ bytes32 projectId
          ‖ uint256 releaseId ‖ uint8 reason                                                    (133 bytes)
```

## Commands (run from `contracts/`)

Foundry may run locally for this folder only (see the root `AGENTS.md`).

```bash
npm run forge-std     # once: installs forge-std into lib/ (gitignored)
forge build
forge test
npm run coverage      # summary for src/ only
npm run abi           # forge build + copy the ABI into packages/core/src/abi.ts (run after contract changes)
```

### End-to-end check of the web client

`scripts/live-e2e.ts` deploys the real registry bytecode on a local anvil chain (as chain 9800),
puts mock precompiles at `0x0a01` / `0x0a02`, and drives the web app's `LiveChainClient` through
register → publish → verify → re-check → revoke → rotate, including revert decoding and tx links.

```bash
anvil --chain-id 9800            # terminal 1
npm run abi && npm run e2e       # terminal 2, from contracts/
```

## Deploy to Diana

The deployer account needs a registered, possession-proven ML-DSA-87 key and an open EVM window.

```bash
cp .env.example .env               # set PRIVATE_KEY and QORE_PQC_RECOVERY_CODE
npm run window -- status           # register / open first if needed
npm run deploy:testnet             # forge script … --broadcast; writes ../deployments/diana.json
```

Then set `NEXT_PUBLIC_REGISTRY_ADDRESS` in the web app to the deployed address.
