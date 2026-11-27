import type {
  EvmWindowStatus,
  Hex,
  Page,
  Project,
  ProjectSummary,
  RegisterInput,
  RegistryStats,
  Release,
  RevokeInput,
  RotateInput,
  SignedBundle,
  TxResult,
} from "@forrel/core";
import { createFixtureData } from "./fixtures";
import type { ChainClient } from "./types";

/**
 * Deterministic in-memory registry adapter for Phases 0-2 UI development.
 * Initialized with 6 projects, 30 releases, 2 revoked releases, and 1 shared artifact hash.
 */
export class MockChainClient implements ChainClient {
  readonly mode = "mock" as const;

  private projects: Project[];
  private releases: Release[];
  private latestBlock = 1_482_910n;

  constructor() {
    const { projects, releases } = createFixtureData();
    this.projects = projects;
    this.releases = releases;
  }

  async getStats(): Promise<RegistryStats> {
    const revokedCount = this.releases.filter((r) => r.revoked).length;
    const lastPublishedAt =
      this.releases.length > 0
        ? Math.max(...this.releases.map((r) => r.publishedAt))
        : null;

    return {
      projectCount: this.projects.length,
      releaseCount: this.releases.length,
      revokedCount,
      latestBlock: this.latestBlock,
      lastPublishedAt,
    };
  }

  async listProjects(page: Page): Promise<ProjectSummary[]> {
    const slice = this.projects.slice(page.offset, page.offset + page.limit);
    return slice.map((p) => ({
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
    return this.projects.find((p) => p.slug === slug) ?? null;
  }

  async listReleases(projectId: Hex, page: Page): Promise<Release[]> {
    const matching = this.releases
      .filter((r) => r.projectId.toLowerCase() === projectId.toLowerCase())
      .sort((a, b) => Number(b.seq - a.seq));
    return matching.slice(page.offset, page.offset + page.limit);
  }

  async listRecentReleases(page: Page): Promise<Release[]> {
    const sorted = [...this.releases].sort((a, b) => b.publishedAt - a.publishedAt);
    return sorted.slice(page.offset, page.offset + page.limit);
  }

  async getReleaseById(releaseId: bigint): Promise<Release | null> {
    return this.releases.find((r) => r.releaseId === releaseId) ?? null;
  }

  async findByArtifact(hash: Hex): Promise<Release[]> {
    const normalized = hash.toLowerCase();
    return this.releases.filter((r) => r.artifactHash.toLowerCase() === normalized);
  }

  async recheckSignature(
    releaseId: bigint,
  ): Promise<{ valid: boolean; checkedAtBlock: bigint }> {
    const exists = this.releases.some((r) => r.releaseId === releaseId);
    if (!exists) {
      throw new Error(`Release ${releaseId.toString()} not found`);
    }
    this.latestBlock += 1n;
    return { valid: true, checkedAtBlock: this.latestBlock };
  }

  async getWindowStatus(_addr: Hex): Promise<EvmWindowStatus> {
    return {
      found: true,
      live: true,
      remainingBlocks: 540n,
      remainingTxs: 4n,
      remainingValue: 15_000_000_000_000_000_000n,
    };
  }

  async registerProject(input: RegisterInput): Promise<TxResult> {
    if (this.projects.some((p) => p.slug === input.slug)) {
      throw new Error(`Slug "${input.slug}" is already taken`);
    }
    const idx = this.projects.length + 1;
    const hexByte = (idx & 0xff).toString(16).padStart(2, "0");
    const projectId = `0x${hexByte.repeat(32)}` as Hex;
    const now = Math.floor(Date.now() / 1000);

    this.projects.push({
      projectId,
      slug: input.slug,
      owner: `0x${hexByte.repeat(20)}` as Hex,
      releaseCount: 0,
      latestVersion: null,
      keyEpoch: 1,
      createdAt: now,
      signingKeyPtr: `0x${hexByte.repeat(20)}` as Hex,
      recoveryKeyPtr: `0x${hexByte.repeat(20)}` as Hex,
      signingKeyFingerprint: `0x${input.signingPubkey.slice(2, 18)}` as Hex,
      recoveryKeyFingerprint: `0x${input.recoveryPubkey.slice(2, 18)}` as Hex,
      signingKeyHex: input.signingPubkey,
      recoveryKeyHex: input.recoveryPubkey,
      nextSeq: 1n,
      rotations: [],
    });

    this.latestBlock += 1n;
    return {
      txHash: `0x${hexByte.repeat(32)}` as Hex,
      blockNumber: this.latestBlock,
    };
  }

  async publish(bundle: SignedBundle): Promise<TxResult> {
    const project = this.projects.find((p) => p.slug === bundle.slug);
    if (!project) {
      throw new Error(`Unknown project "${bundle.slug}"`);
    }
    const releaseId = BigInt(this.releases.length);
    const now = Math.floor(Date.now() / 1000);
    const txHash = `0x${((this.releases.length + 1) & 0xff).toString(16).padStart(2, "0").repeat(32)}` as Hex;

    this.releases.push({
      releaseId,
      projectId: project.projectId,
      slug: project.slug,
      seq: BigInt(bundle.seq),
      keyEpoch: project.keyEpoch,
      publishedAt: now,
      version: bundle.version,
      versionHash: txHash,
      artifactHash: bundle.artifactHash,
      metaHash: bundle.metaHash,
      notes: bundle.notes,
      signaturePtr: project.signingKeyPtr,
      signingKeyPtr: project.signingKeyPtr,
      signingKeyFingerprint: bundle.keyFingerprint,
      publishTxHash: txHash,
      revoked: false,
    });

    project.releaseCount += 1;
    project.latestVersion = bundle.version;
    project.nextSeq += 1n;
    this.latestBlock += 1n;

    return { txHash, blockNumber: this.latestBlock };
  }

  async rotateKey(input: RotateInput): Promise<TxResult> {
    const project = this.projects.find(
      (p) => p.projectId.toLowerCase() === input.projectId.toLowerCase(),
    );
    if (!project) {
      throw new Error("Unknown project");
    }
    project.keyEpoch += 1;
    project.signingKeyHex = input.newPubkey;
    project.signingKeyFingerprint = `0x${input.newPubkey.slice(2, 18)}` as Hex;
    this.latestBlock += 1n;
    const txHash = `0x${(project.keyEpoch & 0xff).toString(16).padStart(2, "0").repeat(32)}` as Hex;

    project.rotations.push({
      epoch: project.keyEpoch,
      rotatedAt: Math.floor(Date.now() / 1000),
      viaRecovery: input.viaRecovery,
      signingKeyFingerprint: project.signingKeyFingerprint,
      txHash,
    });

    return { txHash, blockNumber: this.latestBlock };
  }

  async revoke(input: RevokeInput): Promise<TxResult> {
    const release = this.releases.find((r) => r.releaseId === input.releaseId);
    if (!release) {
      throw new Error(`Release ${input.releaseId.toString()} not found`);
    }
    if (release.revoked) {
      throw new Error("Release already revoked");
    }
    this.latestBlock += 1n;
    const txHash = `0x${(Number(input.releaseId + 1n) & 0xff).toString(16).padStart(2, "0").repeat(32)}` as Hex;
    release.revoked = true;
    release.revokeReason = input.reason;
    release.revokedAt = Math.floor(Date.now() / 1000);
    release.revokeTxHash = txHash;

    return { txHash, blockNumber: this.latestBlock };
  }
}
