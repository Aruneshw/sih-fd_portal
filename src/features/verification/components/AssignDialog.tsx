import { useState } from 'react';
import { Button, Field, Modal, Select } from '@/components/ui';
import { PRIORITY_LABEL } from '@/domain/labels';
import { OPEN_VERIFICATION } from '@/domain/workflows/verificationMachine';
import type { Fdr, Priority } from '@/domain/types';
import { useAppState, useCommand } from '@/app/hooks';

/** verification.assign — shows each officer's current load against their cap. */
export function AssignDialog({ fdr, open, onClose }: { fdr: Fdr; open: boolean; onClose: () => void }) {
  const state = useAppState();
  const { run, pending, fieldErrors } = useCommand();
  const [officerId, setOfficerId] = useState(fdr.assignedOfficerId ?? '');
  const [priority, setPriority] = useState<Priority>(fdr.priority);
  const officers = Object.values(state.users).filter((u) => u.role === 'VERIFICATION_OFFICER');
  const load = (id: string) => Object.values(state.fdrs).filter((f) => f.assignedOfficerId === id && OPEN_VERIFICATION.includes(f.verificationStatus) && f.id !== fdr.id).length;
  const submit = () => {
    const r = run({ type: 'verification.assign', payload: { fdrId: fdr.id, officerId, priority }, expectedVersion: fdr.version }, { success: `${fdr.id} assigned to ${state.users[officerId]?.name}.` });
    if (r.ok) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`${fdr.assignedOfficerId ? 'Reassign' : 'Assign'} ${fdr.id}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={pending} onClick={submit} disabled={!officerId}>{fdr.assignedOfficerId ? 'Reassign' : 'Assign'}</Button></>}>
      <div className="space-y-4">
        <Field label="Verification officer" required error={fieldErrors.officerId}>
          <Select value={officerId} onChange={(e) => setOfficerId(e.target.value)} data-autofocus>
            <option value="">Select officer…</option>
            {officers.map((o) => (
              <option key={o.id} value={o.id} disabled={!o.active}>
                {o.name} — {load(o.id)} open{o.maxAssignedCases ? ` / cap ${o.maxAssignedCases}` : ''}{o.active ? '' : ' (inactive)'}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
