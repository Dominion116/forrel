import {
  PQC_KEY_STATUS_ADDRESS,
  RegistryError,
  fromBase64,
  forrelRegistryAbi,
  isRegistryErrorCode,
  keyFingerprint,
  toHex,
  type EvmWindowStatus,
  type Hex,
  type KeyRotationRecord,
  type Page,
  type PqcKeyStatus,
  type Project,
  type ProjectSummary,
  type RegisterInput,
  type RegistryStats,
  type Release,
  type RevokeInput,
  type RevokeReasonCode,
  type RotateInput,
  type SignedBundle,
  type TxResult,
} from "@forrel/core";
import { evmWindowStatus, toEvmAddress } from "@qorechain/evm";
import {
  BaseError,
  ContractFunctionRevertedError,
  parseAbi,
  type PublicClient,
  type WalletClient,
} from "viem";

import type { ChainClient } from "./types";

/** What the live client needs; injected so the browser, the server and scripts can all use it. */
export interface LiveClientDeps {
  /** The deployed ForrelRegistry. */
  registry: Hex;
  /** Reads (eth_call) against Diana. */
  publicClient: PublicClient;
  /** The connected QoreX wallet, fetched only when a write happens. */
  getWalletClient: () => Promise<WalletClient>;
  /** QoreChain REST (LCD) base for the EVM-window check, e.g. "/lcd-testnet" in the browser. */
  rest: string;
  /** Registry deploy block: enables best-effort tx-hash lookups from event logs. */
  deployBlock?: bigint;
}

type ProjectView = {
  projectId: Hex;
  owner: Hex;
  signingKeyPtr: Hex;
  recoveryKeyPtr: Hex;
  keyEpoch: number;
  nextSeq: bigint;
  createdAt: bigint;
  releaseCount: bigint;
  slug: string;
};

type ReleaseView = {
  projectId: Hex;
  seq: bigint;
  keyEpoch: number;
  publishedAt: bigint;
  versionHash: Hex;
  artifactHash: Hex;
  metaHash: Hex;
  signaturePtr: Hex;
  signingKeyPtr: Hex;
  revoked: boolean;
  revokeReason: number;
  revokedAt: bigint;
  version: string;
};

const KEY_STATUS_ABI = parseAbi([
  "function pqcKeyStatus(address account) view returns (bool registered, uint8 algorithmId, bytes pubkey, bool possessionProven)",
]);

/** Pages of `limit` ids, newest first, out of `total` ascending ids. */
function newestFirst(total: bigint, page: Page): { start: bigint; count: bigint } {
  const offset = BigInt(page.offset);
  const limit = BigInt(page.limit);
  if (offset >= total) return { start: 0n, count: 0n };
  const end = total - offset; // exclusive
  const start = end > limit ? end - limit : 0n;
  return { start, count: end - start };
}

/**
 * ForrelRegistry on QoreChain Diana.
 * - Reads: viem `readContract` (eth_call) against contract storage only, so verdicts never depend
 *   on event logs (testnet prunes them). Keys, signatures and rotation history are in storage.
 * - Writes: simulated first (to decode the contract's custom error before asking QoreX to sign),
 *   then sent through the connected wallet and awaited.
 * - Transaction hashes are the one thing storage can't hold; they come from event logs on a
 *   best-effort basis and are simply omitted once pruned.
 */
export class LiveChainClient implements ChainClient {
  readonly mode = "live" as const;
  private readonly pubkeys = new Map<string, Hex>();
  private readonly slugs = new Map<string, string>();

  constructor(private readonly d: LiveClientDeps) {}

  /* ---------------------------------------------------------------- helpers */

  private get pc() {
    return this.d.publicClient;
  }

  private read<T>(functionName: string, args: readonly unknown[] = []): Promise<T> {
    return this.pc.readContract({
      address: this.d.registry,
      abi: forrelRegistryAbi,
      functionName,
      args,
    } as never) as Promise<T>;
  }

