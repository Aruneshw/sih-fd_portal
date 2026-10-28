import { ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, StatusBadge } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import type { AppState } from '@/domain/types';
import { fdrView } from '@/domain/selectors/views';

/** FR-M05-4 / FR-M08-6: predecessors and successors, including rejected links (history is never lost). */
export function RenewalChain({ state, today, fdrId }: { state: AppState; today: string; fdrId: string }) {
  const links = Object.values(state.renewalLinks);
  let root = fdrId;
  const seen = new Set<string>();
  while (state.fdrs[root]?.predecessorId && !seen.has(root)) { seen.add(root); root = state.fdrs[root].predecessorId!; }
  const chain: { id: string; via?: (typeof links)[number] }[] = [{ id: root }];
  const walk = (id: string, depth: number) => {
    if (depth > 20) return;
    for (const l of links.filter((x) => x.predecessorId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      chain.push({ id: l.successorId, via: l });
      walk(l.successorId, depth + 1);
    }
  };
  walk(root, 0);
  if (chain.length === 1) return <p className="text-sm text-slate-500">This instrument has no renewal or replacement history.</p>;
  return (
    <ol className="space-y-1">
      {chain.map(({ id, via }) => {
        const v = fdrView(state, today, id);
        if (!v) return null;
        return (
          <li key={id}>
            {via && (
              <div className="flex items-center gap-2 py-1 pl-4 text-xs text-slate-500">
                <ArrowDown size={14} aria-hidden /> {via.type === 'RENEWAL' ? 'Renewal' : 'Replacement'} link · {via.status === 'ACCEPTED' ? 'accepted' : via.status === 'REJECTED' ? 'rejected (kept in history)' : 'under verification'}
              </div>
            )}
            <div className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 ${id === fdrId ? 'border-navy-600 bg-navy-50' : 'border-slate-200 bg-white'}`}>
              <Link to={`/fdrs/${id}`} className="font-medium text-navy-700 hover:underline">{id}</Link>
              <span className="font-mono text-xs text-slate-600">{v.fdr.referenceNo}</span>
              <span className="text-sm tabular-nums">{formatINR(v.fdr.amountPaise)}</span>
              <span className="text-xs text-slate-500">{formatDate(v.fdr.issueDate)} → {formatDate(v.fdr.maturityDate)}</span>
              <StatusBadge status={v.derived.status} />
              {id === fdrId && <Badge tone="navy">This record</Badge>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
