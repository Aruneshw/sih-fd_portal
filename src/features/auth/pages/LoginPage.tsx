import { ArrowRight, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DemoChip } from '@/components/ui';
import { PRIMARY_USER_IDS } from '@/data/seed/catalogue';
import { ROLE_LABEL } from '@/domain/labels';
import type { DemoUser } from '@/domain/types';
import { initials } from '@/lib/text';
import { useAppState, useSessionApi } from '@/app/hooks';
import { WhatIsSimulatedModal } from '../components/WhatIsSimulatedModal';

const SCOPE: Record<DemoUser['role'], string> = {
  ADMIN: 'All institutions · assigns, decides, configures',
  VERIFICATION_OFFICER: 'Reads all · acts on assigned cases',
  INSTITUTION_REP: 'Own institution only',
  AUDITOR: 'All records · read-only, exports',
};

export function LoginPage() {
  const state = useAppState();
  const session = useSessionApi();
  const nav = useNavigate();
  const loc = useLocation();
  const [simulated, setSimulated] = useState(false);
  if (session.userId && state.users[session.userId]) return <Navigate to="/" replace />;
  const from = (loc.state as { from?: string } | null)?.from ?? '/';
  const signIn = (id: string) => { session.signIn(id); nav(from, { replace: true }); };
  const primary = PRIMARY_USER_IDS.map((id) => state.users[id]).filter(Boolean);
  const others = Object.values(state.users).filter((u) => !PRIMARY_USER_IDS.includes(u.id));

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="flex flex-col justify-between bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 px-6 py-8 text-white md:px-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-teal-600" size={28} aria-hidden />
          <span className="text-sm font-semibold tracking-wide">AICTE SecureFDR</span>
        </div>
        <div className="my-10">
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">Intelligent Security Deposit &amp; FDR Management System</h1>
          <p className="mt-3 text-lg text-teal-100">Every Deposit. Verified. Tracked. Accountable.</p>
          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            <li>One registry for every instrument, linked to its institution, documents and history.</li>
            <li>Explainable checks that surface potential issues for human review.</li>
            <li>Auditable verification, renewal and release workflows.</li>
          </ul>
        </div>
        <p className="text-xs text-slate-400">Smart India Hackathon · Problem Statement 26265 · Software. A prototype — not affiliated with or endorsed by AICTE or any bank.</p>
      </section>

      <section className="flex flex-col justify-center px-4 py-8 md:px-10">
        <div className="mx-auto w-full max-w-2xl">
          <div role="note" className="mb-5 flex items-start gap-2 rounded-lg border border-amber-600/40 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span><strong>Demonstration authentication — not for production use.</strong> Choose a fictional demo user to continue. All data is fictional demonstration data.</span>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">Sign in as a demo user</h2>
            <DemoChip />
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {primary.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => signIn(u.id)} className="group flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-navy-600 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-semibold text-white" aria-hidden>{initials(u.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{u.name}</span>
                    <span className="block text-xs font-medium text-teal-700">{ROLE_LABEL[u.role]}</span>
                    <span className="mt-1 block text-xs text-slate-500">{u.institutionId ? `${state.institutions[u.institutionId]?.name ?? u.institutionId} (${u.institutionId})` : SCOPE[u.role]}</span>
                  </span>
                  <ArrowRight size={16} className="mt-1 text-slate-400 group-hover:text-navy-700" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {others.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-600">Other institution representatives</p>
              <div className="flex flex-wrap gap-2">
                {others.map((u) => (
                  <button key={u.id} type="button" onClick={() => signIn(u.id)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-navy-600">
                    {u.name} · {u.institutionId}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={() => setSimulated(true)} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
            <Info size={16} aria-hidden /> What is simulated
          </button>
        </div>
      </section>
      <WhatIsSimulatedModal open={simulated} onClose={() => setSimulated(false)} />
    </div>
  );
}