  /** Public keys are immutable blobs: cache them by pointer. */
  private async pubkey(ptr: Hex): Promise<Hex> {
    const key = ptr.toLowerCase();
    const hit = this.pubkeys.get(key);
    if (hit) return hit;
    const pk = await this.read<Hex>("getPubkey", [ptr]);
    this.pubkeys.set(key, pk);
    return pk;
  }

  private async slugOf(projectId: Hex): Promise<string> {
    const hit = this.slugs.get(projectId);
    if (hit) return hit;
    const p = await this.read<ProjectView>("getProject", [projectId]);
    this.slugs.set(projectId, p.slug);
    return p.slug;
  }

  /** Release ids → tx hashes from ReleasePublished / ReleaseRevoked logs (best effort). */
  private async txHashes(ids: bigint[]): Promise<{ publish: Map<bigint, Hex>; revoke: Map<bigint, Hex> }> {
    const publish = new Map<bigint, Hex>();
    const revoke = new Map<bigint, Hex>();
    if (this.d.deployBlock === undefined || ids.length === 0) return { publish, revoke };
    try {
      const [pub, rev] = await Promise.all([
        this.pc.getContractEvents({
          address: this.d.registry,
          abi: forrelRegistryAbi,
          eventName: "ReleasePublished",
          args: { releaseId: ids },
          fromBlock: this.d.deployBlock,
        } as never),
        this.pc.getContractEvents({
          address: this.d.registry,
          abi: forrelRegistryAbi,
          eventName: "ReleaseRevoked",
          args: { releaseId: ids },
          fromBlock: this.d.deployBlock,
        } as never),
      ]);
      for (const l of pub as unknown as { args: { releaseId: bigint }; transactionHash: Hex }[]) {
        publish.set(l.args.releaseId, l.transactionHash);
      }
      for (const l of rev as unknown as { args: { releaseId: bigint }; transactionHash: Hex }[]) {
        revoke.set(l.args.releaseId, l.transactionHash);
      }
    } catch {
      // Pruned history or an RPC range limit: links are optional, verdicts are not affected.
    }
    return { publish, revoke };
  }

  private async toRelease(releaseId: bigint, r: ReleaseView, tx?: { publish?: Hex; revoke?: Hex }): Promise<Release> {
    const [slug, pk] = await Promise.all([this.slugOf(r.projectId), this.pubkey(r.signingKeyPtr)]);
    return {
      releaseId,
      projectId: r.projectId,
      slug,
      seq: r.seq,
      keyEpoch: Number(r.keyEpoch),
      publishedAt: Number(r.publishedAt),
      version: r.version,
      versionHash: r.versionHash,
      artifactHash: r.artifactHash,
      metaHash: r.metaHash,
      signaturePtr: r.signaturePtr,
      signingKeyPtr: r.signingKeyPtr,
      signingKeyFingerprint: keyFingerprint(pk),
      publishTxHash: tx?.publish,
      revoked: r.revoked,
      revokeReason: r.revoked ? (r.revokeReason as RevokeReasonCode) : undefined,
      revokedAt: r.revoked ? Number(r.revokedAt) : undefined,
      revokeTxHash: tx?.revoke,
    };
  }

  private async releasesById(ids: bigint[]): Promise<Release[]> {
    const [rows, tx] = await Promise.all([
      Promise.all(ids.map((id) => this.read<ReleaseView>("getRelease", [id]))),
      this.txHashes(ids),
    ]);
    return Promise.all(
      rows.map((r, i) => {
        const id = ids[i]!;
        return this.toRelease(id, r, { publish: tx.publish.get(id), revoke: tx.revoke.get(id) });
      }),
    );
  }

  private async latestVersion(p: ProjectView): Promise<string | null> {
    if (p.releaseCount === 0n) return null;
    const [id] = await this.read<bigint[]>("releasesOfProject", [p.projectId, p.releaseCount - 1n, 1n]);
    if (id === undefined) return null;
    return (await this.read<ReleaseView>("getRelease", [id])).version;
  }

