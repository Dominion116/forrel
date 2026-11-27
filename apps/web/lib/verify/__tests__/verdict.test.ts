import { describe, expect, it } from "vitest";

import { MockChainClient, SHARED_ARTIFACT_HASH } from "@/lib/chain";
import { normalizeHash, resolveVerdict } from "../verdict";

const H = "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a";

describe("normalizeHash", () => {
  it("accepts bare, prefixed, upper-case and padded input", () => {
    expect(normalizeHash(H)).toBe(`0x${H}`);
    expect(normalizeHash(`0x${H}`)).toBe(`0x${H}`);
    expect(normalizeHash(`  0X${H.toUpperCase()}\n`)).toBe(`0x${H}`);
  });

  it("rejects wrong lengths and non-hex", () => {
    expect(normalizeHash(H.slice(1))).toBeNull();
    expect(normalizeHash(`${H}0`)).toBeNull();
    expect(normalizeHash(`${H.slice(1)}g`)).toBeNull();
    expect(normalizeHash("")).toBeNull();
  });
});

describe("resolveVerdict against the mock registry", () => {
  const client = new MockChainClient();

  async function verdictFor(hash: `0x${string}`) {
    const matches = await client.findByArtifact(hash);
    const project = matches[0] ? await client.listReleases(matches[0].projectId, { offset: 0, limit: 100 }) : [];
    return resolveVerdict(hash, matches, project);
  }

  it("returns unknown for a hash that was never published", async () => {
    const v = await verdictFor(`0x${"00".repeat(32)}`);
    expect(v.kind).toBe("unknown");
  });

  it("returns multiple for the hash shared by two projects", async () => {
    const v = await verdictFor(SHARED_ARTIFACT_HASH);
    expect(v.kind).toBe("multiple");
    if (v.kind === "multiple") expect(new Set(v.matches.map((m) => m.slug)).size).toBe(2);
  });

  it("returns verified for an unrevoked release", async () => {
    const recent = await client.listRecentReleases({ offset: 0, limit: 30 });
    const ok = recent.find((r) => !r.revoked && r.artifactHash !== SHARED_ARTIFACT_HASH)!;
    const v = await verdictFor(ok.artifactHash);
    expect(v.kind).toBe("verified");
  });

  it("returns revoked with the newest unrevoked release of the same project", async () => {
    const recent = await client.listRecentReleases({ offset: 0, limit: 30 });
    const bad = recent.find((r) => r.revoked)!;
    const v = await verdictFor(bad.artifactHash);
    expect(v.kind).toBe("revoked");
    if (v.kind === "revoked") {
      expect(v.newer?.slug).toBe(bad.slug);
      expect(v.newer!.publishedAt).toBeGreaterThan(bad.publishedAt);
      expect(v.newer!.revoked).toBe(false);
    }
  });
});
