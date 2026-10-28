import { ChevronDown, Info, LogOut, Repeat } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABEL } from '@/domain/labels';
import { initials } from '@/lib/text';
import { useAppState, useSessionApi, useUser } from '../hooks';

/** FR-M01-3: role switcher without losing data. */
export function ProfileMenu({ onWhatIsSimulated }: { onWhatIsSimulated: () => void }) {
  const user = useUser();
  const state = useAppState();
  const session = useSessionApi();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const others = Object.values(state.users).filter((u) => u.id !== user.id && u.active);
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-700 text-xs font-semibold text-white" aria-hidden>{initials(user.name)}</span>
        <span className="hidden text-left md:block">
          <span className="block text-sm font-medium leading-tight text-slate-900">{user.name}</span>
          <span className="block text-[11px] leading-tight text-slate-500">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown size={14} className="text-slate-500" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="text-sm font-medium text-slate-900">{user.name}</div>
            <div className="text-xs text-slate-500">{ROLE_LABEL[user.role]}{user.institutionId ? ` · ${state.institutions[user.institutionId]?.name ?? user.institutionId}` : ''}</div>
          </div>
          <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Switch demo user</div>
          {others.map((u) => (
            <button key={u.id} role="menuitem" type="button" onClick={() => { session.signIn(u.id); setOpen(false); nav('/'); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50">
              <Repeat size={14} className="text-slate-400" aria-hidden />
              <span className="flex-1">{u.name}</span>
              <span className="text-[11px] text-slate-500">{ROLE_LABEL[u.role].replace('AICTE ', '')}</span>
            </button>
          ))}
          <div className="mt-1 border-t border-slate-100 pt-1">
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onWhatIsSimulated(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"><Info size={14} aria-hidden /> What is simulated</button>
            <button role="menuitem" type="button" onClick={() => { session.signOut(); nav('/login'); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"><LogOut size={14} aria-hidden /> Log out</button>
          </div>
        </div>
      )}
    </div>
  );
}
