import { Building2, FileStack, Search, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui';
import { normaliseReference } from '@/lib/text';
import { scopedFdrs, scopedInstitutions, scopedRequests } from '@/domain/selectors/scope';
import { useAppState, useUser } from '../hooks';

interface Hit { id: string; label: string; sub: string; to: string; kind: 'INSTITUTION' | 'FDR' | 'REQUEST' }

/** FR-M02-2: Ctrl/⌘+K search across institutions, FDR references and request IDs (scoped). */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const user = useUser();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  useEffect(() => { if (open) { setQ(''); setActive(0); } }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const norm = normaliseReference(q);
    const out: Hit[] = [];
    for (const i of scopedInstitutions(state, user)) if (i.name.toLowerCase().includes(t) || i.id.toLowerCase().includes(t) || i.aicteCode.toLowerCase().includes(t)) out.push({ id: i.id, label: i.name, sub: `${i.id} · ${i.state}`, to: `/institutions/${i.id}`, kind: 'INSTITUTION' });
    for (const f of scopedFdrs(state, user)) if (f.id.toLowerCase().includes(t) || (norm && f.referenceNorm.includes(norm)) || f.applicationRef.toLowerCase().includes(t)) out.push({ id: f.id, label: `${f.id} · ${f.referenceNo}`, sub: state.institutions[f.institutionId]?.name ?? '', to: `/fdrs/${f.id}`, kind: 'FDR' });
    for (const r of scopedRequests(state, user)) if (r.id.toLowerCase().includes(t)) out.push({ id: r.id, label: r.id, sub: `${r.type === 'RELEASE' ? 'Release' : 'Refund'} · ${r.fdrId}`, to: `/requests/${r.id}`, kind: 'REQUEST' });
    return out.slice(0, 12);
  }, [q, state, user]);

  const go = (h: Hit) => { onClose(); nav(h.to); };
  const Icon = { INSTITUTION: Building2, FDR: FileStack, REQUEST: Send };
  return (
    <Modal open={open} onClose={onClose} title="Search records" description="Institutions, FDR references, application and request IDs.">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          data-autofocus
          aria-label="Search"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="global-search-results"
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === 'Enter' && hits[active]) go(hits[active]);
          }}
          placeholder="e.g. FDR-DEMO-0005, KCB/FD/778812, Konkan"
          className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-100"
        />
      </div>
      <ul id="global-search-results" role="listbox" className="mt-3 max-h-80 overflow-y-auto">
        {q.trim().length >= 2 && !hits.length && <li className="px-2 py-6 text-center text-sm text-slate-500">No matching records in your scope.</li>}
        {hits.map((h, i) => {
          const I = Icon[h.kind];
          return (
            <li key={`${h.kind}-${h.id}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(h)} className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left ${i === active ? 'bg-navy-50' : ''}`}>
                <I size={16} className="text-slate-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{h.label}</span>
                  <span className="block truncate text-xs text-slate-500">{h.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
