import { DateInput, Field, Input, MoneyInput, Select, Textarea } from '@/components/ui';
import { CATEGORY_LABEL } from '@/domain/labels';
import type { Bank, InstrumentCategory } from '@/domain/types';
import type { InstrumentDraft } from './instrumentDraft';

export function InstrumentFields({ value, onChange, errors, onBlurField, banks, lockReference }: {
  value: InstrumentDraft; onChange: (d: InstrumentDraft) => void; errors: Record<string, string>; onBlurField?: (k: keyof InstrumentDraft) => void; banks: Bank[]; lockReference?: boolean;
}) {
  const set = <K extends keyof InstrumentDraft>(k: K, v: InstrumentDraft[K]) => onChange({ ...value, [k]: v });
  const blur = (k: keyof InstrumentDraft) => () => onBlurField?.(k);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="FDR reference number" required error={errors.referenceNo} hint="As printed on the instrument, e.g. KCB/FD/778812">
        <Input value={value.referenceNo} onChange={(e) => set('referenceNo', e.target.value)} onBlur={blur('referenceNo')} disabled={lockReference} autoComplete="off" />
      </Field>
      <Field label="Issuing bank" required error={errors.bankId}>
        <Select value={value.bankId} onChange={(e) => set('bankId', e.target.value)} onBlur={blur('bankId')}>
          <option value="">Select bank…</option>
          {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </Field>
      <Field label="Branch" required error={errors.branch}>
        <Input value={value.branch} onChange={(e) => set('branch', e.target.value)} onBlur={blur('branch')} />
      </Field>
      <Field label="Amount (₹)" required error={errors.amountPaise} hint="Must be greater than ₹0 and within the configured cap.">
        <MoneyInput value={value.amountPaise} onChange={(v) => set('amountPaise', v)} onBlur={blur('amountPaise')} />
      </Field>
      <Field label="Issue date" required error={errors.issueDate} hint="Cannot be in the future.">
        <DateInput value={value.issueDate} onChange={(v) => set('issueDate', v)} onBlur={blur('issueDate')} />
      </Field>
      <Field label="Maturity date" required error={errors.maturityDate} hint="Must be after the issue date.">
        <DateInput value={value.maturityDate} onChange={(v) => set('maturityDate', v)} onBlur={blur('maturityDate')} />
      </Field>
      <Field label="Instrument category" required error={errors.category} hint="Placeholder categories — not actual AICTE rules.">
        <Select value={value.category} onChange={(e) => set('category', e.target.value as InstrumentCategory)} onBlur={blur('category')}>
          <option value="">Select category…</option>
          {(Object.keys(CATEGORY_LABEL) as InstrumentCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </Select>
      </Field>
      <Field label="Institution code as written on the instrument" required error={errors.declaredInstitutionCode}>
        <Input value={value.declaredInstitutionCode} onChange={(e) => set('declaredInstitutionCode', e.target.value.toUpperCase())} onBlur={blur('declaredInstitutionCode')} />
      </Field>
      <Field label="Remarks" error={errors.remarks} className="md:col-span-2" hint="Optional, up to 1,000 characters.">
        <Textarea value={value.remarks} onChange={(e) => set('remarks', e.target.value)} maxLength={1000} />
      </Field>
    </div>
  );
}