  private async summary(p: ProjectView): Promise<ProjectSummary> {
    this.slugs.set(p.projectId, p.slug);
    return {
      projectId: p.projectId,
      slug: p.slug,
      owner: p.owner,
      releaseCount: Number(p.releaseCount),
      latestVersion: await this.latestVersion(p),
      keyEpoch: Number(p.keyEpoch),
      createdAt: Number(p.createdAt),
    };
  }

  /** Map a viem error to the registry's custom error when the revert names one. */
  private decode(err: unknown): unknown {
    if (err instanceof BaseError) {
      const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
      if (revert instanceof ContractFunctionRevertedError) {
        const name = revert.data?.errorName;
        if (name && isRegistryErrorCode(name)) return new RegistryError(name);
      }
    }
    return err;
  }

  private async write(functionName: string, args: readonly unknown[]): Promise<TxResult> {
    try {
      const wallet = await this.d.getWalletClient();
      const account = wallet.account;
      if (!account) throw new Error("Connect QoreX first.");
      const { request } = await this.pc.simulateContract({
        address: this.d.registry,
        abi: forrelRegistryAbi,
        functionName,
        args,
        account,
      } as never);
      const hash = await wallet.writeContract(request as never);
      const receipt = await this.pc.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error(`Transaction ${hash} reverted.`);
      return { txHash: hash, blockNumber: receipt.blockNumber };
    } catch (err) {
      throw this.decode(err);
    }
  }

  /* ---------------------------------------------------------------- reads */

  async getStats(): Promise<RegistryStats> {
    const [[projectCount, releaseCount, revoked], latestBlock] = await Promise.all([
      this.read<readonly [bigint, bigint, bigint]>("stats"),
      this.pc.getBlockNumber(),
    ]);
    let lastPublishedAt: number | null = null;
    if (releaseCount > 0n) {
      lastPublishedAt = Number((await this.read<ReleaseView>("getRelease", [releaseCount - 1n])).publishedAt);
    }
    return {
      projectCount: Number(projectCount),
      releaseCount: Number(releaseCount),
      revokedCount: Number(revoked),
      latestBlock,
      lastPublishedAt,
    };
  }

  async listProjects(page: Page): Promise<ProjectSummary[]> {
    const ids = await this.read<Hex[]>("listProjects", [BigInt(page.offset), BigInt(page.limit)]);
    const views = await Promise.all(ids.map((id) => this.read<ProjectView>("getProject", [id])));
    return Promise.all(views.map((v) => this.summary(v)));
  }

  async getProject(slug: string): Promise<Project | null> {
    let p: ProjectView;
    try {
      p = await this.read<ProjectView>("getProjectBySlug", [slug]);
    } catch (err) {
      const decoded = this.decode(err);
      if (decoded instanceof RegistryError && decoded.code === "UnknownProject") return null;
      throw decoded;
    }
    const [base, signingKeyHex, recoveryKeyHex, rotations] = await Promise.all([
      this.summary(p),
      this.pubkey(p.signingKeyPtr),
      this.pubkey(p.recoveryKeyPtr),
      this.read<readonly { epoch: number; keyPtr: Hex; rotatedAt: bigint; viaRecovery: boolean }[]>(
        "getRotations",
        [p.projectId],
      ),
    ]);
    const history: KeyRotationRecord[] = await Promise.all(
      rotations.map(async (r) => ({
        epoch: Number(r.epoch),
        rotatedAt: Number(r.rotatedAt),
        viaRecovery: r.viaRecovery,
        signingKeyFingerprint: keyFingerprint(await this.pubkey(r.keyPtr)),
      })),
    );
    return {
      ...base,
      signingKeyPtr: p.signingKeyPtr,
      recoveryKeyPtr: p.recoveryKeyPtr,
      signingKeyFingerprint: keyFingerprint(signingKeyHex),
      recoveryKeyFingerprint: keyFingerprint(recoveryKeyHex),
      signingKeyHex,
      recoveryKeyHex,
      nextSeq: p.nextSeq,
      rotations: history,
    };
  }

