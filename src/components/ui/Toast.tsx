import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; message: string }
interface ToastApi { success(m: string): void; error(m: string): void; info(m: string): void }

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((kind: Kind, message: string) => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-3), { id, kind, message }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);
  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className={clsx('pointer-events-auto flex items-start gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm shadow-lg', t.kind === 'error' ? 'border-red-700/40' : t.kind === 'success' ? 'border-teal-600/40' : 'border-slate-300')}>
            {t.kind === 'error' ? <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-700" aria-hidden /> : t.kind === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-teal-600" aria-hidden /> : <Info size={18} className="mt-0.5 shrink-0 text-navy-700" aria-hidden />}
            <span className="flex-1 text-slate-800">{t.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} className="text-slate-400 hover:text-slate-700"><X size={16} aria-hidden /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}
