import {
  REVOKE_REASONS,
  forrelRegistryAbi,
  type Hex,
  type RevokeReasonCode,
} from "@forrel/core";

import {
  createDianaPublicClient,
  decodeContractError,
  resolveRegistryAddress,
  resolveRpcUrl,
} from "../lib/env";
import { hashFile } from "../lib/io";

export interface VerifyOptions {
  project?: string;
  rpc?: string;
  registry?: string;
  json?: boolean;
  recheck?: boolean;
}

type ReleaseTuple = {
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

type ProjectTuple = {
  slug: string;
};

export interface VerifyMatch {
  releaseId: string;
  slug: string;
  version: string;
  keyEpoch: number;
  publishedAt: number;
  revoked: boolean;
  revokeReason?: string;
  rechecked?: boolean;
}

/** Exit codes per PRD §14: 0 verified, 1 unknown, 2 revoked, 3 error. */
export async function runVerify(file: string, opts: VerifyOptions): Promise<number> {
  const artifactHash = await hashFile(file);
  const registry = resolveRegistryAddress(opts.registry);
  const client = createDianaPublicClient(resolveRpcUrl(opts.rpc));

  try {
    const ids = (await client.readContract({
      address: registry,
      abi: forrelRegistryAbi,
      functionName: "releasesOfArtifact",
      args: [artifactHash, 0n, 100n],
    })) as bigint[];

    if (ids.length === 0) {
      return emitResult(opts.json, {
        verdict: "unknown",
        exitCode: 1,
        artifactHash,
        matches: [],
      });
    }

    const rows = await Promise.all(
      ids.map(async (id) => {
        const rel = (await client.readContract({
          address: registry,
          abi: forrelRegistryAbi,
          functionName: "getRelease",
          args: [id],
        })) as ReleaseTuple;
        const proj = (await client.readContract({
          address: registry,
          abi: forrelRegistryAbi,
          functionName: "getProject",
          args: [rel.projectId],
        })) as ProjectTuple;
        return { id, rel, slug: proj.slug };
      }),
    );

    const filtered = opts.project ? rows.filter((r) => r.slug === opts.project) : rows;
    if (filtered.length === 0) {
      return emitResult(opts.json, {
        verdict: "unknown",
        exitCode: 1,
        artifactHash,
        matches: [],
      });
    }

    filtered.sort((a, b) => Number(b.rel.publishedAt - a.rel.publishedAt));
    const latest = filtered[0]!;

    let rechecked: boolean | undefined;
    if (!latest.rel.revoked && opts.recheck !== false) {
      rechecked = (await client.readContract({
        address: registry,
        abi: forrelRegistryAbi,
        functionName: "recheck",
        args: [latest.id],
      })) as boolean;
      if (!rechecked) {
        return emitResult(opts.json, {
          verdict: "error",
          exitCode: 3,
          artifactHash,
          error: "On-chain pqcVerify recheck returned false.",
          matches: [],
        });
      }
    }

    const matches: VerifyMatch[] = filtered.map((r, i) => ({
      releaseId: r.id.toString(),
      slug: r.slug,
      version: r.rel.version,
      keyEpoch: Number(r.rel.keyEpoch),
      publishedAt: Number(r.rel.publishedAt),
      revoked: r.rel.revoked,
      revokeReason: r.rel.revoked
        ? REVOKE_REASONS[r.rel.revokeReason as RevokeReasonCode] ?? String(r.rel.revokeReason)
        : undefined,
      ...(i === 0 && rechecked !== undefined ? { rechecked } : {}),
    }));

    if (latest.rel.revoked) {
      return emitResult(opts.json, {
        verdict: "revoked",
        exitCode: 2,
        artifactHash,
        matches,
      });
    }

    return emitResult(opts.json, {
      verdict: "verified",
      exitCode: 0,
      artifactHash,
      matches,
    });
  } catch (err) {
    const decoded = decodeContractError(err);
    return emitResult(opts.json, {
      verdict: "error",
      exitCode: 3,
      artifactHash,
      error: decoded.message,
      matches: [],
    });
  }
}

function emitResult(
  asJson: boolean | undefined,
  payload: {
    verdict: "verified" | "unknown" | "revoked" | "error";
    exitCode: number;
    artifactHash: Hex;
    error?: string;
    matches: VerifyMatch[];
  },
): number {
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return payload.exitCode;
  }

  if (payload.verdict === "verified") {
    const m = payload.matches[0]!;
    console.log(`VERIFIED: ${m.slug} v${m.version} (epoch ${m.keyEpoch})`);
    console.log(`  artifactHash: ${payload.artifactHash}`);
    if (m.rechecked) console.log("  signature:    pqcVerify ✓ (live eth_call)");
    if (payload.matches.length > 1) {
      console.log(`  note:         ${payload.matches.length} total matching releases on-chain`);
    }
  } else if (payload.verdict === "revoked") {
    const m = payload.matches[0]!;
    console.error(`REVOKED: ${m.slug} v${m.version} (${m.revokeReason ?? "unspecified"})`);
    console.error(`  artifactHash: ${payload.artifactHash}`);
  } else if (payload.verdict === "unknown") {
    console.error("UNKNOWN: no matching release found on-chain.");
    console.error(`  artifactHash: ${payload.artifactHash}`);
  } else {
    console.error(`ERROR: ${payload.error ?? "verification failed"}`);
    console.error(`  artifactHash: ${payload.artifactHash}`);
  }
  return payload.exitCode;
}