  async listReleases(projectId: Hex, page: Page): Promise<Release[]> {
    const p = await this.read<ProjectView>("getProject", [projectId]);
    const { start, count } = newestFirst(p.releaseCount, page);
    if (count === 0n) return [];
    const ids = await this.read<bigint[]>("releasesOfProject", [projectId, start, count]);
    return this.releasesById([...ids].reverse());
  }

  async listRecentReleases(page: Page): Promise<Release[]> {
    const [, releaseCount] = await this.read<readonly [bigint, bigint, bigint]>("stats");
    const { start, count } = newestFirst(releaseCount, page);
    const ids: bigint[] = [];
    for (let i = start + count - 1n; i >= start && count > 0n; i--) ids.push(i);
    return this.releasesById(ids);
  }

  async getReleaseById(releaseId: bigint): Promise<Release | null> {
    try {
      const [release] = await this.releasesById([releaseId]);
      const [signatureHex, signingKeyHex] = await Promise.all([
        this.read<Hex>("getSignature", [releaseId]),
        this.pubkey(release!.signingKeyPtr),
      ]);
      return { ...release!, signatureHex, signingKeyHex };
    } catch (err) {
      const decoded = this.decode(err);
      if (decoded instanceof RegistryError && decoded.code === "UnknownRelease") return null;
      throw decoded;
    }
  }

  async findByArtifact(hash: Hex): Promise<Release[]> {
    const ids = await this.read<bigint[]>("releasesOfArtifact", [hash, 0n, 100n]);
    return this.releasesById([...ids]);
  }

  /** Live pqcVerify through the registry's `recheck` (a plain eth_call). */
  async recheckSignature(releaseId: bigint): Promise<{ valid: boolean; checkedAtBlock: bigint }> {
    const [valid, checkedAtBlock] = await Promise.all([
      this.read<boolean>("recheck", [releaseId]),
      this.pc.getBlockNumber(),
    ]);
    return { valid, checkedAtBlock };
  }

  async getKeyStatus(addr: Hex): Promise<PqcKeyStatus> {
    const [registered, algorithmId, pubkey, possessionProven] = (await this.pc.readContract({
      address: PQC_KEY_STATUS_ADDRESS,
      abi: KEY_STATUS_ABI,
      functionName: "pqcKeyStatus",
      args: [addr],
    })) as readonly [boolean, number, Hex, boolean];
    return { registered, algorithmId: Number(algorithmId), possessionProven, pubkey };
  }

  /** `GET {rest}/qorechain/pqc/v1/evm_window/{qor1…}` (confirmed on Diana). */
  async getWindowStatus(addr: Hex): Promise<EvmWindowStatus> {
    const w = await evmWindowStatus({ rest: this.d.rest, address: addr });
    return {
      found: w.found,
      live: w.live,
      remainingBlocks: w.remainingBlocks,
      remainingTxs: w.remainingTxs,
      remainingValue: w.remainingValue,
      nativeOnly: w.nativeOnly,
      allowedTargets: w.allowedTargets.map((t) => (t.startsWith("0x") ? t : toEvmAddress(t)).toLowerCase() as Hex),
    };
  }

  /* ---------------------------------------------------------------- writes (QoreX) */

  registerProject(input: RegisterInput): Promise<TxResult> {
    return this.write("registerProject", [input.slug, input.signingPubkey, input.recoveryPubkey]);
  }

  publish(bundle: SignedBundle): Promise<TxResult> {
    return this.write("publish", [
      bundle.projectId,
      bundle.version,
      bundle.artifactHash,
      bundle.metaHash,
      toHex(fromBase64(bundle.signature)),
    ]);
  }

  rotateKey(input: RotateInput): Promise<TxResult> {
    return this.write("rotateKey", [input.projectId, input.newPubkey, input.viaRecovery, input.signature]);
  }

  revoke(input: RevokeInput): Promise<TxResult> {
    return this.write("revoke", [input.releaseId, input.reason, input.signature]);
  }
}
