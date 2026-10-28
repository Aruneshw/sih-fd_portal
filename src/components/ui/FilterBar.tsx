import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Input } from './Field';

export function FilterBar({ children, onClear, hasFilters }: { children: ReactNode; onClear?: () => void; hasFilters?: boolean }) {
  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 px-4 py-3">
      {children}
      {onClear && hasFilters && <Button size="sm" variant="ghost" icon={<X size={14} aria-hidden />} onClick={onClear}>Clear filters</Button>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder?: string; label: string }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
      <Input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="!h-8 pl-8 text-xs" />
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-100">
        <option value="">All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
