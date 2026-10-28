import { Badge, Timeline } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { ROLE_LABEL } from '@/domain/labels';
import type { AuditEvent } from '@/domain/types';
import { useUserName } from '../hooks/useViews';

function summarise(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'object') return String(v);
  return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${typeof x === 'object' ? JSON.stringify(x) : String(x)}`).join(' · ');
}

export function AuditList({ events, empty = 'No audit events for this record.' }: { events: AuditEvent[]; empty?: string }) {
  const name = useUserName();
  return (
    <Timeline
      empty={empty}
      items={[...events].reverse().map((e) => ({
        id: e.id,
        tone: e.outcome === 'DENIED' ? 'red' : e.outcome === 'FAILED' ? 'amber' : 'navy',
        title: (
          <span className="flex flex-wrap items-center gap-2">
            <code className="text-xs">{e.action}</code>
            {e.outcome !== 'SUCCESS' && <Badge tone={e.outcome === 'DENIED' ? 'red' : 'amber'}>{e.outcome}</Badge>}
          </span>
        ),
        meta: `${e.id} · ${formatDateTime(e.at)} · ${name(e.userId)}${e.role !== 'SYSTEM' ? ` (${ROLE_LABEL[e.role]})` : ''}`,
        body: (
          <div className="space-y-0.5 text-xs">
            {e.comment && <div className="text-slate-700">{e.comment}</div>}
            {e.before !== undefined && <div className="text-slate-500"><span className="font-medium">Before:</span> {summarise(e.before)}</div>}
            {e.after !== undefined && <div className="text-slate-500"><span className="font-medium">After:</span> {summarise(e.after)}</div>}
          </div>
        ),
      }))}
    />
  );
}
