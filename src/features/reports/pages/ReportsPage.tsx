import { Download, Printer } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, DateInput, EmptyState, FilterSelect, PageHeader, Pagination } from '@/components/ui';
import { safeFilePart } from '@/lib/csv';
import { can } from '@/domain/permissions/can';
import { downloadCsv } from '@/services/export/download';
import { REPORTS } from '@/services/export/reportDefinitions';
import { useAppState, useRuntime, useToday, useUser } from '@/app/hooks';
import { useUrlState } from '@/features/shared';

export function reportFilename(id: string, f: { from: string; to: string; status: string }, ts: string): string {
  const parts = [f.status && `status-${f.status}`, f.from && `from-${f.from}`, f.to && `to-${f.to}`].filter(Boolean).join('_') || 'all';
  return `${id}_${safeFilePart(parts)}_${safeFilePart(ts)}.csv`;
}

/** M11 — the preview table shows exactly the rows and columns that will be exported (FR-M11-2, T07). */
export function ReportsPage() {
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const rt = useRuntime();
  const url = useUrlState();
  const available = REPORTS.filter((r) => !r.requires || can(user, r.requires).allowed);
  const def = available.find((r) => r.id === url.get('report')) ?? available[0];
  const filters = { from: url.get('from'), to: url.get('to'), status: url.get('status') };
  const out = useMemo(() => def.build(state, today, user, filters), [def, state, today, user, filters.from, filters.to, filters.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const page = out.rows.slice((url.page - 1) * url.pageSize, url.page * url.pageSize);
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();

  return (
    <div>
      <PageHeader title="Reports & analytics" description="Choose a report, apply filters, check the preview, then export CSV (UTF-8 with BOM, formula-injection safe) or open the print view for Print to PDF." />
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader title="Reports" />
          <ul className="p-2">
            {available.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => url.set({ report: r.id, status: null, from: null, to: null })} aria-current={r.id === def.id} className={`w-full rounded-md px-3 py-2 text-left text-sm ${r.id === def.id ? 'bg-navy-50 font-medium text-navy-900' : 'text-slate-700 hover:bg-slate-50'}`}>
                  {r.title}<span className="block text-[11px] text-slate-500">{r.id}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title={def.title} subtitle={def.description} actions={
            <>
              <Link to={`/reports/${def.id}/print${qs ? `?${qs}` : ''}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"><Printer size={16} aria-hidden /> Print view</Link>
              {can(user, 'report.export').allowed && <Button variant="primary" icon={<Download size={16} aria-hidden />} disabled={!out.rows.length} onClick={() => downloadCsv(reportFilename(def.id, filters, rt.clock.now()), out.headers, out.rows)}>Export CSV</Button>}
            </>
          } />
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3">
            <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">{def.dateLabel} from<DateInput value={filters.from} onChange={(v) => url.set({ from: v })} className="!h-8 text-xs" aria-label={`${def.dateLabel} from`} /></label>
            <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">to<DateInput value={filters.to} onChange={(v) => url.set({ to: v })} className="!h-8 text-xs" aria-label={`${def.dateLabel} to`} /></label>
            {def.statusOptions.length > 0 && <FilterSelect label="Status" value={filters.status} onChange={(v) => url.set({ status: v })} options={def.statusOptions} />}
            <span className="ml-auto text-xs text-slate-500">{out.rows.length} row{out.rows.length === 1 ? '' : 's'} · {out.headers.length} columns will be exported</span>
          </div>
          <CardBody className="!p-0">
            {!out.rows.length ? <EmptyState title="No rows for these filters" /> : (
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">{def.title} preview</caption>
                  <thead><tr>{out.headers.map((h) => <th key={h} scope="col" className="sticky top-0 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{h}</th>)}</tr></thead>
                  <tbody>{page.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-slate-100 px-3 py-2 align-top">{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
            {out.rows.length > 0 && <Pagination page={url.page} pageSize={url.pageSize} total={out.rows.length} onPage={(p) => url.set({ page: p }, { resetPage: false })} onPageSize={(s) => url.set({ size: s })} />}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
