import clsx from 'clsx';
import type { ReactNode } from 'react';

export type Tone = 'slate' | 'navy' | 'teal' | 'amber' | 'red' | 'violet' | 'green';

const tones: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-300',
  navy: 'bg-navy-50 text-navy-700 ring-navy-100',
  teal: 'bg-teal-50 text-teal-700 ring-teal-100',
  green: 'bg-teal-50 text-teal-700 ring-teal-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-red-50 text-red-800 ring-red-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
};

export function Badge({ tone = 'slate', icon, children, className, title }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
