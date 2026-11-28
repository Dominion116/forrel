/**
 * QoreChain window values are in uqor (1 QOR = 1,000,000 uqor, 6 decimals), as returned by
 * `/qorechain/pqc/v1/evm_window/{address}`. "15000000" → "15.00 QOR".
 */
export function formatQor(value: bigint, decimals = 6): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = ((value % base) * 100n) / base;
  return `${whole.toLocaleString("en-US")}.${frac.toString().padStart(2, "0")} QOR`;
}
