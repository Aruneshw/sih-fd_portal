import type { ReactNode } from 'react';

export interface TimelineItem {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
  tone?: 'navy' | 'teal' | 'amber' | 'red' | 'slate' | 'violet';
}

const dot = { navy: 'bg-navy-700', teal: 'bg-teal-600', amber: 'bg-amber-600', red: 'bg-red-700', slate: 'bg-slate-400', violet: 'bg-violet-700' };

export function Timeline({ items, empty = 'No history yet.' }: { items: TimelineItem[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dot[it.tone ?? 'navy']}`} aria-hidden />
          <div className="text-sm font-medium text-slate-900">{it.title}</div>
          {it.meta && <div className="text-xs text-slate-500">{it.meta}</div>}
          {it.body && <div className="mt-1 whitespace-pre-line text-sm text-slate-700">{it.body}</div>}
        </li>
      ))}
    </ol>
  );
}
