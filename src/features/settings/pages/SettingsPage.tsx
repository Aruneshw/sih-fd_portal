import { PlugZap, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmDialog, Field, FormErrorSummary, Input, MoneyInput, PageHeader, Textarea, useToast } from '@/components/ui';
import { CATEGORY_LABEL, DOCUMENT_KIND_LABEL } from '@/domain/labels';
import type { DocumentKind, InstrumentCategory, Settings } from '@/domain/types';
import { createDemoAuthProvider, integrations, INSIGHTS_PORT } from '@/services/integrations';
import { useAppState, useCommand, useRuntime, useUser } from '@/app/hooks';

const KINDS: DocumentKind[] = ['FDR_SCAN', 'BANK_CONFIRMATION', 'AUTHORISATION_LETTER'];
const MIME = [['application/pdf', 'PDF'], ['image/jpeg', 'JPG'], ['image/png', 'PNG']] as const;

/** M14 — validated, audited settings; demo reset behind a typed confirmation (FR-M14-3). */
export function SettingsPage() {
  const state = useAppState();
  const user = useUser();
  const rt = useRuntime();
  const toast = useToast();
  const nav = useNavigate();
  const { run, pending } = useCommand();
  const [s, setS] = useState<Settings>(() => structuredClone(state.settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetOpen, setResetOpen] = useState(false);
  const [word, setWord] = useState('');
  const num = (v: string) => (v === '' ? Number.NaN : Number(v));
  const save = () => {
    const r = run({ type: 'settings.manage', payload: { settings: s } }, { success: 'Settings saved and audited.' });
    setErrors(r.ok ? {} : r.error.fieldErrors ?? {});
  };
  const reset = () => {
    const r = rt.resetDemo(user.id, word);
    if (r.ok) { toast.success('Demo data reset. A new audit chain has started.'); setResetOpen(false); setWord(''); setS(structuredClone(rt.getState()!.settings)); nav('/'); }
    else toast.error(r.error.message);
  };
  const setReq = (c: InstrumentCategory, k: DocumentKind, on: boolean) => setS((x) => ({ ...x, categoryRequirements: { ...x.categoryRequirements, [c]: { ...x.categoryRequirements[c], requiredDocs: on ? [...x.categoryRequirements[c].requiredDocs, k] : x.categoryRequirements[c].requiredDocs.filter((d) => d !== k) } } }));
  const ports = [createDemoAuthProvider(rt.adapter, rt.clock.now).status, integrations.bank.status, integrations.ocr.status, integrations.notifications.status, INSIGHTS_PORT];

  return (
    <div className="space-y-4">
      <PageHeader title="Settings & configuration" description="Thresholds and requirements are configurable placeholders, not actual AICTE rules. Every change is validated and recorded with before/after values."
        actions={<Button variant="primary" icon={<Save size={16} aria-hidden />} loading={pending} onClick={save}>Save settings</Button>} />
      <FormErrorSummary errors={errors} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Maturity and escalation" />
          <CardBody className="grid gap-3 sm:grid-cols-3">
            {(['Watch band (days)', 'Due-soon band (days)', 'Critical band (days)'] as const).map((label, i) => (
              <Field key={label} label={label} error={i === 0 ? errors.maturityBands : undefined}>
                <Input type="number" min={1} value={Number.isNaN(s.maturityBands[i]) ? '' : s.maturityBands[i]} onChange={(e) => setS((x) => { const b = [...x.maturityBands] as Settings['maturityBands']; b[i] = num(e.target.value); return { ...x, maturityBands: b }; })} />
              </Field>
            ))}
            <Field label="Expiring-soon window (days)" error={errors.expiringSoonDays}><Input type="number" min={1} value={Number.isNaN(s.expiringSoonDays) ? '' : s.expiringSoonDays} onChange={(e) => setS((x) => ({ ...x, expiringSoonDays: num(e.target.value) }))} /></Field>
            <Field label="Follow-up after (days)" error={errors['escalation.followUpAfterDays']}><Input type="number" min={1} value={Number.isNaN(s.escalation.followUpAfterDays) ? '' : s.escalation.followUpAfterDays} onChange={(e) => setS((x) => ({ ...x, escalation: { ...x.escalation, followUpAfterDays: num(e.target.value) } }))} /></Field>
            <Field label="Escalate after (days)" error={errors['escalation.escalateAfterDays']}><Input type="number" min={1} value={Number.isNaN(s.escalation.escalateAfterDays) ? '' : s.escalation.escalateAfterDays} onChange={(e) => setS((x) => ({ ...x, escalation: { ...x.escalation, escalateAfterDays: num(e.target.value) } }))} /></Field>
            <p className="text-xs text-slate-500 sm:col-span-3">Bands must be strictly descending positive integers (default 90 / 30 / 7).</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Uploads and amounts" />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Field label="Max file size (MB)" error={errors['upload.maxBytes']}><Input type="number" min={0.1} step={0.5} value={s.upload.maxBytes / 1024 / 1024} onChange={(e) => setS((x) => ({ ...x, upload: { ...x.upload, maxBytes: Math.round(num(e.target.value) * 1024 * 1024) } }))} /></Field>
            <Field label="Amount cap" error={errors.amountCapPaise}><MoneyInput value={s.amountCapPaise} onChange={(v) => setS((x) => ({ ...x, amountCapPaise: v ?? 0 }))} /></Field>
            <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium text-slate-800">Allowed file types</legend>
              <div className="flex gap-4">{MIME.map(([m, l]) => <Checkbox key={m} label={l} checked={s.upload.allowedMime.includes(m)} onChange={(on) => setS((x) => ({ ...x, upload: { ...x.upload, allowedMime: on ? [...x.upload.allowedMime, m] : x.upload.allowedMime.filter((y) => y !== m) } }))} />)}</div>
            </fieldset>
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Instrument categories" subtitle="Required documents (missing ones raise rule R-09) and the officer checklist (one item per line)." />
        <CardBody className="grid gap-4 md:grid-cols-2">
          {(Object.keys(CATEGORY_LABEL) as InstrumentCategory[]).map((c) => (
            <div key={c} className="rounded-md border border-slate-200 p-3">
              <h3 className="mb-2 text-sm font-semibold text-navy-900">{CATEGORY_LABEL[c]}</h3>
              <div className="mb-2 flex flex-wrap gap-3">{KINDS.map((k) => <Checkbox key={k} label={DOCUMENT_KIND_LABEL[k]} checked={s.categoryRequirements[c].requiredDocs.includes(k)} onChange={(on) => setReq(c, k, on)} />)}</div>
              <Field label="Checklist items"><Textarea rows={4} value={s.categoryRequirements[c].checklist.join('\n')} onChange={(e) => setS((x) => ({ ...x, categoryRequirements: { ...x.categoryRequirements, [c]: { ...x.categoryRequirements[c], checklist: e.target.value.split('\n').map((l) => l.trimStart()).filter((l, i, arr) => l || i === arr.length - 1) } } }))} /></Field>
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Integrations" icon={<PlugZap size={16} aria-hidden />} subtitle="Every external dependency sits behind a port with a mock adapter. Production swaps adapters, not features." />
        <ul className="divide-y divide-slate-100">
          {ports.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1"><div className="text-sm font-medium text-slate-900">{p.name}</div><div className="text-xs text-slate-600">{p.adapter}</div><div className="text-xs text-slate-500">Production: {p.production}</div></div>
              <Badge tone="amber">Not configured — mock adapter active</Badge>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="border-red-700/30">
        <CardHeader title="Reset demo data" subtitle="Restores the scenario catalogue S-01…S-13. The new audit chain starts with a demo.reset event." />
        <CardBody><Button variant="danger" icon={<RotateCcw size={16} aria-hidden />} onClick={() => setResetOpen(true)}>Reset demo data…</Button></CardBody>
      </Card>
      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={reset} tone="danger" title="Reset demonstration data?" confirmLabel="Reset demo data" confirmDisabled={word !== 'RESET'}
        summary="All current records, uploads metadata, notifications and the audit chain will be replaced with the original demonstration dataset.">
        <Field label='Type "RESET" to confirm' required><Input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" data-autofocus /></Field>
      </ConfirmDialog>
    </div>
  );
}
