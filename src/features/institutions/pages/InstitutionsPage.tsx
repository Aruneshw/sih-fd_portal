import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, DataTable, FilterBar, FilterSelect, PageHeader, SearchInput, type Column } from '@/components/ui';
import { formatINR } from '@/lib/money';
import { INSTITUTION_STATUS_LABEL, INSTITUTION_TYPE_LABEL } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { isHeld } from '@/domain/selectors/kpis';
import { pendingActionsByInstitution } from '@/domain/selectors/queues';
import { scopedInstitutions } from '@/domain/selectors/scope';
import type { Institution } from '@/domain/types';
import { useAppState, useToday, useUser } from '@/app/hooks';
import { useFdrViews, useUrlState } from '@/features/shared';
import { InstitutionFormModal } from '../components/InstitutionFormModal';

interface Row { inst: Institution; fdrCount: number; value: number; pending: number }

export function InstitutionsPage() {
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const nav = useNavigate();
  const url = useUrlState();
  const views = useFdrViews();
  const [creating, setCreating] = useState(false);
  const pending = useMemo(() => pendingActionsByInstitution(state, today, user), [state, today, user]);
  const all = useMemo<Row[]>(() => scopedInstitutions(state, user).map((inst) => {
    const vs = views.filter((v) => v.fdr.institutionId === inst.id);
    return { inst, fdrCount: vs.length, value: vs.filter(isHeld).reduce((s, v) => s + v.fdr.amountPaise, 0), pending: pending.get(inst.id) ?? 0 };
  }), [state, user, views, pending]);
  const q = url.get('q').toLowerCase();
  const rows = all.filter((r) =>
    (!q || r.inst.name.toLowerCase().includes(q) || r.inst.id.toLowerCase().includes(q) || r.inst.aicteCode.toLowerCase().includes(q)) &&
    (!url.get('state') || r.inst.state === url.get('state')) &&
    (!url.get('status') || r.inst.status === url.get('status')) &&
    (!url.get('type') || r.inst.type === url.get('type')),
  );
  const states = [...new Set(all.map((r) => r.inst.state))].sort();
  const columns: Column<Row>[] = [
    { id: 'id', header: 'Institution ID', cell: (r) => <span className="font-medium text-navy-700">{r.inst.id}</span>, sortValue: (r) => r.inst.id },
    { id: 'name', header: 'Name', cell: (r) => <span><span className="block">{r.inst.name}</span><span className="text-xs text-slate-500">{r.inst.aicteCode}</span></span>, sortValue: (r) => r.inst.name },
    { id: 'type', header: 'Type', cell: (r) => INSTITUTION_TYPE_LABEL[r.inst.type], sortValue: (r) => r.inst.type },
    { id: 'state', header: 'State', cell: (r) => r.inst.state, sortValue: (r) => r.inst.state },
    { id: 'district', header: 'District', cell: (r) => r.inst.district, sortValue: (r) => r.inst.district },
    { id: 'rep', header: 'Authorised representative', cell: (r) => r.inst.representativeName, sortValue: (r) => r.inst.representativeName },
    { id: 'contact', header: 'Contact (fictional)', cell: (r) => <span className="text-xs"><span className="block">{r.inst.contactEmail}</span>{r.inst.contactPhone}</span> },
    { id: 'fdrs', header: 'FDRs', cell: (r) => r.fdrCount, sortValue: (r) => r.fdrCount, className: 'text-center' },
    { id: 'value', header: 'Recorded deposit', cell: (r) => formatINR(r.value), sortValue: (r) => r.value, className: 'text-right tabular-nums' },
    { id: 'pending', header: 'Pending actions', cell: (r) => <span className={r.pending >= 4 ? 'font-semibold text-red-700' : r.pending ? 'font-medium text-amber-700' : 'text-slate-500'}>{r.pending}</span>, sortValue: (r) => r.pending, className: 'text-center' },
    { id: 'status', header: 'Status', cell: (r) => <Badge tone={r.inst.status === 'ACTIVE' ? 'teal' : r.inst.status === 'UNDER_REVIEW' ? 'amber' : 'slate'}>{INSTITUTION_STATUS_LABEL[r.inst.status]}</Badge>, sortValue: (r) => r.inst.status },
  ];
  return (
    <div>
      <PageHeader title="Institutions" description="Fictional institutions with their linked instruments and open items." actions={can(user, 'institution.create').allowed && <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => setCreating(true)}>New institution</Button>} />
      <Card>
        <FilterBar hasFilters={['q', 'state', 'status', 'type'].some((k) => url.get(k))} onClear={() => url.clear(['size'])}>
          <SearchInput label="Search institutions" value={url.get('q')} onChange={(v) => url.set({ q: v })} placeholder="Name, ID or code" />
          <FilterSelect label="State" value={url.get('state')} onChange={(v) => url.set({ state: v })} options={states.map((s) => ({ value: s, label: s }))} />
          <FilterSelect label="Status" value={url.get('status')} onChange={(v) => url.set({ status: v })} options={(Object.keys(INSTITUTION_STATUS_LABEL) as Institution['status'][]).map((s) => ({ value: s, label: INSTITUTION_STATUS_LABEL[s] }))} />
          <FilterSelect label="Type" value={url.get('type')} onChange={(v) => url.set({ type: v })} options={(Object.keys(INSTITUTION_TYPE_LABEL) as Institution['type'][]).map((s) => ({ value: s, label: INSTITUTION_TYPE_LABEL[s] }))} />
        </FilterBar>
        <DataTable caption="Institutions" rows={rows} columns={columns} rowKey={(r) => r.inst.id} onRowClick={(r) => nav(`/institutions/${r.inst.id}`)} sort={url.sort ?? { id: 'id', dir: 'asc' }} onSort={url.setSort} page={url.page} pageSize={url.pageSize} onPage={(p) => url.set({ page: p }, { resetPage: false })} onPageSize={(s) => url.set({ size: s })} />
      </Card>
      {creating && <InstitutionFormModal open onClose={() => setCreating(false)} onCreated={(id) => nav(`/institutions/${id}`)} />}
    </div>
  );
}
