/**
 * Rough passphrase strength: estimated entropy from length × character pool, with penalties
 * for repeats and very common words. Good enough to steer people toward long passphrases;
 * scrypt (N = 2^17) does the real work against guessing.
 */
export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; bits: number; ok: boolean; hint: string };

const COMMON = ["password", "passphrase", "qwerty", "123456", "letmein", "forrel", "admin", "welcome", "secret"];

export const MIN_PASSPHRASE_LENGTH = 12;

export function passphraseStrength(p: string): Strength {
  if (!p) return { score: 0, label: "Empty", bits: 0, ok: false, hint: `Use at least ${MIN_PASSPHRASE_LENGTH} characters.` };
  let pool = 0;
  if (/[a-z]/.test(p)) pool += 26;
  if (/[A-Z]/.test(p)) pool += 26;
  if (/[0-9]/.test(p)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(p)) pool += 33;
  const unique = new Set(p).size;
  let bits = Math.log2(Math.max(pool, 2)) * p.length * Math.min(1, unique / Math.max(4, p.length * 0.5));
  const lower = p.toLowerCase();
  if (COMMON.some((w) => lower.includes(w))) bits -= 20;
  bits = Math.max(0, Math.round(bits));

  const score: Strength["score"] = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  const label = ["Very weak", "Weak", "Fair", "Good", "Strong"][score]!;
  const ok = p.length >= MIN_PASSPHRASE_LENGTH && score >= 3;
  const hint =
    p.length < MIN_PASSPHRASE_LENGTH
      ? `Use at least ${MIN_PASSPHRASE_LENGTH} characters. Four random words work well.`
      : score < 3
        ? "Add more words or characters. Avoid common words and repeats."
        : "Good. Store it in a password manager.";
  return { score, label, bits, ok, hint };
}
