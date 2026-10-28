import { useState } from 'react';
import { Badge, Button, Field, Modal, Textarea } from '@/components/ui';
import { can } from '@/domain/permissions/can';
import type { FdrView } from '@/domain/selectors/views';
import type { Finding } from '@/domain/types';
import { useCommand, useUser } from '@/app/hooks';
import { FindingsList } from '@/features/shared';
import { Panel } from './Panel';

const WORKING = ['UNDER_REVIEW', 'DISCREPANCY_FLAGGED', 'FURTHER_SCRUTINY'];

/** FR-M07-8: acknowledge or dismiss with a reason; dismissal never deletes the finding. */
export function FindingsPanel({ view }: { view: FdrView }) {
  const user = useUser();
  const { run, pending, fieldErrors } = useCommand();
  const [target, setTarget] = useState<{ f: Finding; kind: 'finding.acknowledge' | 'finding.dismiss' } | null>(null);
  const [reason, setReason] = useState('');
  const scope = { institutionId: view.fdr.institutionId, assignedOfficerId: view.fdr.assignedOfficerId };
  const working = WORKING.includes(view.fdr.verificationStatus);
  const canAck = working && can(user, 'finding.acknowledge', scope).allowed;
  const canDismiss = working && can(user, 'finding.dismiss', scope).allowed;
  const submit = () => {
    if (!target) return;
    const r = run({ type: target.kind, payload: { fdrId: view.fdr.id, findingKey: target.f.key, reason } }, { success: target.kind === 'finding.dismiss' ? 'Finding dismissed — history retained.' : 'Finding acknowledged.' });
    if (r.ok) { setTarget(null); setReason(''); }
  };
  const visible = view.findings;
  return (
    <Panel n={2} tone="amber" title="Automatically detected potential issues" tag={<Badge tone="amber">Automated check</Badge>}>
      <FindingsList
        findings={visible}
        actions={(canAck || canDismiss) ? (f) => f.resolution?.state === 'DISMISSED' ? null : (
          <>
            {canAck && f.resolution?.state !== 'ACKNOWLEDGED' && <Button size="sm" onClick={() => setTarget({ f, kind: 'finding.acknowledge' })}>Acknowledge</Button>}
            {canDismiss && <Button size="sm" variant="ghost" onClick={() => setTarget({ f, kind: 'finding.dismiss' })}>Dismiss with reason</Button>}
          </>
        ) : undefined}
      />
      <Modal open={!!target} onClose={() => setTarget(null)} title={target?.kind === 'finding.dismiss' ? 'Dismiss finding' : 'Acknowledge finding'} description={target?.f.title}
        footer={<><Button onClick={() => setTarget(null)}>Cancel</Button><Button variant="primary" loading={pending} disabled={reason.trim().length < 5} onClick={submit}>{target?.kind === 'finding.dismiss' ? 'Dismiss' : 'Acknowledge'}</Button></>}>
        <Field label="Reason" required error={fieldErrors.reason} hint="At least 5 characters. Recorded in the audit trail.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus />
        </Field>
      </Modal>
    </Panel>
  );
}
