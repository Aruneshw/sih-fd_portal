import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function KpiCard({ label, value, hint, to, icon }: { label: string; value: ReactNode; hint?: string; to: string; icon?: ReactNode }) {
  return (
    <Link
      to={to}
      className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-navy-600 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-slate-400 group-hover:text-navy-700">{icon ?? <ArrowUpRight size={16} aria-hidden />}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-navy-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Link>
  );
}
