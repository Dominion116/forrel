import type { Hex, Project, Release, RevokeReasonCode } from "@forrel/core";

function padHex(seed: number, bytes: number): Hex {
  const unit = seed.toString(16).padStart(2, "0");
  return `0x${unit.repeat(bytes)}` as Hex;
}

function makeHash(tag: number, suffix: number): Hex {
  const a = tag.toString(16).padStart(2, "0");
  const b = suffix.toString(16).padStart(4, "0");
  return `0x${a}${b}${"a5".repeat(29)}` as Hex;
}

function makeAddress(seed: number): Hex {
  const unit = seed.toString(16).padStart(2, "0");
  return `0x${unit.repeat(20)}` as Hex;
}

function makeFingerprint(seed: number): Hex {
  const unit = seed.toString(16).padStart(2, "0");
  return `0x${unit.repeat(8)}` as Hex;
}

/** Artifact hash intentionally published under two projects (`acme-router` and `grid-relay`). */
export const SHARED_ARTIFACT_HASH: Hex =
  "0x4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a";

const BASE_TIME = 1_795_737_600; // 2026-11-27T00:00:00Z reference timestamp (seconds)

interface ProjectSeed {
  slug: string;
  ownerSeed: number;
  versions: string[];
  rotated?: boolean;
}

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    slug: "acme-router",
    ownerSeed: 0x11,
    versions: ["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.4.1"],
    rotated: true,
  },
  {
    slug: "medpump-fw",
    ownerSeed: 0x22,
    versions: ["1.0.0", "1.0.1", "1.1.0", "1.2.0", "1.2.1"],
  },
  {
    slug: "car-ecu-boot",
    ownerSeed: 0x33,
    versions: ["4.0.0", "4.1.0", "4.1.1", "4.2.0", "4.3.0"],
    rotated: true,
  },
  {
    slug: "openkey-cli",
    ownerSeed: 0x44,
    versions: ["0.9.0", "0.9.1", "1.0.0", "1.0.1", "1.1.0"],
  },
  {
    slug: "grid-relay",
    ownerSeed: 0x55,
    versions: ["3.1.0", "3.2.0", "3.3.0", "3.4.0", "3.4.1"],
  },
  {
    slug: "vault-agent",
    ownerSeed: 0x66,
    versions: ["0.5.0", "0.6.0", "0.7.0", "0.8.0"],
  },
];

// Revoke 2 specific releases out of 30: medpump-fw 1.0.1 (idx 7) and openkey-cli 0.9.1 (idx 17)
const REVOKED_MAP = new Map<number, { reason: RevokeReasonCode; offset: number }>([
  [7, { reason: 2, offset: 3600 }],
  [17, { reason: 1, offset: 7200 }],
]);

export function createFixtureData(): { projects: Project[]; releases: Release[] } {
  const projects: Project[] = [];
  const releases: Release[] = [];
  let releaseCounter = 0;

  PROJECT_SEEDS.forEach((seed, pIdx) => {
    const projectId = makeHash(0x10 + pIdx, pIdx + 1);
    const createdAt = BASE_TIME - (6 - pIdx) * 86_400;
    const keyEpoch = seed.rotated ? 2 : 1;
    const signingKeyPtr = makeAddress(0xa0 + pIdx * 2);
    const recoveryKeyPtr = makeAddress(0xa1 + pIdx * 2);
    const signingKeyFingerprint = makeFingerprint(0x70 + pIdx * 2 + (seed.rotated ? 1 : 0));
    const recoveryKeyFingerprint = makeFingerprint(0x80 + pIdx * 2);

    const rotations = seed.rotated
      ? [
          {
            epoch: 2,
            rotatedAt: createdAt + 43_200,
            viaRecovery: pIdx === 2,
            signingKeyFingerprint,
            txHash: makeHash(0x90 + pIdx, 1),
          },
        ]
      : [];

    seed.versions.forEach((version, vIdx) => {
      const id = BigInt(releaseCounter);
      const publishedAt = createdAt + (vIdx + 1) * 7_200;
      const isShared =
        (seed.slug === "acme-router" && vIdx === 0) ||
        (seed.slug === "grid-relay" && vIdx === 0);

      const artifactHash = isShared ? SHARED_ARTIFACT_HASH : makeHash(0xb0 + pIdx, releaseCounter + 1);
      const rev = REVOKED_MAP.get(releaseCounter);

      releases.push({
        releaseId: id,
        projectId,
        slug: seed.slug,
        seq: BigInt(vIdx + 1),
        keyEpoch: seed.rotated && vIdx >= 2 ? 2 : 1,
        publishedAt,
        version,
        versionHash: makeHash(0xc0 + pIdx, vIdx + 1),
        artifactHash,
        metaHash: makeHash(0xd0 + pIdx, vIdx + 1),
        notes: `Deterministic release notes for ${seed.slug} v${version}.`,
        signaturePtr: makeAddress(0x30 + releaseCounter),
        signingKeyPtr,
        signingKeyFingerprint,
        signatureHex: padHex(0x42, 64),
        signingKeyHex: padHex(0x24, 64),
        publishTxHash: makeHash(0xe0 + pIdx, releaseCounter + 1),
        revoked: Boolean(rev),
        revokeReason: rev?.reason,
        revokedAt: rev ? publishedAt + rev.offset : undefined,
        revokeTxHash: rev ? makeHash(0xf0, releaseCounter + 1) : undefined,
      });

      releaseCounter += 1;
    });

    projects.push({
      projectId,
      slug: seed.slug,
      owner: makeAddress(seed.ownerSeed),
      releaseCount: seed.versions.length,
      latestVersion: seed.versions[seed.versions.length - 1] ?? null,
      keyEpoch,
      createdAt,
      signingKeyPtr,
      recoveryKeyPtr,
      signingKeyFingerprint,
      recoveryKeyFingerprint,
      signingKeyHex: padHex(0x24 + pIdx, 64),
      recoveryKeyHex: padHex(0x54 + pIdx, 64),
      nextSeq: BigInt(seed.versions.length + 1),
      rotations,
    });
  });

  return { projects, releases };
}
