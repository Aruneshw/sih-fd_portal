import { Bell, Menu, Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, DemoChip, IconButton } from '@/components/ui';
import { can } from '@/domain/permissions/can';
import { unreadCount } from '@/domain/selectors/scope';
import { useAppState, useUser } from '../hooks';
import { ProfileMenu } from './ProfileMenu';

export function Topbar({ onMenu, onSearch, onWhatIsSimulated }: { onMenu: () => void; onSearch: () => void; onWhatIsSimulated: () => void }) {
  const state = useAppState();
  const user = useUser();
  const nav = useNavigate();
  const unread = unreadCount(state, user);
  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur md:px-5">
      <IconButton label="Open navigation" onClick={onMenu} className="lg:hidden"><Menu size={20} aria-hidden /></IconButton>
      <button type="button" onClick={onSearch} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 text-left text-sm text-slate-500 hover:border-slate-400 sm:max-w-md" aria-label="Search records (Ctrl+K)">
        <Search size={16} aria-hidden />
        <span className="truncate">Search institutions, FDRs, requests…</span>
        <kbd className="ml-auto hidden rounded border border-slate-300 bg-white px-1.5 text-[10px] text-slate-500 sm:inline">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5 md:gap-3">
        <DemoChip className="hidden sm:inline-flex" />
        {can(user, 'fdr.create').allowed && (
          <Button variant="primary" size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => nav('/fdrs/new')} className="hidden sm:inline-flex">Add New FDR</Button>
        )}
        <Link to="/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" aria-label={`Notifications, ${unread} unread`}>
          <Bell size={20} aria-hidden />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-700 px-1 text-center text-[10px] font-semibold leading-[18px] text-white">{unread > 99 ? '99+' : unread}</span>}
        </Link>
        <ProfileMenu onWhatIsSimulated={onWhatIsSimulated} />
      </div>
    </header>
  );
}
