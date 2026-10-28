/** Money is held as integer paise everywhere (architecture.md §5). */

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Parse user input such as "5,00,000" or "500000.50" into paise; null when invalid. */
export function parseRupeesInput(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, '');
  if (cleaned === '' || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return rupeesToPaise(Number(cleaned));
}

/** Indian digit grouping: 1234567 → 12,34,567 */
function groupIndian(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/** ₹12,50,000 (paise shown only when non-zero). */
export function formatINR(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const p = abs % 100;
  const body = groupIndian(String(rupees)) + (p ? `.${String(p).padStart(2, '0')}` : '');
  return `${negative ? '-' : ''}₹${body}`;
}

/** Compact form for chart axes: ₹1.2 Cr, ₹45 L. */
export function formatINRCompact(paise: number): string {
  const rupees = paise / 100;
  if (Math.abs(rupees) >= 1e7) return `₹${(rupees / 1e7).toFixed(1).replace(/\.0$/, '')} Cr`;
  if (Math.abs(rupees) >= 1e5) return `₹${(rupees / 1e5).toFixed(1).replace(/\.0$/, '')} L`;
  return formatINR(paise);
}

/** Plain number for inputs: 500000 or 500000.5 */
export function paiseToInput(paise: number): string {
  const r = paise / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}
