import { Download, ShieldCheck, ShieldX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable, DateInput, FilterBar, FilterSelect, PageHeader, SearchInput, type Column } from '@/components/ui';
import { formatDateTime, toBusinessDate } from '@/lib/dates';
import { safeFilePart } from '@/lib/csv';
import { ROLE_LABEL } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { scopedAudit } from '@/domain/selectors/scope';
import { ROLES, type AuditEvent } from '@/domain/types';
import { verifyChain, type ChainCheck } from '@/services/audit/hashChain';
import { downloadCsv } from '@/services/export/download';
import { useAppState, useRuntime, useUser } from '@/app/hooks';
import { useUrlState, useUserName } from '@/features/shared';

const short = (v: unknown) => (v === undefined ? '' : JSON.stringify(v));

/** M12 — append-only; there are no edit or delete controls anywhere (C-11). */
export function AuditPage() {
  const state = useAppState();
  const user = useUser();
  const rt = useRuntime();
  const url = useUrlState();
  const name = useUserName();
  const [check, setCheck] = useState<(ChainCheck & { at: string }) | null>(null);
  const events = useMemo(() => [...scopedAudit(state, user)].reverse(), [state, user]);
  const q = url.get('q').toLowerCase();
  const rows = events.filter((e) =>
    (!q || [e.id, e.action, e.entityId, e.comment ?? ''].some((x) => x.toLowerCase().includes(q))) &&
    (!url.get('user') || e.userId === url.get('user')) &&
    (!url.get('role') || e.role === url.get('role')) &&
    (!url.get('entity') || e.entityType === url.get('entity')) &&
    (!url.get('outcome') || e.outcome === url.get('outcome')) &&
    (!url.get('action') || e.action.startsWith(url.get('action'))) &&
    (!url.get('from') || toBusinessDate(new Date(e.at)) >= url.get('from')) &&
    (!url.get('to') || toBusinessDate(new Date(e.at)) <= url.get('to')),
  );
  const columns: Column<AuditEvent>[] = [
    { id: 'seq', header: 'Event', cell: (e) => <span className="font-mono text-xs">{e.id}</span>, sortValue: (e) => e.seq },
    { id: 'at', header: 'Timestamp', cell: (e) => <span className="whitespace-nowrap text-xs">{formatDateTime(e.at)}</span>, sortValue: (e) => e.at },
    { id: 'user', header: 'User / role', cell: (e) => <span className="text-xs"><span className="block font-medium">{name(e.userId)}</span>{e.role === 'SYSTEM' ? 'System' : ROLE_LABEL[e.role]}</span>, sortValue: (e) => name(e.userId) },
    { id: 'action', header: 'Action', cell: (e) => <code className="text-xs">{e.action}</code>, sortValue: (e) => e.action },
    { id: 'entity', header: 'Entity', cell: (e) => <span className="text-xs">{e.entityType} · <span className="font-mono">{e.entityId}</span></span>, sortValue: (e) => e.entityId },
    { id: 'change', header: 'Previous → new state', cell: (e) => <span className="block max-w-[320px] break-words font-mono text-[11px] text-slate-600">{e.before !== undefined && <span className="block">− {short(e.before)}</span>}{e.after !== undefined && <span className="block">+ {short(e.after)}</span>}</span> },
    { id: 'comment', header: 'Comment', cell: (e) => <span className="block max-w-[260px] text-xs">{e.comment}</span> },
    { id: 'outcome', header: 'Outcome', cell: (e) => <Badge tone={e.outcome === 'SUCCESS' ? 'teal' : e.outcome === 'DENIED' ? 'red' : 'amber'}>{e.outcome.toLowerCase()}</Badge>, sortValue: (e) => e.outcome },
  ];
  const actionPrefixes = [...new Set(events.map((e) => e.action.split('.')[0]))].sort();
  const entityTypes = [...new Set(events.map((e) => e.entityType))].sort();
  const exportCsv = () => downloadCsv(`audit-trail_${safeFilePart(rt.clock.now())}.csv`,
    ['Event ID', 'Seq', 'Timestamp', 'User', 'Role', 'Action', 'Entity type', 'Entity ID', 'Before', 'After', 'Comment', 'Outcome', 'Previous hash', 'Hash'],
    rows.map((e) => [e.id, e.seq, e.at, name(e.userId), e.role, e.action, e.entityType, e.entityId, short(e.before), short(e.after), e.comment ?? '', e.outcome, e.prevHash, e.hash]));

  return (
    <div>
      <PageHeader
        title="Audit trail"
        description={user.role === 'VERIFICATION_OFFICER' ? 'You can view the events you produced.' : 'Every successful, denied and failed action, with before/after state.'}
        actions={
          <>
            {can(user, 'audit.export').allowed && <Button icon={<Download size={16} aria-hidden />} onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>}
            {can(user, 'audit.verifyChain').allowed && <Button variant="primary" icon={<ShieldCheck size={16} aria-hidden />} onClick={() => setCheck({ ...verifyChain(state.audit), at: rt.clock.now() })}>Verify chain integrity</Button>}
          </>
        }
      />
      {check && (
        <div role="status" className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${check.ok ? 'border-teal-600/40 bg-teal-50 text-teal-700' : 'border-red-700/40 bg-red-50 text-red-800'}`}>
          {check.ok ? <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden /> : <ShieldX size={18} className="mt-0.5 shrink-0" aria-hidden />}
          <span>
            {check.ok ? <><strong>Chain intact.</strong> All {check.count} events recomputed and linked correctly.</> : <><strong>Chain broken at event #{check.firstBrokenSeq}.</strong> {check.reason}</>} Checked {formatDateTime(check.at)}.
            <span className="mt-1 block text-xs opacity-80">Integrity check demonstration. A client-side chain can be rebuilt by anyone with device access; production requires server-side, append-only storage.</span>
          </span>
        </div>
      )}
      <Card>
        <FilterBar hasFilters={['q', 'user', 'role', 'entity', 'outcome', 'action', 'from', 'to'].some((k) => url.get(k))} onClear={() => url.clear(['size'])}>
          <SearchInput label="Search audit events" value={url.get('q')} onChange={(v) => url.set({ q: v })} placeholder="Event, action, entity, comment" />
          {user.role !== 'VERIFICATION_OFFICER' && <FilterSelect label="User" value={url.get('user')} onChange={(v) => url.set({ user: v })} options={[{ value: 'SYSTEM', label: 'System' }, ...Object.values(state.users).map((u) => ({ value: u.id, label: u.name }))]} />}
          <FilterSelect label="Role" value={url.get('role')} onChange={(v) => url.set({ role: v })} options={[...ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] })), { value: 'SYSTEM', label: 'System' }]} />
          <FilterSelect label="Action" value={url.get('action')} onChange={(v) => url.set({ action: v })} options={actionPrefixes.map((a) => ({ value: a, label: a }))} />
          <FilterSelect label="Entity" value={url.get('entity')} onChange={(v) => url.set({ entity: v })} options={entityTypes.map((a) => ({ value: a, label: a }))} />
          <FilterSelect label="Outcome" value={url.get('outcome')} onChange={(v) => url.set({ outcome: v })} options={[{ value: 'SUCCESS', label: 'Success' }, { value: 'DENIED', label: 'Denied' }, { value: 'FAILED', label: 'Failed' }]} />
          <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">From<DateInput value={url.get('from')} onChange={(v) => url.set({ from: v })} className="!h-8 text-xs" aria-label="From date" /></label>
          <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">To<DateInput value={url.get('to')} onChange={(v) => url.set({ to: v })} className="!h-8 text-xs" aria-label="To date" /></label>
        </FilterBar>
        <DataTable caption="Audit events" rows={rows} columns={columns} rowKey={(e) => e.id} sort={url.sort ?? { id: 'seq', dir: 'desc' }} onSort={url.setSort} page={url.page} pageSize={url.pageSize} onPage={(p) => url.set({ page: p }, { resetPage: false })} onPageSize={(s) => url.set({ size: s })} />
      </Card>
    </div>
  );
}
