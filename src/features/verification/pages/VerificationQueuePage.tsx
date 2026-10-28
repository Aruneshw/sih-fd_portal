import { UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, DataTable, FilterBar, FilterSelect, PageHeader, PriorityBadge, VerificationBadge, type Column } from '@/components/ui';
import { formatINR } from '@/lib/money';
import { PRIORITY_LABEL, VERIFICATION_STATUS_LABEL } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { PRIORITY_RANK } from '@/domain/selectors/kpis';
import { verificationQueue, type VerificationQueueItem } from '@/domain/selectors/queues';
import { OPEN_VERIFICATION } from '@/domain/workflows/verificationMachine';
import type { Fdr } from '@/domain/types';
import { useAppState, useToday, useUser } from '@/app/hooks';
import { FdrLink, useUrlState, useUserName } from '@/features/shared';
import { AssignDialog } from '../components/AssignDialog';

/** FR-M07-1 */
export function VerificationQueuePage() {
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const nav = useNavigate();
  const url = useUrlState();
  const name = useUserName();
  const [assigning, setAssigning] = useState<Fdr | null>(null);
  const isOfficer = user.role === 'VERIFICATION_OFFICER';
  const mine = url.get('mine', isOfficer ? '1' : '') === '1';
  const queue = useMemo(() => verificationQueue(state, today, user), [state, today, user]);
  const rows = queue.filter((q) =>
    (!mine || q.view.fdr.assignedOfficerId === user.id) &&
    (!url.get('priority') || q.view.fdr.priority === url.get('priority')) &&
    (!url.get('state') || q.view.fdr.verificationStatus === url.get('state')) &&
    (!url.get('officer') || (url.get('officer') === 'none' ? !q.view.fdr.assignedOfficerId : q.view.fdr.assignedOfficerId === url.get('officer'))),
  );
  const canAssign = can(user, 'verification.assign').allowed;

  const columns: Column<VerificationQueueItem>[] = [
    { id: 'priority', header: 'Priority', cell: (q) => <PriorityBadge priority={q.view.fdr.priority} />, sortValue: (q) => PRIORITY_RANK[q.view.fdr.priority] },
    { id: 'id', header: 'Record', cell: (q) => <span><FdrLink id={q.view.fdr.id} /><span className="block font-mono text-xs text-slate-500">{q.view.fdr.referenceNo}</span></span>, sortValue: (q) => q.view.fdr.id },
    { id: 'inst', header: 'Institution', cell: (q) => <span className="block max-w-[220px] truncate">{q.view.institution?.name}</span>, sortValue: (q) => q.view.institution?.name ?? '' },
    { id: 'amount', header: 'Amount', cell: (q) => formatINR(q.view.fdr.amountPaise), sortValue: (q) => q.view.fdr.amountPaise, className: 'text-right tabular-nums' },
    { id: 'state', header: 'State', cell: (q) => <VerificationBadge status={q.view.fdr.verificationStatus} />, sortValue: (q) => q.view.fdr.verificationStatus },
    { id: 'age', header: 'Age', cell: (q) => `${q.ageDays} d`, sortValue: (q) => q.ageDays, className: 'text-right tabular-nums' },
    { id: 'officer', header: 'Assigned officer', cell: (q) => q.view.fdr.assignedOfficerId ? name(q.view.fdr.assignedOfficerId) : <span className="text-amber-700">Unassigned</span>, sortValue: (q) => name(q.view.fdr.assignedOfficerId) },
    { id: 'findings', header: 'Open findings', cell: (q) => <span className={q.view.openFindings.some((f) => f.severity === 'BLOCKING') ? 'font-semibold text-red-700' : ''}>{q.view.openFindings.filter((f) => f.severity !== 'INFO').length}</span>, sortValue: (q) => q.view.openFindings.length, className: 'text-center' },
    ...(canAssign ? [{ id: 'act', header: '', cell: (q: VerificationQueueItem) => <Button size="sm" icon={<UserPlus size={14} aria-hidden />} onClick={(e) => { e.stopPropagation(); setAssigning(q.view.fdr); }}>{q.view.fdr.assignedOfficerId ? 'Reassign' : 'Assign'}</Button> }] : []),
  ];

  return (
    <div>
      <PageHeader title="Document verification centre" description="Pending cases ordered by priority and age. Open a case to review the submission, automated potential issues, independently verified information and officer conclusions." />
      <Card>
        <FilterBar hasFilters={['priority', 'state', 'officer'].some((k) => url.get(k))} onClear={() => url.clear(['mine'])}>
          {isOfficer && (
            <label className="flex items-center gap-2 self-center text-xs font-medium text-slate-700">
              <input type="checkbox" checked={mine} onChange={(e) => url.set({ mine: e.target.checked ? '1' : '0' })} className="h-4 w-4 rounded border-slate-300" /> Assigned to me
            </label>
          )}
          <FilterSelect label="Priority" value={url.get('priority')} onChange={(v) => url.set({ priority: v })} options={(Object.keys(PRIORITY_LABEL) as (keyof typeof PRIORITY_LABEL)[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
          <FilterSelect label="State" value={url.get('state')} onChange={(v) => url.set({ state: v })} options={OPEN_VERIFICATION.map((s) => ({ value: s, label: VERIFICATION_STATUS_LABEL[s] }))} />
          {!isOfficer && <FilterSelect label="Officer" value={url.get('officer')} onChange={(v) => url.set({ officer: v })} options={[{ value: 'none', label: 'Unassigned' }, ...Object.values(state.users).filter((u) => u.role === 'VERIFICATION_OFFICER').map((u) => ({ value: u.id, label: u.name }))]} />}
        </FilterBar>
        <div className="px-4 py-2 text-xs text-slate-500">{rows.length} open case{rows.length === 1 ? '' : 's'}{mine ? ' assigned to you' : ''}.</div>
        <DataTable caption="Verification queue" rows={rows} columns={columns} rowKey={(q) => q.view.fdr.id} onRowClick={(q) => nav(`/verification/${q.view.fdr.id}`)} sort={url.sort} onSort={url.setSort} page={url.page} pageSize={url.pageSize} onPage={(p) => url.set({ page: p }, { resetPage: false })} onPageSize={(s) => url.set({ size: s })} />
      </Card>
      {assigning && <AssignDialog fdr={state.fdrs[assigning.id]} open onClose={() => setAssigning(null)} />}
    </div>
  );
}
