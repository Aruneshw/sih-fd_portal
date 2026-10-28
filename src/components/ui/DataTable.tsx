import clsx from 'clsx';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  hidden?: boolean;
}

export interface SortState { id: string; dir: 'asc' | 'desc' }

export function sortRows<T>(rows: T[], columns: Column<T>[], sort?: SortState | null): T[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.id === sort.id);
  if (!col?.sortValue) return rows;
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = col.sortValue!(a);
    const y = col.sortValue!(b);
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
}

/** Sticky header, keyboard-sortable columns, empty state, optional pagination. Sorting/paging state lives in the caller (URL). */
export function DataTable<T>({
  rows, columns, rowKey, onRowClick, sort, onSort, empty, page, pageSize, onPage, onPageSize, caption, selectedKey,
}: {
  rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; sort?: SortState | null; onSort?: (s: SortState) => void;
  empty?: ReactNode; page?: number; pageSize?: number; onPage?: (p: number) => void; onPageSize?: (s: number) => void; caption?: string; selectedKey?: string;
}) {
  const visible = columns.filter((c) => !c.hidden);
  const sorted = sortRows(rows, columns, sort);
  const paged = page && pageSize ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;
  return (
    <div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {visible.map((c) => {
                const active = sort?.id === c.id;
                const ariaSort = active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none';
                return (
                  <th key={c.id} scope="col" aria-sort={c.sortValue ? ariaSort : undefined} className={clsx('sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600', c.className)}>
                    {c.sortValue && onSort ? (
                      <button type="button" className="inline-flex items-center gap-1 hover:text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-600" onClick={() => onSort({ id: c.id, dir: active && sort!.dir === 'asc' ? 'desc' : 'asc' })}>
                        {c.header}
                        {active ? sort!.dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden /> : <ArrowUpDown size={12} className="text-slate-400" aria-hidden />}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => {
              const key = rowKey(r);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={clsx(onRowClick && 'cursor-pointer hover:bg-navy-50 focus-visible:bg-navy-50 focus-visible:outline-none', selectedKey === key && 'bg-navy-50')}
                >
                  {visible.map((c) => (
                    <td key={c.id} className={clsx('border-b border-slate-100 px-3 py-2 align-top text-slate-800', c.className)}>{c.cell(r)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (empty ?? <EmptyState title="No records match" description="Adjust or clear the filters to see more records." />)}
      </div>
      {page && pageSize && onPage && onPageSize && rows.length > 0 && <Pagination page={page} pageSize={pageSize} total={rows.length} onPage={onPage} onPageSize={onPageSize} />}
    </div>
  );
}
