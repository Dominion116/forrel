"use client";

import { useQuery } from "@tanstack/react-query";

import { getChainClient } from "./index";

/**
 * Client-side registry reads. The landing page is static, so live numbers load after
 * the hero has painted (PRD §10: LCP first, chain data second).
 */
export function useRegistryStats() {
  return useQuery({
    queryKey: ["registry", "stats"],
    queryFn: () => getChainClient().getStats(),
    refetchInterval: 30_000,
  });
}

export function useRecentReleases(limit = 5) {
  return useQuery({
    queryKey: ["registry", "recent", limit],
    queryFn: () => getChainClient().listRecentReleases({ offset: 0, limit }),
    refetchInterval: 30_000,
  });
}

/** Re-render every `ms` so "12 min ago" labels stay honest. */
export { useNow } from "./use-now";
