import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Filters, sort, page and tab live in URL search params (architecture.md §16). */
export function useUrlState() {
  const [params, setParams] = useSearchParams();
  const get = useCallback((k: string, d = '') => params.get(k) ?? d, [params]);
  const set = useCallback(
    (updates: Record<string, string | number | null | undefined>, opts: { resetPage?: boolean } = { resetPage: true }) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(updates)) {
          if (v === null || v === undefined || v === '') next.delete(k);
          else next.set(k, String(v));
        }
        if (opts.resetPage && !('page' in updates)) next.delete('page');
        return next;
      }, { replace: true });
    },
    [setParams],
  );
  const clear = useCallback((keep: string[] = []) => {
    setParams((prev) => {
      const next = new URLSearchParams();
      for (const k of keep) { const v = prev.get(k); if (v) next.set(k, v); }
      return next;
    }, { replace: true });
  }, [setParams]);
  const sort = params.get('sort');
  const sortState = sort ? { id: sort.replace(/^-/, ''), dir: sort.startsWith('-') ? ('desc' as const) : ('asc' as const) } : null;
  return {
    params, get, set, clear,
    page: Math.max(1, Number(params.get('page') ?? 1) || 1),
    pageSize: [10, 25, 50].includes(Number(params.get('size'))) ? Number(params.get('size')) : 25,
    sort: sortState,
    setSort: (s: { id: string; dir: 'asc' | 'desc' }) => set({ sort: `${s.dir === 'desc' ? '-' : ''}${s.id}` }, { resetPage: false }),
  };
}
