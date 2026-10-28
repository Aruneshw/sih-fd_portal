import clsx from 'clsx';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Drawer, PageSkeleton } from '@/components/ui';
import { WhatIsSimulatedModal } from '@/features/auth';
import { RouteErrorBoundary } from '../guards/RouteErrorBoundary';
import { GlobalSearch } from './GlobalSearch';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <aside className={clsx('no-print sticky top-0 hidden h-screen shrink-0 lg:block', collapsed ? 'w-16' : 'w-64')}>
        <Sidebar collapsed={collapsed} />
        <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="absolute -right-3 top-16 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow lg:flex">
          {collapsed ? <PanelLeftOpen size={14} aria-hidden /> : <PanelLeftClose size={14} aria-hidden />}
        </button>
      </aside>
      <Drawer open={mobileNav} onClose={() => setMobileNav(false)} title="Navigation" side="left">
        <div className="h-full"><Sidebar onNavigate={() => setMobileNav(false)} /></div>
      </Drawer>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileNav(true)} onSearch={() => setSearch(true)} onWhatIsSimulated={() => setSimulated(true)} />
        <main id="main" className="min-w-0 flex-1 p-3 md:p-6">
          <RouteErrorBoundary resetKey={loc.pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>
        <footer className="no-print border-t border-slate-200 px-4 py-3 text-center text-[11px] text-slate-500">
          AICTE SecureFDR — demonstration prototype. All records are fictional demonstration data. Not affiliated with or endorsed by AICTE or any bank.
        </footer>
      </div>
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
      <WhatIsSimulatedModal open={simulated} onClose={() => setSimulated(false)} />
    </div>
  );
}
