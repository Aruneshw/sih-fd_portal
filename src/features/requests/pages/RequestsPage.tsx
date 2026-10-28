import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, DataTable, FilterBar, FilterSelect, PageHeader, StageBadge, type Column } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { REQUEST_STAGE_LABEL } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { scopedRequests } from '@/domain/selectors/scope';
import { OPEN_REQUEST_STAGES } from '@/domain/workflows/requestMachine';
import type { ReleaseRequest, RequestStage } from '@/domain/types';
import { useAppState, useUser } from '@/app/hooks';
import { FdrLink, useUrlState, useUserName } from '@/features/shared';

export function RequestsPage() {
  const state = useAppState();
  const user = useUser();
  const nav = useNavigate();
  const url = useUrlState();
  const name = useUserName();
  const all = scopedRequests(state, user);
  const rows = all.filter((r) =>
    (!url.get('open') || OPEN_REQUEST_STAGES.includes(r.stage)) &&
    (!url.get('stage') || r.stage === url.get('stage')) &&
    (!url.get('type') || r.type === url.get('type')) &&
    (!url.get('mine') || r.assignedOfficerId === user.id),
  );
  const columns: Column<ReleaseRequest>[] = [
    { id: 'id', header: 'Request', cell: (r) => <span className="font-medium text-navy-700">{r.id}</span>, sortValue: (r) => r.id },
    { id: 'type', header: 'Type', cell: (r) => (r.type === 'RELEASE' ? 'Release' : 'Refund'), sortValue: (r) => r.type },
    { id: 'inst', header: 'Institution', cell: (r) => <span className="block max-w-[220px] truncate">{state.institutions[r.institutionId]?.name}</span>, sortValue: (r) => state.institutions[r.institutionId]?.name ?? '' },
    { id: 'fdr', header: 'Linked FDR', cell: (r) => <FdrLink id={r.fdrId} />, sortValue: (r) => r.fdrId },
    { id: 'submitted', header: 'Submitted', cell: (r) => formatDateTime(r.submittedAt), sortValue: (r) => r.submittedAt },
    { id: 'stage', header: 'Stage', cell: (r) => <StageBadge stage={r.stage} />, sortValue: (r) => r.stage },
    { id: 'officer', header: 'Assigned officer', cell: (r) => name(r.assignedOfficerId), sortValue: (r) => name(r.assignedOfficerId) },
    { id: 'decision', header: 'Decision ref.', cell: (r) => r.decisionRef ?? '—', sortValue: (r) => r.decisionRef ?? '' },
  ];
  return (
    <div>
      <PageHeader
        title="Release & refund requests"
        description="Approvals here are simulated administrative decisions. No refund is paid and no funds are released by this system."
        actions={can(user, 'request.submit').allowed && <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => nav('/requests/new')}>New request</Button>}
      />
      <Card>
        <FilterBar hasFilters={['open', 'stage', 'type', 'mine'].some((k) => url.get(k))} onClear={() => url.clear()}>
          <label className="flex items-center gap-2 self-center text-xs font-medium text-slate-700"><input type="checkbox" checked={!!url.get('open')} onChange={(e) => url.set({ open: e.target.checked ? '1' : null })} className="h-4 w-4 rounded border-slate-300" /> Open only</label>
          {user.role === 'VERIFICATION_OFFICER' && <label className="flex items-center gap-2 self-center text-xs font-medium text-slate-700"><input type="checkbox" checked={!!url.get('mine')} onChange={(e) => url.set({ mine: e.target.checked ? '1' : null })} className="h-4 w-4 rounded border-slate-300" /> Assigned to me</label>}
          <FilterSelect label="Stage" value={url.get('stage')} onChange={(v) => url.set({ stage: v })} options={(Object.keys(REQUEST_STAGE_LABEL) as RequestStage[]).map((s) => ({ value: s, label: REQUEST_STAGE_LABEL[s] }))} />
          <FilterSelect label="Type" value={url.get('type')} onChange={(v) => url.set({ type: v })} options={[{ value: 'RELEASE', label: 'Release' }, { value: 'REFUND', label: 'Refund' }]} />
        </FilterBar>
        <DataTable caption="Release and refund requests" rows={rows} columns={columns} rowKey={(r) => r.id} onRowClick={(r) => nav(`/requests/${r.id}`)} sort={url.sort ?? { id: 'submitted', dir: 'desc' }} onSort={url.setSort} page={url.page} pageSize={url.pageSize} onPage={(p) => url.set({ page: p }, { resetPage: false })} onPageSize={(s) => url.set({ size: s })} />
      </Card>
    </div>
  );
}
