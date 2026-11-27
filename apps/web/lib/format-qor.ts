/** 18-decimal base units → "15.00 QOR". */
export function formatQor(value: bigint, decimals = 18): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = ((value % base) * 100n) / base;
  return `${whole.toLocaleString("en-US")}.${frac.toString().padStart(2, "0")} QOR`;
}
