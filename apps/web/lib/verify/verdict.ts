import type { Hex, Release } from "@forrel/core";

/**
 * The five outcomes of a verify lookup (PRD §11.2).
 * Pure functions only, so the widget, `/app/verify` and the CLI wording stay in sync.
 */
export type Verdict =
  | { kind: "verified"; hash: Hex; release: Release }
  | { kind: "revoked"; hash: Hex; release: Release; newer: Release | null }
  | { kind: "multiple"; hash: Hex; matches: Release[] }
  | { kind: "unknown"; hash: Hex }
  | { kind: "error"; hash: Hex | null; message: string };

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * Accept 64 hex chars with or without `0x`, any case, surrounding whitespace.
 * Returns the lowercase `0x…` form, or `null` when the input is not a SHA3-256 digest.
 */
export function normalizeHash(input: string): Hex | null {
  const trimmed = input.trim().toLowerCase();
  const body = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  return HEX64.test(body) ? (`0x${body}` as Hex) : null;
}

/**
 * Turn the registry's matches for one artifact hash into a verdict.
 *
 * - No matches → unknown.
 * - Matches in more than one project, or several versions → multiple (each keeps its own status).
 * - One match → verified, or revoked with a pointer to the newest unrevoked release
 *   of the same project when `projectReleases` is given.
 */
export function resolveVerdict(
  hash: Hex,
  matches: Release[],
  projectReleases: Release[] = [],
): Verdict {
  if (matches.length === 0) return { kind: "unknown", hash };

  if (matches.length > 1) {
    const sorted = [...matches].sort((a, b) => b.publishedAt - a.publishedAt);
    return { kind: "multiple", hash, matches: sorted };
  }

  const release = matches[0]!;
  if (!release.revoked) return { kind: "verified", hash, release };

  const newer =
    projectReleases
      .filter(
        (r) =>
          r.projectId === release.projectId && !r.revoked && r.publishedAt > release.publishedAt,
      )
      .sort((a, b) => b.publishedAt - a.publishedAt)[0] ?? null;

  return { kind: "revoked", hash, release, newer };
}
