import clsx from 'clsx';
import { FileUp } from 'lucide-react';
import { useId, useRef, useState } from 'react';

/** Keyboard- and drag-friendly file picker. Validation happens in the caller (services/documents/intake). */
export function FileDropzone({ onFiles, accept = '.pdf,.jpg,.jpeg,.png', label, hint, disabled, multiple = false }: { onFiles: (files: File[]) => void; accept?: string; label: string; hint?: string; disabled?: boolean; multiple?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const id = useId();
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) onFiles(Array.from(e.dataTransfer.files)); }}
      className={clsx('flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center', over ? 'border-navy-600 bg-navy-50' : 'border-slate-300 bg-slate-50', disabled && 'opacity-60')}
    >
      <FileUp size={22} className="text-slate-500" aria-hidden />
      <label htmlFor={id} className="cursor-pointer text-sm font-medium text-navy-700 underline-offset-2 hover:underline">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          if (input.current) input.current.value = '';
        }}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
