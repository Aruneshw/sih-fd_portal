import { useState } from 'react';
import { Badge, Button, Checkbox, Field, Textarea, Timeline } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { can } from '@/domain/permissions/can';
import type { FdrView } from '@/domain/selectors/views';
import type { AppState } from '@/domain/types';
import { useCommand, useUser } from '@/app/hooks';
import { useUserName } from '@/features/shared';
import { Panel } from './Panel';

const WORKING = ['UNDER_REVIEW', 'DISCREPANCY_FLAGGED', 'FURTHER_SCRUTINY'];

export function latestChecklist(state: AppState, fdrId: string): Record<string, boolean> {
  const r = Object.values(state.reviews).filter((x) => x.fdrId === fdrId && x.checklist).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  return r?.checklist ?? {};
}

export function ConclusionsPanel({ view, state }: { view: FdrView; state: AppState }) {
  const user = useUser();
  const name = useUserName();
  const { run, pending } = useCommand();
  const f = view.fdr;
  const scope = { institutionId: f.institutionId, assignedOfficerId: f.assignedOfficerId };
  const working = WORKING.includes(f.verificationStatus);
  const canObserve = working && can(user, 'verification.recordObservation', scope).allowed;
  const canChecklist = working && can(user, 'verification.saveChecklist', scope).allowed;
  const items = state.settings.categoryRequirements[f.category]?.checklist ?? [];
  const saved = latestChecklist(state, f.id);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((c) => [c, !!saved[c]])));
  const [obs, setObs] = useState('');
  const reviews = Object.values(state.reviews).filter((r) => r.fdrId === f.id && r.kind !== 'CHECKLIST').sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const officer = f.assignedOfficerId ? name(f.assignedOfficerId) : 'Unassigned';

  return (
    <Panel n={4} tone="navy" title="Officer review conclusions" tag={<Badge tone="navy">{officer}</Badge>}>
      <div className="space-y-4">
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Verification checklist</legend>
          {items.map((c) => <Checkbox key={c} label={c} checked={!!checklist[c]} disabled={!canChecklist} onChange={(on) => setChecklist((x) => ({ ...x, [c]: on }))} />)}
          {canChecklist && <Button size="sm" className="mt-1" loading={pending} onClick={() => run({ type: 'verification.saveChecklist', payload: { fdrId: f.id, checklist } }, { success: 'Checklist saved.' })}>Save checklist</Button>}
        </fieldset>
        {canObserve && (
          <div className="space-y-2">
            <Field label="Record observation"><Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="What you checked and what you found." /></Field>
            <Button size="sm" variant="primary" loading={pending} disabled={obs.trim().length < 5} onClick={() => { const r = run({ type: 'verification.recordObservation', payload: { fdrId: f.id, text: obs } }, { success: 'Observation recorded.' }); if (r.ok) setObs(''); }}>Add observation</Button>
          </div>
        )}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Observations, requests and recommendations</h3>
          <Timeline empty="No conclusions recorded yet." items={reviews.map((r) => ({ id: r.id, title: r.kind.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()), meta: `${name(r.officerId)} · ${formatDateTime(r.createdAt)}`, body: r.text, tone: r.kind === 'OVERRIDE' ? 'amber' : r.kind === 'RECOMMENDATION' || r.kind === 'DECISION' ? 'teal' : 'navy' }))} />
        </div>
      </div>
    </Panel>
  );
}
