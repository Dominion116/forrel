import type {
  EvmWindowStatus,
  Hex,
  Page,
  PqcKeyStatus,
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

/**
 * Data access interface for the Forrel registry.
 * Implemented by `MockChainClient` (Phases 0-2) and `LiveChainClient` (Phase 5+).
 */
export interface ChainClient {
  readonly mode: "mock" | "live";

  // Read operations (wallet-free)
  getStats(): Promise<RegistryStats>;
  listProjects(page: Page): Promise<ProjectSummary[]>;
  getProject(slug: string): Promise<Project | null>;
  listReleases(projectId: Hex, page: Page): Promise<Release[]>;
  listRecentReleases(page: Page): Promise<Release[]>;
  getReleaseById(releaseId: bigint): Promise<Release | null>;
  findByArtifact(hash: Hex): Promise<Release[]>;
  recheckSignature(releaseId: bigint): Promise<{ valid: boolean; checkedAtBlock: bigint }>;
  getWindowStatus(addr: Hex): Promise<EvmWindowStatus>;
  /** `pqcKeyStatus(addr)`: is an ML-DSA-87 key registered and possession-proven for this account? */
  getKeyStatus(addr: Hex): Promise<PqcKeyStatus>;

  // Write operations (QoreX)
  registerProject(input: RegisterInput): Promise<TxResult>;
  publish(bundle: SignedBundle): Promise<TxResult>;
  rotateKey(input: RotateInput): Promise<TxResult>;
  revoke(input: RevokeInput): Promise<TxResult>;
}
