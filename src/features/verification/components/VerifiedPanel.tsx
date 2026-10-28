import { BadgeCheck, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Field, Input, MoneyInput, Select, DateInput, Textarea } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { DOCUMENT_KIND_LABEL, FIELD_LABEL, METHOD_LABEL } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { displayValue } from '@/domain/rules/fieldValues';
import type { FdrView } from '@/domain/selectors/views';
import { VERIFIABLE_FIELDS, type AppState, type VerifiableField, type VerificationMethod } from '@/domain/types';
import { integrations } from '@/services/integrations';
import { useCommand, useUser } from '@/app/hooks';
import { useUserName } from '@/features/shared';
import { Panel } from './Panel';

const WORKING = ['UNDER_REVIEW', 'DISCREPANCY_FLAGGED', 'FURTHER_SCRUTINY'];

function ValueInput({ field, value, onChange, banks }: { field: VerifiableField; value: string; onChange: (v: string) => void; banks: AppState['banks'] }) {
  if (field === 'amountPaise') return <MoneyInput value={value ? Number(value) : null} onChange={(p) => onChange(p === null ? '' : String(p))} />;
  if (field === 'issueDate' || field === 'maturityDate') return <DateInput value={value} onChange={onChange} />;
  if (field === 'bankId') return <Select value={value} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{Object.values(banks).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>;
  return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
}

/** C-01: "verified" = recorded by a named officer with method and evidence. FR-M07-4/9. */
export function VerifiedPanel({ view, state }: { view: FdrView; state: AppState }) {
  const user = useUser();
  const name = useUserName();
  const { run, pending, fieldErrors } = useCommand();
  const f = view.fdr;
  const scope = { institutionId: f.institutionId, assignedOfficerId: f.assignedOfficerId };
  const working = WORKING.includes(f.verificationStatus);
  const canVerify = working && can(user, 'verification.recordVerified', scope).allowed;
  const canExtract = working && can(user, 'verification.recordExtracted', scope).allowed;
  const verified = Object.values(state.verified).filter((v) => v.fdrId === f.id).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const extracted = state.extracted[f.id];
  const evidenceDocs = f.documentIds.map((d) => state.documents[d]).filter((d) => d && (d.kind === 'BANK_CONFIRMATION' || d.kind === 'VERIFICATION_EVIDENCE'));

  const [mode, setMode] = useState<'none' | 'verify' | 'extract'>('none');
  const [field, setField] = useState<VerifiableField>('amountPaise');
  const [value, setValue] = useState('');
  const [method, setMethod] = useState<VerificationMethod>('BANK_CONFIRMATION_LETTER');
  const [evidence, setEvidence] = useState(evidenceDocs[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [values, setValues] = useState<Partial<Record<VerifiableField, string>>>(() => ({ ...(extracted?.values ?? {}) }));

  const saveVerified = () => {
    const r = run({ type: 'verification.recordVerified', payload: { fdrId: f.id, field, value, method, evidenceDocumentId: method === 'BANK_CONFIRMATION_LETTER' ? evidence : undefined, note: note || undefined } }, { success: 'Verified value recorded.' });
    if (r.ok) { setMode('none'); setValue(''); setNote(''); }
  };
  const saveExtracted = () => {
    const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v));
    const r = run({ type: 'verification.recordExtracted', payload: { fdrId: f.id, values: clean } }, { success: 'Values as read from document saved; comparison updated.' });
    if (r.ok) setMode('none');
  };

  return (
    <Panel n={3} tone="teal" title="Independently verified information" tag={<Badge tone="teal">Recorded by officer</Badge>}
      actions={<div className="flex gap-2">
        {canExtract && <Button size="sm" icon={<ScanLine size={14} aria-hidden />} onClick={() => setMode(mode === 'extract' ? 'none' : 'extract')}>Values as read from document</Button>}
        {canVerify && <Button size="sm" variant="success" icon={<BadgeCheck size={14} aria-hidden />} onClick={() => setMode(mode === 'verify' ? 'none' : 'verify')}>Record verified details</Button>}
      </div>}>
      {verified.length ? (
        <ul className="space-y-2">
          {verified.map((v) => (
            <li key={v.id} className="rounded-md border border-teal-600/30 bg-teal-50 px-3 py-2 text-sm">
              <div><span className="text-slate-600">{FIELD_LABEL[v.field]}:</span> <strong>{displayValue(state, v.field, v.value)}</strong></div>
              <div className="text-xs text-slate-600">Recorded as verified by {name(v.recordedBy)} · Method: {METHOD_LABEL[v.method]} · {formatDateTime(v.recordedAt)}{v.evidenceDocumentId ? ` · Evidence: ${state.documents[v.evidenceDocumentId]?.fileName ?? v.evidenceDocumentId}` : ''}</div>
              {v.note && <div className="text-xs text-slate-600">{v.note}</div>}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-500">No values recorded as verified yet. Nothing on this record has been confirmed with a bank by the system.</p>}

      {extracted && mode !== 'extract' && (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <strong>Values as read from document</strong> ({extracted.source === 'OCR_PORT' ? 'OCR port' : 'manual reading'} by {name(extracted.enteredBy)}): {(Object.entries(extracted.values) as [VerifiableField, string][]).map(([k, v]) => `${FIELD_LABEL[k]} ${displayValue(state, k, v)}`).join(' · ')}
        </p>
      )}

      {mode === 'extract' && (
        <div className="mt-4 space-y-3 rounded-md border border-slate-200 p-3">
          <p className="text-xs text-slate-600">Enter values exactly as they appear on the uploaded document. They are compared with the submission by rule R-08. {integrations.ocr.configured ? '' : 'OCR port: not configured — manual entry only.'}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {VERIFIABLE_FIELDS.map((k) => (
              <Field key={k} label={FIELD_LABEL[k]} error={fieldErrors[k]}>
                <ValueInput field={k} value={values[k] ?? ''} onChange={(v) => setValues((x) => ({ ...x, [k]: v }))} banks={state.banks} />
              </Field>
            ))}
          </div>
          <div className="flex justify-end gap-2"><Button size="sm" onClick={() => setMode('none')}>Cancel</Button><Button size="sm" variant="primary" loading={pending} onClick={saveExtracted}>Save values</Button></div>
        </div>
      )}

      {mode === 'verify' && (
        <div className="mt-4 space-y-3 rounded-md border border-teal-600/30 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Field"><Select value={field} onChange={(e) => { setField(e.target.value as VerifiableField); setValue(''); }}>{VERIFIABLE_FIELDS.map((k) => <option key={k} value={k}>{FIELD_LABEL[k]}</option>)}</Select></Field>
            <Field label="Confirmed value" required error={fieldErrors.value}><ValueInput field={field} value={value} onChange={setValue} banks={state.banks} /></Field>
            <Field label="Method" required error={fieldErrors.method}>
              <Select value={method} onChange={(e) => setMethod(e.target.value as VerificationMethod)}>
                <option value="BANK_CONFIRMATION_LETTER">{METHOD_LABEL.BANK_CONFIRMATION_LETTER}</option>
                <option value="OFFICIAL_BANK_CHANNEL_MANUAL">{METHOD_LABEL.OFFICIAL_BANK_CHANNEL_MANUAL}</option>
                <option value="AUTHORISED_BANK_API" disabled>{METHOD_LABEL.AUTHORISED_BANK_API}</option>
              </Select>
            </Field>
            {method === 'BANK_CONFIRMATION_LETTER' ? (
              <Field label="Evidence document" required error={fieldErrors.evidenceDocumentId} hint={evidenceDocs.length ? undefined : 'No bank confirmation letter on file — upload evidence or use the official channel method.'}>
                <Select value={evidence} onChange={(e) => setEvidence(e.target.value)}><option value="">Select…</option>{evidenceDocs.map((d) => <option key={d.id} value={d.id}>{d.fileName} ({DOCUMENT_KIND_LABEL[d.kind]})</option>)}</Select>
              </Field>
            ) : <div />}
            <Field label={method === 'OFFICIAL_BANK_CHANNEL_MANUAL' ? 'Channel details (who, when, reference)' : 'Note'} required={method === 'OFFICIAL_BANK_CHANNEL_MANUAL'} error={fieldErrors.note} className="sm:col-span-2"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></Field>
          </div>
          <div className="flex justify-end gap-2"><Button size="sm" onClick={() => setMode('none')}>Cancel</Button><Button size="sm" variant="success" loading={pending} disabled={!value} onClick={saveVerified}>Record as verified</Button></div>
        </div>
      )}
    </Panel>
  );
}
