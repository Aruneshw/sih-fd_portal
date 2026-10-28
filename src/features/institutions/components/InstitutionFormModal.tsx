import { useState } from 'react';
import { Button, Field, FormErrorSummary, Input, Modal, Select } from '@/components/ui';
import { INSTITUTION_STATUS_LABEL, INSTITUTION_TYPE_LABEL } from '@/domain/labels';
import { InstitutionFormSchema, type InstitutionForm } from '@/domain/schemas';
import type { Institution, InstitutionStatus, InstitutionType } from '@/domain/types';
import { useCommand } from '@/app/hooks';

const LABELS: Record<string, string> = { name: 'Name', type: 'Type', state: 'State', district: 'District', aicteCode: 'Institution code', representativeName: 'Authorised representative', contactEmail: 'Contact email', contactPhone: 'Contact phone', status: 'Status' };

/** FR-M04-4: admin create/edit with validation (zod schema shared with the handler). */
export function InstitutionFormModal({ institution, open, onClose, onCreated }: { institution?: Institution; open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const { run, pending } = useCommand();
  const [form, setForm] = useState<InstitutionForm>(() => institution
    ? { name: institution.name, type: institution.type, state: institution.state, district: institution.district, aicteCode: institution.aicteCode, representativeName: institution.representativeName, contactEmail: institution.contactEmail, contactPhone: institution.contactPhone, status: institution.status }
    : { name: '', type: 'ENGINEERING', state: '', district: '', aicteCode: 'DEMO-', representativeName: '', contactEmail: '', contactPhone: '+91 ', status: 'ACTIVE' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof InstitutionForm>(k: K, v: InstitutionForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => {
    const parsed = InstitutionFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    const r = institution
      ? run({ type: 'institution.edit', payload: { institutionId: institution.id, form: parsed.data }, expectedVersion: institution.version }, { success: 'Institution updated.' })
      : run({ type: 'institution.create', payload: { form: parsed.data } }, { success: 'Institution created.' });
    if (r.ok) { onClose(); if (!institution) onCreated?.((r.value as { institutionId: string }).institutionId); }
    else setErrors(r.error.fieldErrors ?? {});
  };
  const text = (k: 'name' | 'state' | 'district' | 'aicteCode' | 'representativeName' | 'contactEmail' | 'contactPhone', hint?: string) => (
    <Field label={LABELS[k]} required error={errors[k]} hint={hint}>
      <Input value={form[k]} onChange={(e) => set(k, k === 'aicteCode' ? e.target.value.toUpperCase() : e.target.value)} />
    </Field>
  );
  return (
    <Modal open={open} onClose={onClose} size="lg" title={institution ? `Edit ${institution.id}` : 'New institution'} description="Use fictional details only — this is demonstration data."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={pending} onClick={save}>{institution ? 'Save changes' : 'Create institution'}</Button></>}>
      <div className="space-y-3">
        <FormErrorSummary errors={errors} labels={LABELS} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">{text('name')}</div>
          <Field label="Type" required><Select value={form.type} onChange={(e) => set('type', e.target.value as InstitutionType)}>{(Object.keys(INSTITUTION_TYPE_LABEL) as InstitutionType[]).map((t) => <option key={t} value={t}>{INSTITUTION_TYPE_LABEL[t]}</option>)}</Select></Field>
          <Field label="Status" required><Select value={form.status} onChange={(e) => set('status', e.target.value as InstitutionStatus)}>{(Object.keys(INSTITUTION_STATUS_LABEL) as InstitutionStatus[]).map((t) => <option key={t} value={t}>{INSTITUTION_STATUS_LABEL[t]}</option>)}</Select></Field>
          {text('state')}{text('district')}
          {text('aicteCode', 'Capital letters, digits and hyphens, e.g. DEMO-MH-1013')}
          {text('representativeName')}{text('contactEmail', 'Use a .invalid address for demo data')}{text('contactPhone')}
        </div>
      </div>
    </Modal>
  );
}
