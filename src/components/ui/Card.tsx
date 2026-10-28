import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <As className={clsx('min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm', className)}>{children}</As>;
}

export function CardHeader({ title, subtitle, actions, icon }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2">
        {icon && <span className="mt-0.5 text-slate-500">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-navy-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('p-4', className)}>{children}</div>;
}
