import { AlertTriangle, Bot } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, SeverityBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { POTENTIAL_ISSUE_LABEL } from '@/domain/labels';
import type { Finding } from '@/domain/types';
import { useUserName } from '../hooks/useViews';

/** Rule output is always "Potential issue — requires review" (C-03), with rule, reason, records and suggested review (G3). */
export function FindingsList({ findings, actions, empty = 'No automated checks raised a potential issue.' }: { findings: Finding[]; actions?: (f: Finding) => ReactNode; empty?: string }) {
  const name = useUserName();
  if (!findings.length) return <EmptyState icon={<Bot size={24} aria-hidden />} title={empty} />;
  const order = { BLOCKING: 0, REVIEW: 1, INFO: 2 };
  return (
    <ul className="space-y-2">
      {[...findings].sort((a, b) => order[a.severity] - order[b.severity]).map((f) => (
        <li key={f.key} className={`rounded-md border px-3 py-2.5 ${f.resolution?.state === 'DISMISSED' ? 'border-slate-200 bg-slate-50 opacity-75' : 'border-amber-600/30 bg-white'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" aria-hidden />
            <span className="text-sm font-semibold text-slate-900">{f.title}</span>
            <SeverityBadge severity={f.severity} />
            <Badge tone="slate">{f.ruleId}</Badge>
            <Badge tone="amber">Automated check</Badge>
            {f.resolution && <Badge tone={f.resolution.state === 'DISMISSED' ? 'slate' : 'navy'}>{f.resolution.state === 'DISMISSED' ? 'Dismissed' : 'Acknowledged'}</Badge>}
          </div>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">{POTENTIAL_ISSUE_LABEL}</p>
          <p className="mt-1 text-sm text-slate-700">{f.explanation}</p>
          <p className="mt-1 text-xs text-slate-600"><span className="font-medium">Suggested review:</span> {f.suggestedReview}</p>
          <p className="mt-1 text-xs text-slate-500">
            Records: {f.entityRefs.map((r, i) => (
              <span key={`${r.type}-${r.id}`}>{i > 0 && ', '}<Link className="text-navy-700 hover:underline" to={r.type === 'FDR' ? `/fdrs/${r.id}` : `/institutions/${r.id}`}>{r.id}</Link></span>
            ))}
          </p>
          {f.resolution && <p className="mt-1 text-xs text-slate-500">{f.resolution.state === 'DISMISSED' ? 'Dismissed' : 'Acknowledged'} by {name(f.resolution.by)} · {formatDateTime(f.resolution.at)} — “{f.resolution.reason}”</p>}
          {actions && <div className="mt-2 flex flex-wrap gap-2">{actions(f)}</div>}
        </li>
      ))}
    </ul>
  );
}
