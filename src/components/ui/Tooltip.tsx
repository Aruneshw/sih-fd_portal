import type { ReactNode } from 'react';

/** Lightweight accessible tooltip: native title plus a visually hidden description. */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span title={text} className="inline-flex">
      {children}
      <span className="sr-only">{text}</span>
    </span>
  );
}
