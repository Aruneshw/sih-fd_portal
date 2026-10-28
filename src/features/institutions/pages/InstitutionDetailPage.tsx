import { Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, CardBody, DataTable, EmptyState, FlagChips, PageHeader, StageBadge, StatusBadge, Tabs, type Column } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { INSTITUTION_STATUS_LABEL, INSTITUTION_TYPE_LABEL } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { isHeld } from '@/domain/selectors/kpis';
import { actionQueue } from '@/domain/selectors/queues';
import type { FdrView } from '@/domain/selectors/views';
import { useAppState, useToday, useUser } from '@/app/hooks';
import { AuditList, FdrLink, useFdrViews, useUrlState } from '@/features/shared';
import { InstitutionFormModal } from '../components/InstitutionFormModal';

/** FR-M04-3: Overview · Instruments · Pending actions · Requests · Activity history. */
export function InstitutionDetailPage() {
  const { id = '' } = useParams();
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const nav = useNavigate();
  const url = useUrlState();
  const views = useFdrViews();
  const [editing, setEditing] = useState(false);
  const inst = state.institutions[id];
  const fdrs = useMemo(() => views.filter((v) => v.fdr.institutionId === id), [views, id]);
  if (!inst || !can(user, 'institution.view', { institutionId: id }).allowed) return <EmptyState title={inst ? 'This institution is outside your scope' : `Institution ${id} not found`} action={<Link to="/institutions" className="text-sm text-navy-700 underline">Back to institutions</Link>} />;
  const tab = url.get('tab', 'overview');
  const requests = Object.values(state.requests).filter((r) => r.institutionId === id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const fdrIds = new Set(fdrs.map((v) => v.fdr.id));
  const reqIds = new Set(requests.map((r) => r.id));
  const audit = user.role === 'INSTITUTION_REP' ? [] : state.audit.filter((e) => e.entityId === id || fdrIds.has(e.entityId) || reqIds.has(e.entityId));
  const pending = actionQueue(state, today, { ...user, role: user.role === 'INSTITUTION_REP' ? user.role : 'ADMIN' }, 100).filter((q) => { const m = q.link.match(/(FDR-[\w-]+|REQ-[\w-]+)/); return m && (fdrIds.has(m[1]) || reqIds.has(m[1])); });
  const held = fdrs.filter(isHeld);
  const columns: Column<FdrView>[] = [
    { id: 'id', header: 'Record', cell: (v) => <FdrLink id={v.fdr.id} />, sortValue: (v) => v.fdr.id },
    { id: 'ref', header: 'Reference', cell: (v) => <span className="font-mono text-xs">{v.fdr.referenceNo}</span> },
    { id: 'bank', header: 'Bank', cell: (v) => v.bank?.name },
    { id: 'amount', header: 'Amount', cell: (v) => formatINR(v.fdr.amountPaise), sortValue: (v) => v.fdr.amountPaise, className: 'text-right tabular-nums' },
    { id: 'maturity', header: 'Maturity', cell: (v) => formatDate(v.fdr.maturityDate), sortValue: (v) => v.fdr.maturityDate },
    { id: 'status', header: 'Status', cell: (v) => <span className="flex flex-col gap-1"><StatusBadge status={v.derived.status} /><FlagChips flags={v.derived.flags} /></span>, sortValue: (v) => v.derived.status },
  ];
  return (
    <div>
      <PageHeader
        eyebrow={<Link to="/institutions" className="hover:underline">Institutions</Link>}
        title={<span className="flex flex-wrap items-center gap-3">{inst.name}<Badge tone={inst.status === 'ACTIVE' ? 'teal' : inst.status === 'UNDER_REVIEW' ? 'amber' : 'slate'}>{INSTITUTION_STATUS_LABEL[inst.status]}</Badge></span>}
        description={`${inst.id} · ${inst.aicteCode} · ${INSTITUTION_TYPE_LABEL[inst.type]} · ${inst.district}, ${inst.state}`}
        actions={can(user, 'institution.edit').allowed && <Button icon={<Pencil size={16} aria-hidden />} onClick={() => setEditing(true)}>Edit</Button>}
      />
      <Card>
        <CardBody>
          <Tabs active={tab} onChange={(t) => url.set({ tab: t }, { resetPage: false })} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'instruments', label: 'Instruments', count: fdrs.length }, { id: 'pending', label: 'Pending actions', count: pending.length }, { id: 'requests', label: 'Requests', count: requests.length }, { id: 'activity', label: 'Activity history' }]}>
            {tab === 'overview' && (
              <div className="grid gap-4 md:grid-cols-2">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  {[['Authorised representative', inst.representativeName], ['Contact email (fictional)', inst.contactEmail], ['Contact phone (fictional)', inst.contactPhone], ['Institution code', inst.aicteCode], ['Created', formatDateTime(inst.createdAt)], ['Last updated', formatDateTime(inst.updatedAt)]].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
                </dl>
                <div className="grid grid-cols-2 gap-3">
                  {[['Instruments held', held.length], ['Recorded deposit', formatINR(held.reduce((s, v) => s + v.fdr.amountPaise, 0))], ['Pending actions', pending.length], ['Open requests', requests.filter((r) => r.stage !== 'CLOSED').length]].map(([k, v]) => (
                    <div key={k} className="rounded-md border border-slate-200 p-3"><div className="text-xs text-slate-500">{k}</div><div className="mt-1 text-lg font-semibold text-navy-900">{v}</div></div>
                  ))}
                </div>
              </div>
            )}
            {tab === 'instruments' && <DataTable caption="Instruments" rows={fdrs} columns={columns} rowKey={(v) => v.fdr.id} onRowClick={(v) => nav(`/fdrs/${v.fdr.id}`)} />}
            {tab === 'pending' && (pending.length ? <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">{pending.map((q) => <li key={q.id}><Link to={q.link} className="block px-3 py-2 hover:bg-slate-50"><span className="block text-sm font-medium text-slate-900">{q.title}</span><span className="text-xs text-slate-500">{q.detail}</span></Link></li>)}</ul> : <p className="text-sm text-slate-500">No pending actions.</p>)}
            {tab === 'requests' && (requests.length ? <ul className="space-y-2">{requests.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"><Link className="font-medium text-navy-700 hover:underline" to={`/requests/${r.id}`}>{r.id}</Link><span>{r.type === 'RELEASE' ? 'Release' : 'Refund'} · {r.fdrId}</span><StageBadge stage={r.stage} /></li>)}</ul> : <p className="text-sm text-slate-500">No requests.</p>)}
            {tab === 'activity' && (user.role === 'INSTITUTION_REP' ? <p className="text-sm text-slate-500">Activity history is available to administrators, officers and auditors.</p> : <AuditList events={audit.slice(-60)} />)}
          </Tabs>
        </CardBody>
      </Card>
      {editing && <InstitutionFormModal institution={inst} open onClose={() => setEditing(false)} />}
    </div>
  );
}
