import {
  DIANA_CHAIN_ID,
  ML_DSA_87_PUBKEY_BYTES,
  ML_DSA_87_SIGNATURE_BYTES,
  PQC_VERIFY_ADDRESS,
  RegistryError,
  SLUG_REGEX,
  demoSeed,
  encodePublishMsg,
  encodeRevokeMsg,
  encodeRotateMsg,
  fromBase64,
  fromHex,
  keyFingerprint,
  keypairFromSeed,
  projectIdOf,
  signMessage,
  toHex,
  verifyMessage,
  versionHashOf,
  type EvmWindowStatus,
  type Hex,
  type KeyPair,
  type Page,
  type PqcKeyStatus,
  type Project,
  type ProjectSummary,
  type RegisterInput,
  type RegistryStats,
  type Release,
  type RevokeInput,
  type RotateInput,
  type SignedBundle,
  type TxResult,
} from "@forrel/core";

import { getMockWallet } from "@/lib/wallet/mock-wallet";

import { DEMO_FINGERPRINTS, LAZY_KEY, MOCK_REGISTRY, createFixtureData } from "./fixtures";
import type { ChainClient } from "./types";

function randomHex(bytes: number): Hex {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return toHex(b);
}

function copyProject(p: Project): Project {
  return { ...p, rotations: [...p.rotations] };
}

/**
 * Deterministic in-memory registry for mock mode (Phases 0–2).
 *
 * It behaves like ForrelRegistry: writes are authorised by real ML-DSA-87 signatures,
 * checked with the same message encoding the contract will use, and failures throw the
 * contract's custom errors. Fixture projects use public demo keys derived on first use.
 */
export class MockChainClient implements ChainClient {
  readonly mode = "mock" as const;

  private projects: Project[];
  private releases: Release[];
  private latestBlock = 1_482_910n;
  private keyCache = new Map<string, KeyPair>();

  constructor() {
    const { projects, releases } = createFixtureData();
    this.projects = projects;
    this.releases = releases;
  }

  /* ---------- demo keys ---------- */

  private demoKey(slug: string, role: "signing" | "recovery", epoch: number): KeyPair | null {
    if (!DEMO_FINGERPRINTS[slug]) return null;
    const id = `${slug}/${role}/${epoch}`;
    let pair = this.keyCache.get(id);
    if (!pair) {
      pair = keypairFromSeed(demoSeed(slug, role, epoch));
      this.keyCache.set(id, pair);
    }
    return pair;
  }

  /** Fill in a fixture project's public keys the first time they are needed. */
  private ensureKeys(p: Project) {
    if (p.signingKeyHex === LAZY_KEY) {
      const k = this.demoKey(p.slug, "signing", p.keyEpoch);
      if (k) p.signingKeyHex = toHex(k.publicKey);
    }
    if (p.recoveryKeyHex === LAZY_KEY) {
      const k = this.demoKey(p.slug, "recovery", 1);
      if (k) p.recoveryKeyHex = toHex(k.publicKey);
    }
  }

  /** Give a fixture release a real signature by its demo key, once. */
  private ensureSignature(r: Release) {
    if (r.signatureHex && r.signingKeyHex) return;
    const k = this.demoKey(r.slug, "signing", r.keyEpoch);
    if (!k) return;
    const msg = encodePublishMsg({
      chainId: DIANA_CHAIN_ID,
      registry: MOCK_REGISTRY,
      projectId: r.projectId,
      seq: r.seq,
      version: r.version,
      artifactHash: r.artifactHash,
      metaHash: r.metaHash,
    });
    r.signatureHex = toHex(signMessage(msg.bytes, k.secretKey));
    r.signingKeyHex = toHex(k.publicKey);
  }

  private nextBlock(): bigint {
    this.latestBlock += 1n;
    return this.latestBlock;
  }

  private failIfScenario() {
    if (getMockWallet().scenario === "tx-reverts") {
      throw new RegistryError("PrecompileUnavailable", "mock scenario");
    }
  }

  private findProjectById(projectId: Hex): Project {
    const p = this.projects.find((x) => x.projectId.toLowerCase() === projectId.toLowerCase());
    if (!p) throw new RegistryError("UnknownProject");
    return p;
  }

  /* ---------- reads ---------- */

  async getStats(): Promise<RegistryStats> {
    const revokedCount = this.releases.filter((r) => r.revoked).length;
    const lastPublishedAt =
      this.releases.length > 0 ? Math.max(...this.releases.map((r) => r.publishedAt)) : null;
    return {
      projectCount: this.projects.length,
      releaseCount: this.releases.length,
      revokedCount,
      latestBlock: this.latestBlock,
      lastPublishedAt,
    };
  }

  async listProjects(page: Page): Promise<ProjectSummary[]> {
    return this.projects.slice(page.offset, page.offset + page.limit).map((p) => ({
      projectId: p.projectId,
      slug: p.slug,
      owner: p.owner,
      releaseCount: p.releaseCount,
      latestVersion: p.latestVersion,
      keyEpoch: p.keyEpoch,
      createdAt: p.createdAt,
    }));
  }

