import type { InputHTMLAttributes } from 'react';
import { Input } from './Field';

export function DateInput({ value, onChange, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: string; onChange: (v: string) => void }) {
  return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
