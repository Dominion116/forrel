"use client";

import type { Hex } from "@forrel/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getChainClient } from "./index";

/**
 * Client-side registry reads (react-query). Everything is keyed under ["registry", …] so a
 * single invalidation refreshes every view after a write.
 */

export function useRegistryStats() {
  return useQuery({
    queryKey: ["registry", "stats"],
    queryFn: () => getChainClient().getStats(),
    refetchInterval: 30_000,
  });
}

export function useRecentReleases(limit = 5, offset = 0) {
  return useQuery({
    queryKey: ["registry", "recent", limit, offset],
    queryFn: () => getChainClient().listRecentReleases({ offset, limit }),
    refetchInterval: 30_000,
  });
}

export function useProjects(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["registry", "projects", limit, offset],
    queryFn: () => getChainClient().listProjects({ offset, limit }),
  });
}

export function useProject(slug: string | null) {
  return useQuery({
    queryKey: ["registry", "project", slug],
    queryFn: () => getChainClient().getProject(slug!),
    enabled: Boolean(slug),
  });
}

export function useProjectReleases(projectId: Hex | undefined, limit = 200) {
  return useQuery({
    queryKey: ["registry", "project-releases", projectId, limit],
    queryFn: () => getChainClient().listReleases(projectId!, { offset: 0, limit }),
    enabled: Boolean(projectId),
  });
}

export function useRelease(releaseId: bigint | undefined) {
  return useQuery({
    queryKey: ["registry", "release", releaseId?.toString()],
    queryFn: () => getChainClient().getReleaseById(releaseId!),
    enabled: releaseId !== undefined,
  });
}

/** Call after any write so every registry view refetches. */
export function useInvalidateRegistry() {
  const qc = useQueryClient();
  return useCallback(() => qc.invalidateQueries({ queryKey: ["registry"] }), [qc]);
}

export { useNow } from "./use-now";
