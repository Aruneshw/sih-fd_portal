import clsx from 'clsx';
import { Check } from 'lucide-react';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span className={clsx('flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-teal-600 text-white' : active ? 'bg-navy-700 text-white' : 'bg-slate-200 text-slate-600')}>
              {done ? <Check size={14} aria-hidden /> : i + 1}
            </span>
            <span className={clsx('text-sm', active ? 'font-semibold text-navy-900' : 'text-slate-600')}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 hidden h-px w-8 bg-slate-300 sm:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