  async getProject(slug: string): Promise<Project | null> {
    const p = this.projects.find((x) => x.slug === slug);
    if (!p) return null;
    this.ensureKeys(p);
    return copyProject(p);
  }

  async listReleases(projectId: Hex, page: Page): Promise<Release[]> {
    return this.releases
      .filter((r) => r.projectId.toLowerCase() === projectId.toLowerCase())
      .sort((a, b) => Number(b.seq - a.seq))
      .slice(page.offset, page.offset + page.limit)
      .map((r) => ({ ...r }));
  }

  async listRecentReleases(page: Page): Promise<Release[]> {
    return [...this.releases]
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(page.offset, page.offset + page.limit)
      .map((r) => ({ ...r }));
  }

  async getReleaseById(releaseId: bigint): Promise<Release | null> {
    const r = this.releases.find((x) => x.releaseId === releaseId);
    if (!r) return null;
    this.ensureSignature(r);
    return { ...r };
  }

  async findByArtifact(hash: Hex): Promise<Release[]> {
    const normalized = hash.toLowerCase();
    return this.releases.filter((r) => r.artifactHash.toLowerCase() === normalized).map((r) => ({ ...r }));
  }

  /** Re-runs the ML-DSA-87 check, as `pqcVerify` would via eth_call. */
  async recheckSignature(releaseId: bigint): Promise<{ valid: boolean; checkedAtBlock: bigint }> {
    const r = this.releases.find((x) => x.releaseId === releaseId);
    if (!r) throw new Error(`Release ${releaseId.toString()} not found`);
    this.ensureSignature(r);
    const msg = encodePublishMsg({
      chainId: DIANA_CHAIN_ID,
      registry: MOCK_REGISTRY,
      projectId: r.projectId,
      seq: r.seq,
      version: r.version,
      artifactHash: r.artifactHash,
      metaHash: r.metaHash,
    });
    const valid =
      Boolean(r.signatureHex && r.signingKeyHex) &&
      verifyMessage(fromHex(r.signatureHex!), msg.bytes, fromHex(r.signingKeyHex!));
    return { valid, checkedAtBlock: this.nextBlock() };
  }

  async getWindowStatus(_addr: Hex): Promise<EvmWindowStatus> {
    const s = getMockWallet().scenario;
    if (s === "no-window") {
      return { found: false, live: false, remainingBlocks: 0n, remainingTxs: 0n, remainingValue: 0n, allowedTargets: [] };
    }
    return {
      found: true,
      live: s !== "window-exhausted",
      remainingBlocks: 540n,
      remainingTxs: s === "window-exhausted" ? 0n : 4n,
      remainingValue: 15_000_000n, // uqor (15 QOR), as the chain reports it
      allowedTargets: s === "window-missing-target" ? [PQC_VERIFY_ADDRESS] : [MOCK_REGISTRY],
    };
  }

  async getKeyStatus(_addr: Hex): Promise<PqcKeyStatus> {
    const s = getMockWallet().scenario;
    if (s === "no-pq-key") return { registered: false, algorithmId: 0, possessionProven: false };
    return { registered: true, algorithmId: 1, possessionProven: s !== "unproven-key" }; // 1 = ML-DSA-87 on QoreChain
  }

  /* ---------- writes ---------- */

  async registerProject(input: RegisterInput): Promise<TxResult> {
    this.failIfScenario();
    const wallet = getMockWallet();
    if (wallet.scenario === "no-pq-key" || wallet.scenario === "unproven-key") {
      throw new RegistryError("OwnerNotPQRegistered");
    }
    if (!SLUG_REGEX.test(input.slug)) throw new RegistryError("InvalidSlug");
    if (this.projects.some((p) => p.slug === input.slug)) throw new RegistryError("SlugTaken");
    const sk = fromHex(input.signingPubkey);
    const rk = fromHex(input.recoveryPubkey);
    if (sk.length !== ML_DSA_87_PUBKEY_BYTES || rk.length !== ML_DSA_87_PUBKEY_BYTES) {
      throw new RegistryError("BadKeyLength");
    }
    if (input.signingPubkey.toLowerCase() === input.recoveryPubkey.toLowerCase()) {
      throw new RegistryError("SameKey");
    }

    const now = Math.floor(Date.now() / 1000);
    this.projects.push({
      projectId: projectIdOf(input.slug),
      slug: input.slug,
      owner: wallet.address,
      releaseCount: 0,
      latestVersion: null,
      keyEpoch: 1,
      createdAt: now,
      signingKeyPtr: randomHex(20),
      recoveryKeyPtr: randomHex(20),
      signingKeyFingerprint: keyFingerprint(sk),
      recoveryKeyFingerprint: keyFingerprint(rk),
      signingKeyHex: input.signingPubkey,
      recoveryKeyHex: input.recoveryPubkey,
      nextSeq: 1n,
      rotations: [],
    });
    return { txHash: randomHex(32), blockNumber: this.nextBlock() };
  }

