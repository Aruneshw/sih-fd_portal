import { csvWithBom, toCsv } from '@/lib/csv';

/** Trigger a browser download of a CSV (UTF-8 with BOM, injection-safe). */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  downloadText(filename, csvWithBom(toCsv(headers, rows)), 'text/csv;charset=utf-8');
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
