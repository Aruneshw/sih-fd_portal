import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Field';

export function Pagination({ page, pageSize, total, onPage, onPageSize }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; onPageSize: (s: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1">
          Rows
          <Select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="!h-8 !w-20 text-xs" aria-label="Rows per page">
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </label>
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={16} aria-hidden /></button>
        <span aria-live="polite">Page {page} of {pages}</span>
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={16} aria-hidden /></button>
      </div>
    </div>
  );
}
