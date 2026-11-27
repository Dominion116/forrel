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
import type { ChainClient } from "./types";

function notImplemented(): never {
  throw new Error("LiveChainClient is scheduled for Phase 5 after contract deployment.");
}

/**
 * Live QoreChain Diana adapter placeholder (implemented in Phase 5).
 */
export class LiveChainClient implements ChainClient {
  readonly mode = "live" as const;

  getStats(): Promise<RegistryStats> {
    return notImplemented();
  }
  listProjects(_page: Page): Promise<ProjectSummary[]> {
    return notImplemented();
  }
  getProject(_slug: string): Promise<Project | null> {
    return notImplemented();
  }
  listReleases(_projectId: Hex, _page: Page): Promise<Release[]> {
    return notImplemented();
  }
  listRecentReleases(_page: Page): Promise<Release[]> {
    return notImplemented();
  }
  getReleaseById(_releaseId: bigint): Promise<Release | null> {
    return notImplemented();
  }
  findByArtifact(_hash: Hex): Promise<Release[]> {
    return notImplemented();
  }
  recheckSignature(_releaseId: bigint): Promise<{ valid: boolean; checkedAtBlock: bigint }> {
    return notImplemented();
  }
  getKeyStatus(_addr: Hex): Promise<PqcKeyStatus> {
    return notImplemented();
  }
  getWindowStatus(_addr: Hex): Promise<EvmWindowStatus> {
    return notImplemented();
  }
  registerProject(_input: RegisterInput): Promise<TxResult> {
    return notImplemented();
  }
  publish(_bundle: SignedBundle): Promise<TxResult> {
    return notImplemented();
  }
  rotateKey(_input: RotateInput): Promise<TxResult> {
    return notImplemented();
  }
  revoke(_input: RevokeInput): Promise<TxResult> {
    return notImplemented();
  }
}
