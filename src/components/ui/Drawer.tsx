import { X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap';

export function Drawer({ open, onClose, title, children, footer, side = 'right' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; side?: 'left' | 'right' }) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  const id = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 bg-navy-900/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className={`absolute top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl outline-none ${side === 'right' ? 'right-0' : 'left-0'}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id={id} className="text-sm font-semibold text-navy-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close panel" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-slate-200 p-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
