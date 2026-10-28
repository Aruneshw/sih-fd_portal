import { Columns3, Download, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Checkbox, DataTable, FilterBar, FilterSelect, Input, PageHeader, SearchInput } from '@/components/ui';
import { safeFilePart } from '@/lib/csv';
import { BAND_LABEL, DISPLAY_STATUS_LABEL, RENEWAL_STATUS_LABEL, VERIFICATION_STATUS_LABEL, bandLabel } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { scopedInstitutions } from '@/domain/selectors/scope';
import { downloadCsv } from '@/services/export/download';
import { useAppState, useRuntime, useUser } from '@/app/hooks';
import { useFdrViews, useUrlState } from '@/features/shared';
import { FDR_COLUMNS } from '../components/columns';
import { FILTER_KEYS, filterFdrs, type FdrFilters } from '../components/filterFdrs';

const opts = <K extends string>(labels: Record<K, string>) => (Object.entries(labels) as [K, string][]).map(([value, label]) => ({ value, label }));

export function FdrRegistryPage() {
  const state = useAppState();
  const user = useUser();
  const rt = useRuntime();
  const nav = useNavigate();
  const url = useUrlState();
  const views = useFdrViews();
  const [showCols, setShowCols] = useState(false);

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, url.get(k)])) as unknown as FdrFilters;
  const rows = useMemo(() => filterFdrs(views, filters), [views, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleIds = url.get('cols') ? url.get('cols').split(',') : FDR_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
  const columns = FDR_COLUMNS.map((c) => ({ ...c, hidden: !visibleIds.includes(c.id) }));
  const hasFilters = FILTER_KEYS.some((k) => url.get(k));
  const bands = state.settings.maturityBands;

  const exportCsv = () => {
    const cols = columns.filter((c) => !c.hidden);
    const filterPart = FILTER_KEYS.filter((k) => url.get(k)).map((k) => `${k}-${url.get(k)}`).join('_') || 'all';
    downloadCsv(`fdr-registry_${safeFilePart(filterPart)}_${safeFilePart(rt.clock.now())}.csv`, cols.map((c) => c.header), rows.map((r) => cols.map((c) => c.csv(r))));
  };

  return (
    <div>
      <PageHeader
        title="FDR & security deposit registry"
        description="Every instrument with its derived status. Status labels come from one shared derivation rule; filters are kept in the address bar so views can be linked."
        actions={
          <>
            {can(user, 'report.export').allowed && <Button icon={<Download size={16} aria-hidden />} onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>}
            {can(user, 'fdr.create').allowed && <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => nav('/fdrs/new')}>Add New FDR</Button>}
          </>
        }
      />
      <Card>
        <FilterBar hasFilters={hasFilters} onClear={() => url.clear(['cols', 'size'])}>
          <SearchInput label="Search by record ID or reference" value={filters.q} onChange={(v) => url.set({ q: v })} placeholder="Record ID or FDR reference" />
          {user.role !== 'INSTITUTION_REP' && <FilterSelect label="Institution" value={filters.inst} onChange={(v) => url.set({ inst: v })} options={scopedInstitutions(state, user).map((i) => ({ value: i.id, label: `${i.id} · ${i.name}` }))} />}
          <FilterSelect label="Bank" value={filters.bank} onChange={(v) => url.set({ bank: v })} options={Object.values(state.banks).map((b) => ({ value: b.id, label: b.name }))} />
          <FilterSelect label="Status" value={filters.status} onChange={(v) => url.set({ status: v })} options={[...opts(DISPLAY_STATUS_LABEL), ...(filters.status.includes(',') ? [{ value: filters.status, label: filters.status.split(',').map((s) => DISPLAY_STATUS_LABEL[s as keyof typeof DISPLAY_STATUS_LABEL] ?? s).join(' + ') }] : [])]} />
          <FilterSelect label="Verification" value={filters.vstatus} onChange={(v) => url.set({ vstatus: v })} options={opts(VERIFICATION_STATUS_LABEL)} />
          <FilterSelect label="Maturity period" value={filters.band} onChange={(v) => url.set({ band: v })} options={(Object.keys(BAND_LABEL) as (keyof typeof BAND_LABEL)[]).map((b) => ({ value: b, label: bandLabel(b, bands) }))} />
          <FilterSelect label="Renewal" value={filters.renewal} onChange={(v) => url.set({ renewal: v })} options={opts(RENEWAL_STATUS_LABEL)} />
          <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">Min ₹<Input aria-label="Minimum amount in rupees" value={filters.min} onChange={(e) => url.set({ min: e.target.value })} className="!h-8 !w-28 text-xs" inputMode="numeric" /></label>
          <label className="flex flex-col gap-0.5 text-[11px] font-medium text-slate-600">Max ₹<Input aria-label="Maximum amount in rupees" value={filters.max} onChange={(e) => url.set({ max: e.target.value })} className="!h-8 !w-28 text-xs" inputMode="numeric" /></label>
          <div className="relative ml-auto">
            <Button size="sm" variant="ghost" icon={<Columns3 size={14} aria-hidden />} aria-expanded={showCols} onClick={() => setShowCols((s) => !s)}>Columns</Button>
            {showCols && (
              <div className="absolute right-0 z-20 mt-1 w-56 space-y-1.5 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                {FDR_COLUMNS.map((c) => (
                  <Checkbox key={c.id} label={c.header} checked={visibleIds.includes(c.id)} onChange={(on) => url.set({ cols: (on ? [...visibleIds, c.id] : visibleIds.filter((x) => x !== c.id)).join(',') }, { resetPage: false })} />
                ))}
              </div>
            )}
          </div>
        </FilterBar>
        <div className="px-4 py-2 text-xs text-slate-500">{rows.length} of {views.length} instruments{hasFilters ? ' match the filters' : ''}.</div>
        <DataTable
          caption="FDR registry"
          rows={rows}
          columns={columns}
          rowKey={(v) => v.fdr.id}
          onRowClick={(v) => nav(`/fdrs/${v.fdr.id}`)}
          sort={url.sort ?? { id: 'id', dir: 'asc' }}
          onSort={url.setSort}
          page={url.page}
          pageSize={url.pageSize}
          onPage={(p) => url.set({ page: p }, { resetPage: false })}
          onPageSize={(s) => url.set({ size: s })}
        />
      </Card>
    </div>
  );
}
