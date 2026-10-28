import { useEffect, useState } from 'react';
import { paiseToInput, parseRupeesInput, formatINR } from '@/lib/money';
import { Input } from './Field';

/** Rupee input that stores integer paise; shows the Indian-grouped value as a hint. */
export function MoneyInput({ value, onChange, onBlur, id, ...aria }: { value: number | null; onChange: (paise: number | null) => void; onBlur?: () => void; id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) {
  const [text, setText] = useState(value ? paiseToInput(value) : '');
  useEffect(() => {
    if (value === null) return;
    if (parseRupeesInput(text) !== value) setText(paiseToInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500" aria-hidden>₹</span>
      <Input
        id={id}
        {...aria}
        inputMode="decimal"
        className="pl-7"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseRupeesInput(e.target.value));
        }}
        onBlur={onBlur}
        placeholder="e.g. 5,00,000"
      />
      {value !== null && value > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{formatINR(value)}</span>}
    </div>
  );
}
