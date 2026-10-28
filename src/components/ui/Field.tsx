import clsx from 'clsx';
import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/** Label + control + hint + inline error, wired with aria attributes (NFR-06). */
export function Field({ label, error, hint, required, children, className }: { label: ReactNode; error?: string; hint?: ReactNode; required?: boolean; children: ReactElement; className?: string }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined,
        'aria-required': required || undefined,
      })
    : children;
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
        {required && <span className="ml-0.5 text-red-700" aria-hidden>*</span>}
      </label>
      {control}
      {hint && !error && <p id={hintId} className="text-xs text-slate-500">{hint}</p>}
      {error && <p id={errId} className="text-xs font-medium text-red-700" role="alert">{error}</p>}
    </div>
  );
}

const control = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-100 disabled:bg-slate-100 disabled:text-slate-500 aria-[invalid=true]:border-red-700';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(control, 'h-9 py-0', props.className)} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(control, 'h-9 py-0 pr-8', props.className)}>{children}</select>;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={clsx(control, props.className)} />;
}

export function Checkbox({ label, checked, onChange, disabled, description }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; description?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-600" />
      <label htmlFor={id} className="text-sm text-slate-800">
        {label}
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </label>
    </div>
  );
}

export function FormErrorSummary({ errors, labels }: { errors: Record<string, string>; labels?: Record<string, string> }) {
  const entries = Object.entries(errors).filter(([k]) => !['duplicateOf', 'possibleDuplicates'].includes(k));
  if (!entries.length) return null;
  return (
    <div role="alert" className="rounded-md border border-red-700/30 bg-red-50 px-3 py-2 text-sm text-red-800">
      <p className="font-medium">Please correct {entries.length === 1 ? 'this field' : `these ${entries.length} fields`}:</p>
      <ul className="mt-1 list-disc pl-5">
        {entries.map(([k, v]) => <li key={k}>{labels?.[k] ? `${labels[k]}: ` : ''}{v}</li>)}
      </ul>
    </div>
  );
}
