import {
  DIANA_CHAIN_ID,
  demoSeed,
  encodePublishMsg,
  encodeRevokeMsg,
  generateSeed,
  isRegistryError,
  keypairFromSeed,
  metaHashOf,
  signMessage,
  toBase64,
  toHex,
  type Hex,
} from "@forrel/core";
import { describe, expect, it } from "vitest";

import { DEMO_FINGERPRINTS, MOCK_REGISTRY, SHARED_ARTIFACT_HASH } from "../fixtures";
import { MockChainClient } from "../mock-client";

const ARTIFACT = `0x${"aa".repeat(32)}` as Hex;

describe("MockChainClient fixtures", () => {
  it("loads 5 projects, 22 releases, 2 revoked, and 1 shared artifact hash across multiple projects", async () => {
    const client = new MockChainClient();
    const stats = await client.getStats();
    expect(stats.projectCount).toBe(5);
    expect(stats.releaseCount).toBe(22);
    expect(stats.revokedCount).toBe(2);
    expect(await client.listProjects({ offset: 0, limit: 20 })).toHaveLength(5);

    const shared = await client.findByArtifact(SHARED_ARTIFACT_HASH);
    expect(new Set(shared.map((r) => r.slug)).size).toBe(2);
  });

  it("derives demo keys that match the precomputed fingerprints", async () => {
    const client = new MockChainClient();
    for (const slug of Object.keys(DEMO_FINGERPRINTS)) {
      const p = (await client.getProject(slug))!;
      expect(p.signingKeyHex.length).toBe(2 + 2592 * 2);
      expect(p.signingKeyFingerprint).toBe(DEMO_FINGERPRINTS[slug]!.signing[p.keyEpoch - 1]);
    }
  });

  it("re-checks a fixture signature with real ML-DSA-87", async () => {
    const client = new MockChainClient();
    const r = await client.recheckSignature(0n);
    expect(r.valid).toBe(true);
  });
});

describe("MockChainClient writes are signature-gated", () => {
  async function signedBundle(client: MockChainClient, version: string, seed = demoSeed("acme-router", "signing", 2)) {
    const project = (await client.getProject("acme-router"))!;
    const metaHash = metaHashOf("");
    const msg = encodePublishMsg({
      chainId: DIANA_CHAIN_ID,
      registry: MOCK_REGISTRY,
      projectId: project.projectId,
      seq: project.nextSeq,
      version,
      artifactHash: ARTIFACT,
      metaHash,
    });
    const { secretKey } = keypairFromSeed(seed);
    return {
      v: 1 as const,
      chainId: DIANA_CHAIN_ID,
      registry: MOCK_REGISTRY,
      projectId: project.projectId,
      slug: project.slug,
      seq: Number(project.nextSeq),
      version,
      artifactHash: ARTIFACT,
      metaHash,
      keyFingerprint: project.signingKeyFingerprint,
      signature: toBase64(signMessage(msg.bytes, secretKey)),
    };
  }

  it("accepts a publish signed by the current key", async () => {
    const client = new MockChainClient();
    const tx = await client.publish(await signedBundle(client, "2.5.0"));
    expect(tx.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect((await client.getStats()).releaseCount).toBe(31);
  });

  it("rejects a publish signed by another key with SignatureInvalid", async () => {
    const client = new MockChainClient();
    const bundle = await signedBundle(client, "2.5.0", generateSeed());
    await expect(client.publish(bundle)).rejects.toSatisfy(
      (e: unknown) => isRegistryError(e) && e.code === "SignatureInvalid",
    );
  });

  it("rejects a duplicate version with VersionExists", async () => {
    const client = new MockChainClient();
    await expect(client.publish(await signedBundle(client, "2.4.1"))).rejects.toSatisfy(
      (e: unknown) => isRegistryError(e) && e.code === "VersionExists",
    );
  });

  it("revokes with a signature from the current key, and only once", async () => {
    const client = new MockChainClient();
    const project = (await client.getProject("acme-router"))!;
    const release = (await client.listReleases(project.projectId, { offset: 0, limit: 1 }))[0]!;
    const msg = encodeRevokeMsg({
      chainId: DIANA_CHAIN_ID,
      registry: MOCK_REGISTRY,
      projectId: project.projectId,
      releaseId: release.releaseId,
      reason: 3,
    });
    const { secretKey } = keypairFromSeed(demoSeed("acme-router", "signing", 2));
    const signature = toHex(signMessage(msg.bytes, secretKey));
    await client.revoke({ releaseId: release.releaseId, reason: 3, signature });
    expect((await client.getReleaseById(release.releaseId))!.revoked).toBe(true);
    await expect(client.revoke({ releaseId: release.releaseId, reason: 3, signature })).rejects.toSatisfy(
      (e: unknown) => isRegistryError(e) && e.code === "AlreadyRevoked",
    );
  });
});
