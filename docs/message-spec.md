# Forrel signed messages

This is the exact byte format that Forrel's ML-DSA-87 signatures cover, and what QoreChain's
`pqcVerify` precompile is known to accept. The same encoders run in the browser and the CLI
(`@forrel/core`) and are rebuilt by `ForrelRegistry` on-chain. Shared test vectors pin all three
together.

## Signature scheme

| | |
|---|---|
| Algorithm | **ML-DSA-87**, NIST FIPS 204 (QoreChain `algorithmId` 1, "Dilithium5") |
| Variant | **Pure ML-DSA**, not HashML-DSA (no pre-hash OID) |
| Context string | **Empty** (`ctx = ""`) |
| Message | The raw message bytes below, no extra hashing or prefix |
| Randomness | Hedged (default) or deterministic (`rnd` = 32 zero bytes). Both verify on-chain. |
| Keys | From a 32-byte seed ξ via `ML-DSA.KeyGen_internal`. Public key 2,592 B, secret key 4,896 B. |
| Signature | 4,627 B |
| Libraries | `@noble/post-quantum` `ml_dsa87` (default `Signer` in `@forrel/core`) and `@qorechain/qoresign` (`@forrel/core/signers/qoresign`). Same keys and the same deterministic signatures from the same seed. |

### On-chain gate result

`npm --workspace=@forrel/core run gate` signs the PUBLISH vector below with each library and calls
the real `pqcVerify` precompile on Diana through a read-only `eth_call`. Last run: **passed, 17/17
checks**, chain 9800, block 10,898,019 (28 Nov 2026).

| Check | `@qorechain/qoresign` | `@noble/post-quantum` |
|---|---|---|
| Deterministic signature → `pqcVerify` | `true` | `true` |
| Hedged signature → `pqcVerify` | `true` | `true` |
| Same signature, one bit of the message flipped → `pqcVerify` | `false` | `false` |
| Public key from the same seed | identical | identical |
| Deterministic signature from the same seed | identical | identical |

**Library choice.** `@qorechain/qoresign` is the PRD's primary and passes, so it is the gate's
winner. Because both libraries produce byte-identical keys and signatures, the choice can't affect
compatibility. `@forrel/core` therefore keeps `@noble/post-quantum` as the default `Signer`, since
`qoresign` would add HD-wallet and hybrid-transaction code to the browser bundle. Node tools can
switch with one line:

```ts
import { setSigner } from "@forrel/core";
import { qoresignSigner } from "@forrel/core/signers/qoresign";
setSigner(qoresignSigner);
```

## Messages

All messages are `abi.encodePacked`. Each starts with an ASCII domain tag, so a signature for
one action can't be replayed as another. `chainId` and `registry` stop cross-chain and
cross-deployment replay; `seq` and `keyEpoch` stop replay within a deployment.

### PUBLISH: 205 bytes

| # | Field | Packed type | Bytes | Notes |
|---|---|---|---|---|
| 1 | domain | bytes | 17 | `"FORREL/v1/PUBLISH"` |
| 2 | chainId | uint256 | 32 | 9800 on Diana |
| 3 | registry | address | 20 | the ForrelRegistry address |
| 4 | projectId | bytes32 | 32 | `keccak256(bytes(slug))` |
| 5 | seq | uint64 | 8 | the project's `nextSeq` (starts at 1) |
| 6 | versionHash | bytes32 | 32 | `keccak256(bytes(version))` |
| 7 | artifactHash | bytes32 | 32 | SHA3-256 (FIPS 202) of the artifact bytes |
| 8 | metaHash | bytes32 | 32 | SHA3-256 of the UTF-8 release notes, or 32 zero bytes |

Signed by the project's **current signing key**.

### ROTATE: 137 bytes

| # | Field | Packed type | Bytes | Notes |
|---|---|---|---|---|
| 1 | domain | bytes | 16 | `"FORREL/v1/ROTATE"` |
| 2 | chainId | uint256 | 32 | |
| 3 | registry | address | 20 | |
| 4 | projectId | bytes32 | 32 | |
| 5 | keyEpoch | uint32 | 4 | the epoch **before** rotating (starts at 1) |
| 6 | newPubkeyHash | bytes32 | 32 | `keccak256(newPubkey)` (2,592-byte key) |
| 7 | viaRecovery | bool | 1 | `0x01` when the recovery key authorises |

Signed by the current signing key, or by the recovery key when `viaRecovery` is true.

### REVOKE: 133 bytes

| # | Field | Packed type | Bytes | Notes |
|---|---|---|---|---|
| 1 | domain | bytes | 16 | `"FORREL/v1/REVOKE"` |
| 2 | chainId | uint256 | 32 | |
| 3 | registry | address | 20 | |
| 4 | projectId | bytes32 | 32 | |
| 5 | releaseId | uint256 | 32 | index in the registry's release list |
| 6 | reason | uint8 | 1 | 0 unspecified, 1 key compromised, 2 critical bug, 3 superseded |

Signed by the project's **current signing key**.

## Precompiles

| Address | Call | Returns |
|---|---|---|
| `0x…0a01` | `pqcVerify(bytes pubkey, bytes signature, bytes message)` | `bool` |
| `0x…0a02` | `pqcKeyStatus(address account)` | `(bool registered, uint8 algorithmId, bytes pubkey, bool possessionProven)` |

An inactive precompile answers with **empty** return data. `ForrelRegistry` checks the length and
reverts with `PrecompileUnavailable` rather than treating empty data as `true`.

**`pqcKeyStatus` has four outputs, not three.** `@qorechain/evm` 0.14's `IQORE_PQC_ABI` lists
`(bool, uint8, bytes)`. On Diana the call returns 160 bytes for an unregistered account, and the
`bytes` offset word is `0x80`, which means four head slots. The fourth slot is
`possessionProven`, as the PRD assumes. `ForrelRegistry` (via `PQC.sol`) decodes all four and
requires `registered && algorithmId == 1 && possessionProven`. Clients reading with the SDK's
three-output ABI still decode correctly; they just don't see the fourth value.

## Test vectors

| File | Contents | Checked by |
|---|---|---|
| `packages/core/vectors/messages.json` | PUBLISH / ROTATE / REVOKE inputs and the exact message bytes | `contracts/test/CoreVectors.t.sol` (the contract rebuilds the same bytes) |
| `packages/core/vectors/signatures.json` | A public test key (seed = SHA3-256(`"forrel/gate/v1"`)), the PUBLISH message, and a deterministic signature that `pqcVerify` on Diana returned `true` for | `contracts/test/RealSignatureVector.t.sol` (the registry passes exactly these bytes to `pqcVerify`) |

Regenerate:

```bash
npm --workspace=@forrel/core run vectors   # messages.json
npm --workspace=@forrel/core run gate      # live gate on Diana → signatures.json
```
