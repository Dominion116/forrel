/** Small display helpers shared by the landing page and the app. */

/** `0x4b22…bf8a`: keep the prefix plus `head` and `tail` hex chars. */
export function shortHash(hash: string, head = 6, tail = 4): string {
  const body = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (body.length <= head + tail) return hash;
  return `0x${body.slice(0, head)}…${body.slice(-tail)}`;
}

/** "just now", "12 min ago", "3 h ago", "4 d ago". `now` and `then` are unix seconds. */
export function timeAgo(then: number, now: number = Math.floor(Date.now() / 1000)): string {
  const s = Math.max(0, now - then);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

/** "27 Nov 2026, 14:02 UTC". */
export function formatUtc(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${date}, ${time} UTC`;
}

/** "1,482,910". */
export function formatInt(n: number | bigint): string {
  return n.toLocaleString("en-US");
}
