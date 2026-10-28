import { FlaskConical } from 'lucide-react';

/** C-08 / FR-M02-3: persistent demonstration-data marker. */
export function DemoChip({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-amber-600/40 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ${className}`} title="All institutions, banks, people, amounts and histories are fictional.">
      <FlaskConical size={12} aria-hidden /> Demonstration data
    </span>
  );
}
