import { useState } from 'react';
import { Button, FormErrorSummary, Modal } from '@/components/ui';
import { normaliseReference } from '@/lib/text';
import { can } from '@/domain/permissions/can';
import { findDuplicates } from '@/domain/rules/duplicate';
import type { Fdr } from '@/domain/types';
import { useAppState, useCommand, useToday, useUser } from '@/app/hooks';
import { DuplicateNotice, draftFromFdr, FIELD_LABELS, InstrumentFields, validateDraft } from '@/features/submission';

/** FR-M05-5: edit while Submitted / Information requested; the audit event stores before/after. */
export function EditFdrModal({ fdr, open, onClose }: { fdr: Fdr; open: boolean; onClose: () => void }) {
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const { run, pending } = useCommand();
  const [draft, setDraft] = useState(() => draftFromFdr(fdr));
  const [ack, setAck] = useState(false);
  const [server, setServer] = useState<Record<string, string>>({});
  const v = validateDraft(draft, today, state.settings.amountCapPaise);
  const errors = { ...(v.ok ? {} : v.errors), ...server };
  const dups = draft.referenceNo && draft.bankId ? findDuplicates({ id: fdr.id, referenceNorm: normaliseReference(draft.referenceNo), bankId: draft.bankId, amountPaise: draft.amountPaise ?? -1, issueDate: draft.issueDate }, Object.values(state.fdrs)) : [];
  const possible = dups.some((d) => d.kind === 'POSSIBLE');
  const save = () => {
    if (!v.ok) return;
    const r = run({ type: 'fdr.edit', payload: { fdrId: fdr.id, details: v.details, acknowledgeDuplicate: possible ? ack : undefined }, expectedVersion: fdr.version }, { success: `${fdr.id} updated.` });
    if (r.ok) onClose();
    else setServer(r.error.fieldErrors ?? {});
  };
  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Edit ${fdr.id}`} description="Changes are recorded in the audit trail with previous and new values."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={pending} onClick={save} disabled={!v.ok || dups.some((d) => d.kind === 'EXACT') || (possible && !ack)}>Save changes</Button></>}>
      <div className="space-y-3">
        <FormErrorSummary errors={errors} labels={FIELD_LABELS} />
        <InstrumentFields value={draft} onChange={(d) => { setServer({}); setDraft(d); }} errors={errors} banks={Object.values(state.banks)} />
        <DuplicateNotice matches={dups} canView={(id) => can(user, 'fdr.view', { institutionId: id }).allowed} acknowledged={ack} onAcknowledge={setAck} />
      </div>
    </Modal>
  );
}
