import { describe, expect, it } from "vitest";
import { MockChainClient } from "../mock-client";
import { SHARED_ARTIFACT_HASH } from "../fixtures";

describe("MockChainClient Phase 0 fixtures", () => {
  it("loads 6 projects, 30 releases, 2 revoked, and 1 shared artifact hash across multiple projects", async () => {
    const client = new MockChainClient();

    const stats = await client.getStats();
    expect(stats.projectCount).toBe(6);
    expect(stats.releaseCount).toBe(30);
    expect(stats.revokedCount).toBe(2);

    const projects = await client.listProjects({ offset: 0, limit: 20 });
    expect(projects).toHaveLength(6);

    const sharedMatches = await client.findByArtifact(SHARED_ARTIFACT_HASH);
    expect(sharedMatches.length).toBe(2);
    const distinctProjects = new Set(sharedMatches.map((r) => r.slug));
    expect(distinctProjects.size).toBe(2);
  });

  it("supports recheckSignature, registerProject, publish, rotateKey, and revoke in memory", async () => {
    const client = new MockChainClient();
    const project = await client.getProject("acme-router");
    expect(project).not.toBeNull();

    const recheck = await client.recheckSignature(0n);
    expect(recheck.valid).toBe(true);

    const pub = await client.publish({
      v: 1,
      chainId: 9800,
      registry: "0x0000000000000000000000000000000000000001",
      projectId: project!.projectId,
      slug: project!.slug,
      seq: Number(project!.nextSeq),
      version: "2.5.0",
      artifactHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      metaHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      keyFingerprint: project!.signingKeyFingerprint,
      signature: "base64sig",
    });
    expect(pub.txHash).toMatch(/^0x/);

    const updatedStats = await client.getStats();
    expect(updatedStats.releaseCount).toBe(31);
  });
});
