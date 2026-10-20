const inrFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** ₹1,20,000 */
export function inr(rupees: number): string {
  return inrFormat.format(Math.round(rupees));
}

/** Parse what a person typed into a money field: "1,20,000", "₹ 45000" → 120000 / 45000. */
export function parseRupees(input: string): number | null {
  const digits = input.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