  async publish(bundle: SignedBundle): Promise<TxResult> {
    this.failIfScenario();
    const project = this.findProjectById(bundle.projectId);
    this.ensureKeys(project);
    const versionHash = versionHashOf(bundle.version);
    if (this.releases.some((r) => r.projectId === project.projectId && r.versionHash === versionHash)) {
      throw new RegistryError("VersionExists");
    }
    const sig = fromBase64(bundle.signature);
    if (sig.length !== ML_DSA_87_SIGNATURE_BYTES) throw new RegistryError("BadSigLength");

    // The contract signs over its own nextSeq, so a stale bundle fails verification.
    const msg = encodePublishMsg({
      chainId: DIANA_CHAIN_ID,
      registry: MOCK_REGISTRY,
      projectId: project.projectId,
      seq: project.nextSeq,
      version: bundle.version,
      artifactHash: bundle.artifactHash,
      metaHash: bundle.metaHash,
    });
    if (!verifyMessage(sig, msg.bytes, fromHex(project.signingKeyHex))) {
      throw new RegistryError("SignatureInvalid");
    }

    const txHash = randomHex(32);
    this.releases.push({
      releaseId: BigInt(this.releases.length),
      projectId: project.projectId,
      slug: project.slug,
      seq: project.nextSeq,
      keyEpoch: project.keyEpoch,
      publishedAt: Math.floor(Date.now() / 1000),
      version: bundle.version,
      versionHash,
      artifactHash: bundle.artifactHash,
      metaHash: bundle.metaHash,
      notes: bundle.notes,
      signaturePtr: randomHex(20),
      signingKeyPtr: project.signingKeyPtr,
      signingKeyFingerprint: project.signingKeyFingerprint,
      signatureHex: toHex(sig),
      signingKeyHex: project.signingKeyHex,
      publishTxHash: txHash,
      revoked: false,
    });
    project.releaseCount += 1;
    project.latestVersion = bundle.version;
    project.nextSeq += 1n;
    return { txHash, blockNumber: this.nextBlock() };
  }

  async rotateKey(input: RotateInput): Promise<TxResult> {
    this.failIfScenario();
    const project = this.findProjectById(input.projectId);
    this.ensureKeys(project);
    const newKey = fromHex(input.newPubkey);
    if (newKey.length !== ML_DSA_87_PUBKEY_BYTES) throw new RegistryError("BadKeyLength");
    const lower = input.newPubkey.toLowerCase();
    if (lower === project.signingKeyHex.toLowerCase() || lower === project.recoveryKeyHex.toLowerCase()) {
      throw new RegistryError("SameKey");
    }
    const sig = fromHex(input.signature);
    if (sig.length !== ML_DSA_87_SIGNATURE_BYTES) throw new RegistryError("BadSigLength");
    const msg = encodeRotateMsg({
      chainId: DIANA_CHAIN_ID,
      registry: MOCK_REGISTRY,
      projectId: project.projectId,
      keyEpoch: project.keyEpoch,
      newPubkey: input.newPubkey,
      viaRecovery: input.viaRecovery,
    });
    const authority = fromHex(input.viaRecovery ? project.recoveryKeyHex : project.signingKeyHex);
    if (!verifyMessage(sig, msg.bytes, authority)) throw new RegistryError("SignatureInvalid");

    const txHash = randomHex(32);
    project.keyEpoch += 1;
    project.signingKeyHex = input.newPubkey;
    project.signingKeyPtr = randomHex(20);
    project.signingKeyFingerprint = keyFingerprint(newKey);
    project.rotations.push({
      epoch: project.keyEpoch,
      rotatedAt: Math.floor(Date.now() / 1000),
      viaRecovery: input.viaRecovery,
      signingKeyFingerprint: project.signingKeyFingerprint,
      txHash,
    });
    return { txHash, blockNumber: this.nextBlock() };
  }

  async revoke(input: RevokeInput): Promise<TxResult> {
    this.failIfScenario();
    const release = this.releases.find((r) => r.releaseId === input.releaseId);
    if (!release) throw new Error(`Release ${input.releaseId.toString()} not found`);
    if (release.revoked) throw new RegistryError("AlreadyRevoked");
    const project = this.findProjectById(release.projectId);
    this.ensureKeys(project);
    const sig = fromHex(input.signature);
    if (sig.length !== ML_DSA_87_SIGNATURE_BYTES) throw new RegistryError("BadSigLength");
    const msg = encodeRevokeMsg({
      chainId: DIANA_CHAIN_ID,
      registry: MOCK_REGISTRY,
      projectId: project.projectId,
      releaseId: release.releaseId,
      reason: input.reason,
    });
    if (!verifyMessage(sig, msg.bytes, fromHex(project.signingKeyHex))) {
      throw new RegistryError("SignatureInvalid");
    }
    const txHash = randomHex(32);
    release.revoked = true;
    release.revokeReason = input.reason;
    release.revokedAt = Math.floor(Date.now() / 1000);
    release.revokeTxHash = txHash;
    return { txHash, blockNumber: this.nextBlock() };
  }
}
