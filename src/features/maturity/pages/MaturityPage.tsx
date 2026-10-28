import { RefreshCcw } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BandBadge, Button, Card, CardBody, CardHeader, DataTable, FlagChips, PageHeader, PriorityBadge, StatusBadge, Tabs, type Column } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { bandLabel } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { BAND_ORDER } from '@/domain/status/bands';
import { bandPriority, PRIORITY_RANK } from '@/domain/selectors/kpis';
import type { FdrView } from '@/domain/selectors/views';
import { canRenew } from '@/domain/workflows/renewalMachine';
import { useAppState, useToday, useUser } from '@/app/hooks';
import { FdrLink, useFdrViews, useUrlState } from '@/features/shared';
import { MaturityCalendar } from '../components/MaturityCalendar';

/** M08 — bands, calendar, table, overdue queue. A matured instrument only changes through explicit actions (C-06). */
export function MaturityPage() {
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const nav = useNavigate();
  const url = useUrlState();
  const all = useFdrViews();
  const held = useMemo(() => all.filter((v) => !['RELEASED', 'SUPERSEDED', 'REJECTED'].includes(v.derived.status) && v.fdr.verificationStatus === 'ACCEPTED'), [all]);
  const bands = state.settings.maturityBands;
  const band = url.get('band');
  const rows = held.filter((v) => !band || v.derived.band === band);
  const overdue = held.filter((v) => v.derived.status === 'MATURED');
  const tab = url.get('tab', 'table');

  const renewButton = (v: FdrView) => can(user, 'renewal.submit', { institutionId: v.fdr.institutionId }).allowed && canRenew(v.fdr).ok
    ? <Button size="sm" icon={<RefreshCcw size={14} aria-hidden />} onClick={(e) => { e.stopPropagation(); nav(`/fdrs/${v.fdr.id}/renew`); }}>Submit renewal</Button>
    : null;

  const columns: Column<FdrView>[] = [
    { id: 'priority', header: 'Priority', cell: (v) => <PriorityBadge priority={bandPriority(v.derived.band)} />, sortValue: (v) => PRIORITY_RANK[bandPriority(v.derived.band)] },
    { id: 'id', header: 'Record', cell: (v) => <FdrLink id={v.fdr.id} />, sortValue: (v) => v.fdr.id },
    { id: 'inst', header: 'Institution', cell: (v) => <span className="block max-w-[220px] truncate">{v.institution?.name}</span>, sortValue: (v) => v.institution?.name ?? '' },
    { id: 'amount', header: 'Amount', cell: (v) => formatINR(v.fdr.amountPaise), sortValue: (v) => v.fdr.amountPaise, className: 'text-right tabular-nums' },
    { id: 'maturity', header: 'Maturity', cell: (v) => formatDate(v.fdr.maturityDate), sortValue: (v) => v.fdr.maturityDate },
    { id: 'days', header: 'Days remaining', cell: (v) => <span className={v.derived.daysToMaturity < 0 ? 'font-semibold text-red-700' : ''}>{v.derived.daysToMaturity < 0 ? `${-v.derived.daysToMaturity} overdue` : v.derived.daysToMaturity}</span>, sortValue: (v) => v.derived.daysToMaturity, className: 'text-right tabular-nums' },
    { id: 'band', header: 'Band', cell: (v) => <BandBadge band={v.derived.band} bands={bands} />, sortValue: (v) => BAND_ORDER.indexOf(v.derived.band) },
    { id: 'status', header: 'Status', cell: (v) => <span className="flex flex-col gap-1"><StatusBadge status={v.derived.status} /><FlagChips flags={v.derived.flags.filter((f) => f !== 'PAST_MATURITY')} /></span>, sortValue: (v) => v.derived.status },
    { id: 'reminders', header: 'Reminders', cell: (v) => <Link onClick={(e) => e.stopPropagation()} to={`/fdrs/${v.fdr.id}?tab=reminders`} className="text-xs text-navy-700 hover:underline">{Object.values(state.notifications).filter((n) => n.fdrId === v.fdr.id).length} sent</Link> },
    { id: 'act', header: '', cell: renewButton },
  ];

  return (
    <div>
      <PageHeader title="Maturity monitoring & renewals" description={`Bands are configurable (currently ${bands.join(' / ')} days). Instruments accepted after verification and still held are shown. Matured instruments are never changed automatically — every renewal or release is an explicit, audited action.`} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[...BAND_ORDER].reverse().map((b) => {
          const items = held.filter((v) => v.derived.band === b);
          const active = band === b;
          return (
            <button key={b} type="button" aria-pressed={active} onClick={() => url.set({ band: active ? null : b, tab: 'table' })} className={`rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-navy-600 ${active ? 'border-navy-700 ring-2 ring-navy-100' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-600">{bandLabel(b, bands)}</span><PriorityBadge priority={bandPriority(b)} /></div>
              <div className="mt-1 text-2xl font-semibold text-navy-900">{items.length}</div>
              <div className="text-xs text-slate-500">{formatINR(items.reduce((s, v) => s + v.fdr.amountPaise, 0))}</div>
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardBody>
            <Tabs active={tab} onChange={(t) => url.set({ tab: t }, { resetPage: false })} tabs={[{ id: 'table', label: 'By days remaining', count: rows.length }, { id: 'calendar', label: 'Calendar' }]}>
              {tab === 'table' ? (
                <>
                  {band && <p className="mb-2 text-xs text-slate-600">Showing band {bandLabel(band as never, bands)}. <button type="button" className="text-navy-700 underline" onClick={() => url.set({ band: null })}>Show all</button></p>}
                  <DataTable caption="Maturity table" rows={rows} columns={columns} rowKey={(v) => v.fdr.id} onRowClick={(v) => nav(`/fdrs/${v.fdr.id}`)} sort={url.sort ?? { id: 'days', dir: 'asc' }} onSort={url.setSort} page={url.page} pageSize={url.pageSize} onPage={(p) => url.set({ page: p }, { resetPage: false })} onPageSize={(s) => url.set({ size: s })} />
                </>
              ) : <MaturityCalendar views={held} today={today} />}
            </Tabs>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Overdue action queue" subtitle="Matured — action required. No accepted renewal, no release, no closed case." />
          <ul className="divide-y divide-slate-100">
            {overdue.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No matured instruments awaiting action.</li>}
            {overdue.sort((a, b) => a.derived.daysToMaturity - b.derived.daysToMaturity).map((v) => (
              <li key={v.fdr.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <FdrLink id={v.fdr.id} />
                  <div className="truncate text-xs text-slate-500">{v.institution?.name} · {formatINR(v.fdr.amountPaise)}</div>
                  <div className="text-xs font-medium text-red-700">Matured {formatDate(v.fdr.maturityDate)} · {-v.derived.daysToMaturity} days ago</div>
                </div>
                {renewButton(v)}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
