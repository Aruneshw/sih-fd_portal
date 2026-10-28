import { Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FlagChips, StatusBadge, VerificationBadge, BandBadge } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { ADMIN_STATUS_LABEL, CATEGORY_LABEL, DISPLAY_STATUS_MEANING, RENEWAL_STATUS_LABEL } from '@/domain/labels';
import { suggestedNextStep } from '@/domain/insights/nextStep';
import type { FdrView } from '@/domain/selectors/views';
import type { AppState, Role } from '@/domain/types';
import { useUserName } from '@/features/shared';

export function FdrSummary({ v, state, role }: { v: FdrView; state: AppState; role: Role }) {
  const name = useUserName();
  const f = v.fdr;
  const rows: [string, ReactNode][] = [
    ['Institution', <Link key="i" className="text-navy-700 hover:underline" to={`/institutions/${f.institutionId}`}>{v.institution?.name ?? 'Missing record'} ({f.institutionId})</Link>],
    ['FDR reference', <span key="r" className="font-mono">{f.referenceNo}</span>],
    ['Bank / branch', `${v.bank?.name ?? f.bankId} — ${f.branch}`],
    ['Amount', <span key="a" className="tabular-nums">{formatINR(f.amountPaise)}</span>],
    ['Issue date', formatDate(f.issueDate)],
    ['Maturity date', <span key="m">{formatDate(f.maturityDate)} <span className="text-xs text-slate-500">({v.derived.daysToMaturity < 0 ? `${-v.derived.daysToMaturity} days ago` : `in ${v.derived.daysToMaturity} days`})</span></span>],
    ['Maturity band', <BandBadge key="b" band={v.derived.band} bands={state.settings.maturityBands} />],
    ['Category', CATEGORY_LABEL[f.category]],
    ['Institution code on instrument', f.declaredInstitutionCode],
    ['Application reference', f.applicationRef],
    ['Verification status', <VerificationBadge key="v" status={f.verificationStatus} />],
    ['Assigned officer', name(f.assignedOfficerId)],
    ['Renewal status', RENEWAL_STATUS_LABEL[f.renewalStatus]],
    ['Administrative status', ADMIN_STATUS_LABEL[f.adminStatus]],
    ['Last verification', formatDateTime(f.lastVerifiedAt)],
    ['Submitted', `${formatDateTime(f.createdAt)} by ${name(f.createdBy)}`],
    ['Remarks', f.remarks || '—'],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:col-span-2">
        {rows.map(([k, val]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-0.5 font-medium text-slate-900">{val}</dd></div>)}
      </dl>
      <div className="space-y-3">
        <div className="rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={v.derived.status} /><FlagChips flags={v.derived.flags} /></div>
          <p className="mt-2 text-xs text-slate-600">{DISPLAY_STATUS_MEANING[v.derived.status]}. Status is derived from the record, dates and workflow state; it does not imply financial validity.</p>
        </div>
        <div className="rounded-md border border-navy-100 bg-navy-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-700"><Lightbulb size={14} aria-hidden /> Suggested next step (advisory)</div>
          <p className="mt-1 text-sm text-slate-800">{suggestedNextStep(f, role, v.openRequest, v.derived.daysToMaturity)}</p>
        </div>
      </div>
    </div>
  );
}
