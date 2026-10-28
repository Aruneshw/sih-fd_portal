/** CSV with formula-injection guard (architecture.md §18) and quoted fields. */
const DANGEROUS = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (DANGEROUS.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsvCell).join(','));
  return lines.join('\r\n');
}

/** UTF-8 with BOM so Excel opens Indian rupee symbols correctly (FR-M11-3). */
export function csvWithBom(csv: string): string {
  return `\uFEFF${csv}`;
}

export function safeFilePart(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
