"use client";

import { useEffect, useState } from "react";

/** Current unix time in seconds, refreshed every `ms`. `null` until mounted (no hydration drift). */
export function useNow(ms = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
