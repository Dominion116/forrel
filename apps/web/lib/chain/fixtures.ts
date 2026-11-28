import {
  metaHashOf,
  projectIdOf,
  versionHashOf,
  type Hex,
  type Project,
  type Release,
  type RevokeReasonCode,
} from "@forrel/core";

/**
 * Deterministic demo registry for mock mode.
 *
 * IDs and hashes are computed exactly like the contract will compute them
 * (`projectId = keccak256(slug)`, `versionHash = keccak256(version)`, `metaHash = SHA3-256(notes)`).
 * Keys are real ML-DSA-87 keys derived from public demo seeds (`demoSeed()` in @forrel/core);
 * the fingerprints below are precomputed so listing pages never run keygen. The mock client
 * derives the full public keys and real signatures lazily, only when a page needs them.
 */

function makeHash(tag: number, suffix: number): Hex {
  const a = tag.toString(16).padStart(2, "0");
  const b = suffix.toString(16).padStart(4, "0");
  return `0x${a}${b}${"a5".repeat(29)}` as Hex;
}

function makeAddress(seed: number): Hex {
  const unit = seed.toString(16).padStart(2, "0");
  return `0x${unit.repeat(20)}` as Hex;
}

/** Address the mock registry pretends to live at (it is bound into every signed message). */
export const MOCK_REGISTRY: Hex = "0x5eed00000000000000000000000000000000f0e1";

/** acme-router's owner. The mock wallet connects as this address so owner actions show. */
export const MOCK_OWNER: Hex = makeAddress(0x11);

/** Artifact hash intentionally published under two projects (`acme-router` and `medpump-fw`). */
export const SHARED_ARTIFACT_HASH: Hex =
  "0x4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a";

const BASE_TIME = 1_795_737_600; // 2026-11-27T00:00:00Z reference timestamp (seconds)

/**
 * `keyFingerprint(keypairFromSeed(demoSeed(slug, role, epoch)).publicKey)`.
 * Checked against live derivation in lib/chain/__tests__/mock-client.test.ts.
 */
export const DEMO_FINGERPRINTS: Record<string, { signing: Hex[]; recovery: Hex }> = {
  "acme-router": { signing: ["0xb519f92b563c624f", "0xd45a7e0cb0e8d02b"], recovery: "0xb8fcd455a91e3816" },
  "medpump-fw": { signing: ["0x5abf87f8a4c44595"], recovery: "0x2c5a9362699a75e8" },
  "car-ecu-boot": { signing: ["0x6fa3d3eea7750e4e", "0x3e7907b9e69bd9a5"], recovery: "0xce67c42f2b95fefa" },
  "openkey-cli": { signing: ["0xfec41e92218bb6c5"], recovery: "0xa4203fec73283cb1" },
  "vault-agent": { signing: ["0x890dfb3d2282f936"], recovery: "0xc279de1138ddc3ac" },
};

/** Marker for "not derived yet"; the mock client fills these in on first use. */
export const LAZY_KEY = "0x" as Hex;

interface ProjectSeed {
  slug: string;
  ownerSeed: number;
  versions: string[];
  rotated?: boolean;
}

const PROJECT_SEEDS: ProjectSeed[] = [
  { slug: "acme-router", ownerSeed: 0x11, versions: ["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.4.1"], rotated: true },
  { slug: "medpump-fw", ownerSeed: 0x22, versions: ["1.0.0", "1.0.1", "1.1.0", "1.2.0", "1.2.1"] },
  { slug: "car-ecu-boot", ownerSeed: 0x33, versions: ["4.0.0", "4.1.0", "4.1.1", "4.2.0", "4.3.0"], rotated: true },
  { slug: "openkey-cli", ownerSeed: 0x44, versions: ["0.9.0", "0.9.1", "1.0.0", "1.0.1"] },
  { slug: "vault-agent", ownerSeed: 0x66, versions: ["0.7.0", "0.8.0"] },
];

// Revoke 2 specific releases out of 22: medpump-fw 1.0.1 (idx 7) and openkey-cli 0.9.1 (idx 17)
const REVOKED_MAP = new Map<number, { reason: RevokeReasonCode; offset: number }>([
  [7, { reason: 2, offset: 3600 }],
  [17, { reason: 1, offset: 7200 }],
]);

export function createFixtureData(): { projects: Project[]; releases: Release[] } {
  const projects: Project[] = [];
  const releases: Release[] = [];
  let releaseCounter = 0;

  PROJECT_SEEDS.forEach((seed, pIdx) => {
    const projectId = projectIdOf(seed.slug);
    const createdAt = BASE_TIME - (6 - pIdx) * 86_400;
    const keyEpoch = seed.rotated ? 2 : 1;
    const fps = DEMO_FINGERPRINTS[seed.slug]!;
    const keyPtr = (epoch: number) => makeAddress(0xa0 + pIdx * 4 + epoch);
    const recoveryKeyPtr = makeAddress(0xa0 + pIdx * 4 + 3);
    // Rotation lands between the 2nd and 3rd release, so releases 3+ are epoch 2.
    const rotatedAt = createdAt + 2 * 7_200 + 3_600;

    const rotations = seed.rotated
      ? [
          {
            epoch: 2,
            rotatedAt,
            viaRecovery: seed.slug === "car-ecu-boot",
            signingKeyFingerprint: fps.signing[1]!,
            txHash: makeHash(0x90 + pIdx, 1),
          },
        ]
      : [];

    seed.versions.forEach((version, vIdx) => {
      const publishedAt = createdAt + (vIdx + 1) * 7_200;
      const epoch = seed.rotated && vIdx >= 2 ? 2 : 1;
      const isShared =
        (seed.slug === "acme-router" && vIdx === 0) || (seed.slug === "medpump-fw" && vIdx === 0);
      const artifactHash = isShared ? SHARED_ARTIFACT_HASH : makeHash(0xb0 + pIdx, releaseCounter + 1);
      const rev = REVOKED_MAP.get(releaseCounter);
      const notes = `Release notes for ${seed.slug} v${version}.`;

      releases.push({
        releaseId: BigInt(releaseCounter),
        projectId,
        slug: seed.slug,
        seq: BigInt(vIdx + 1),
        keyEpoch: epoch,
        publishedAt,
        version,
        versionHash: versionHashOf(version),
        artifactHash,
        metaHash: metaHashOf(notes),
        notes,
        signaturePtr: makeAddress(0x30 + releaseCounter),
        signingKeyPtr: keyPtr(epoch),
        signingKeyFingerprint: fps.signing[epoch - 1]!,
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
      signingKeyPtr: keyPtr(keyEpoch),
      recoveryKeyPtr,
      signingKeyFingerprint: fps.signing[keyEpoch - 1]!,
      recoveryKeyFingerprint: fps.recovery,
      signingKeyHex: LAZY_KEY,
      recoveryKeyHex: LAZY_KEY,
      nextSeq: BigInt(seed.versions.length + 1),
      rotations,
    });
  });

  return { projects, releases };
}
