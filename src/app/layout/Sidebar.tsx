import clsx from 'clsx';
import { ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { canAny } from '@/domain/permissions/can';
import { scopedNotifications } from '@/domain/selectors/scope';
import { useAppState, useUser } from '../hooks';
import { NAV } from '../routes';

export function Sidebar({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const user = useUser();
  const state = useAppState();
  const unread = scopedNotifications(state, user).filter((n) => !n.readBy[user.id] && !n.resolvedAt).length;
  return (
    <nav aria-label="Main navigation" className="flex h-full flex-col bg-navy-900 text-slate-200">
      <div className={clsx('flex items-center gap-2 border-b border-white/10 px-4 py-4', collapsed && 'justify-center px-2')}>
        <ShieldCheck className="shrink-0 text-teal-600" size={24} aria-hidden />
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold text-white">AICTE SecureFDR</div>
            <div className="text-[11px] text-slate-400">Demonstration prototype</div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        {NAV.map((sec) => {
          const items = sec.items.filter((i) => canAny(user, i.anyOf));
          if (!items.length) return null;
          return (
            <div key={sec.section} className="mb-3">
              {!collapsed && <div className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{sec.section}</div>}
              <ul>
                {items.map((i) => (
                  <li key={i.to}>
                    <NavLink
                      to={i.to}
                      end={i.to === '/'}
                      onClick={onNavigate}
                      title={collapsed ? i.label : undefined}
                      className={({ isActive }) =>
                        clsx(
                          'relative mx-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600',
                          collapsed && 'justify-center px-2',
                          isActive ? 'bg-white/10 font-medium text-white before:absolute before:-left-2 before:top-1.5 before:h-6 before:w-1 before:rounded-r before:bg-teal-600' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                        )
                      }
                    >
                      <i.icon size={18} aria-hidden className="shrink-0" />
                      {!collapsed && <span className="flex-1">{i.label}</span>}
                      {!collapsed && i.to === '/notifications' && unread > 0 && <span className="rounded-full bg-teal-600 px-1.5 text-[11px] font-semibold text-white">{unread}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {!collapsed && <div className="border-t border-white/10 px-4 py-3 text-[11px] leading-snug text-slate-400">Smart India Hackathon · PS 26265. Not affiliated with or endorsed by AICTE or any bank.</div>}
    </nav>
  );
}
