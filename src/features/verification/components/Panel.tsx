import clsx from 'clsx';
import type { ReactNode } from 'react';

const tones = { slate: 'border-l-slate-400', amber: 'border-l-amber-600', teal: 'border-l-teal-600', navy: 'border-l-navy-700' };

/** Colour-coded provenance panel (architecture.md §17). */
export function Panel({ n, title, tag, tone, children, actions }: { n: number; title: string; tag?: ReactNode; tone: keyof typeof tones; children: ReactNode; actions?: ReactNode }) {
  return (
    <section aria-labelledby={`panel-${n}`} className={clsx('rounded-lg border border-l-4 border-slate-200 bg-white shadow-sm', tones[tone])}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h2 id={`panel-${n}`} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-600">{n}</span>
          {title}
          {tag}
        </h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
