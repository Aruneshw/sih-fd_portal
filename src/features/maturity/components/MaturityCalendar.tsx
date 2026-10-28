import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDaysIso, addMonthsIso, formatMonth } from '@/lib/dates';
import type { FdrView } from '@/domain/selectors/views';

const DOT: Record<string, string> = { MATURED: 'bg-red-700', CRITICAL: 'bg-red-700', DUE_SOON: 'bg-amber-600', WATCH: 'bg-navy-700', LONG: 'bg-slate-400' };

/** FR-M08-2: month grid with maturity dots. */
export function MaturityCalendar({ views, today }: { views: FdrView[]; today: string }) {
  const [month, setMonth] = useState(`${today.slice(0, 7)}-01`);
  const first = new Date(`${month}T00:00:00`);
  const startOffset = (first.getDay() + 6) % 7; // Monday first
  const gridStart = addDaysIso(month, -startOffset);
  const days = Array.from({ length: 42 }, (_, i) => addDaysIso(gridStart, i));
  const byDate = new Map<string, FdrView[]>();
  for (const v of views) byDate.set(v.fdr.maturityDate, [...(byDate.get(v.fdr.maturityDate) ?? []), v]);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonthsIso(month, -1))} className="rounded p-1 hover:bg-slate-100"><ChevronLeft size={18} aria-hidden /></button>
        <h3 className="text-sm font-semibold text-navy-900" aria-live="polite">{formatMonth(month.slice(0, 7))}</h3>
        <button type="button" aria-label="Next month" onClick={() => setMonth(addMonthsIso(month, 1))} className="rounded p-1 hover:bg-slate-100"><ChevronRight size={18} aria-hidden /></button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 text-xs" role="grid" aria-label="Maturity calendar">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} role="columnheader" className="bg-slate-50 px-1 py-1 text-center font-medium text-slate-600">{d}</div>)}
        {days.map((d) => {
          const items = byDate.get(d) ?? [];
          const inMonth = d.slice(0, 7) === month.slice(0, 7);
          return (
            <div key={d} role="gridcell" className={`min-h-[64px] bg-white p-1 ${inMonth ? '' : 'bg-slate-50 text-slate-400'} ${d === today ? 'ring-2 ring-inset ring-navy-600' : ''}`}>
              <div className="text-[11px]">{Number(d.slice(8))}</div>
              <div className="mt-0.5 flex flex-col gap-0.5">
                {items.slice(0, 3).map((v) => (
                  <Link key={v.fdr.id} to={`/fdrs/${v.fdr.id}`} title={`${v.fdr.id} · ${v.institution?.name ?? ''}`} className="flex items-center gap-1 truncate rounded px-0.5 hover:bg-slate-100">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[v.derived.band]}`} aria-hidden />
                    <span className="truncate text-[10px] text-slate-700">{v.fdr.id.replace('FDR-', '')}</span>
                  </Link>
                ))}
                {items.length > 3 && <span className="text-[10px] text-slate-500">+{items.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
