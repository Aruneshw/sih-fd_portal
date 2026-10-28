import { ArrowLeft, ArrowRight, CheckCircle2, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, Field, FormErrorSummary, PageHeader, Select, Stepper, Timeline } from '@/components/ui';
import { addMonthsIso, formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { normaliseReference } from '@/lib/text';
import { CATEGORY_LABEL, DOCUMENT_KIND_LABEL } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { findDuplicates } from '@/domain/rules/duplicate';
import type { DocumentDraft } from '@/domain/schemas';
import { scopedInstitutions } from '@/domain/selectors/scope';
import { canRenew } from '@/domain/workflows/renewalMachine';
import type { DocumentKind } from '@/domain/types';
import { useAppState, useCommand, useRuntime, useToday, useUser } from '@/app/hooks';
import { DocumentUploader } from '@/features/shared';
import { DuplicateNotice } from '../components/DuplicateNotice';
import { InstrumentFields } from '../components/InstrumentFields';
import { emptyDraft, FIELD_LABELS, validateDraft, type InstrumentDraft } from '../components/instrumentDraft';

const STEPS = ['Institution', 'Instrument details', 'Documents', 'Review', 'Submitted'];
interface SavedDraft { mode: string; step: number; institutionId: string; draft: InstrumentDraft; documents: DocumentDraft[]; ack: boolean; type: 'RENEWAL' | 'REPLACEMENT' }

/** FR-M06-1…6 and FR-M08-5 (renewal mode via /fdrs/:id/renew). */
export function SubmissionWizardPage() {
  const { id: predecessorId } = useParams();
  const state = useAppState();
  const user = useUser();
  const today = useToday();
  const rt = useRuntime();
  const nav = useNavigate();
  const { run, pending } = useCommand();
  const pred = predecessorId ? state.fdrs[predecessorId] : undefined;
  const mode = pred ? `renew:${pred.id}` : 'new';

  const initial = useMemo((): SavedDraft => {
    const saved = rt.drafts.load(user.id) as SavedDraft | null;
    if (saved && saved.mode === mode && saved.step < 4) return saved;
    if (pred) {
      const issue = pred.maturityDate <= today ? pred.maturityDate : today;
      return { mode, step: 1, institutionId: pred.institutionId, ack: false, type: 'RENEWAL', documents: [], draft: { ...emptyDraft(pred.declaredInstitutionCode), bankId: pred.bankId, branch: pred.branch, amountPaise: pred.amountPaise, category: pred.category, issueDate: issue, maturityDate: addMonthsIso(issue, 12) } };
    }
    const inst = user.institutionId ?? '';
    return { mode, step: user.institutionId ? 1 : 0, institutionId: inst, ack: false, type: 'RENEWAL', documents: [], draft: emptyDraft(inst ? state.institutions[inst]?.aicteCode ?? '' : '') };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [step, setStep] = useState(initial.step);
  const [institutionId, setInstitutionId] = useState(initial.institutionId);
  const [draft, setDraft] = useState(initial.draft);
  const [documents, setDocuments] = useState<DocumentDraft[]>(initial.documents);
  const [ack, setAck] = useState(initial.ack);
  const [type, setType] = useState(initial.type);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ fdrId: string; applicationRef: string } | null>(null);
  const dirty = useRef(false);

  // FR-M06-5: autosave the draft per step.
  useEffect(() => {
    if (result) return;
    rt.drafts.save(user.id, { mode, step, institutionId, draft, documents, ack, type } satisfies SavedDraft);
  }, [step, institutionId, draft, documents, ack, type, result, mode, rt, user.id]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty.current && !result && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (dirty.current && !result) e.preventDefault(); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [result]);

  if (pred && !canRenew(pred).ok && !result) {
    return <Card className="p-6"><p className="text-sm text-slate-700">{canRenew(pred).reason}</p><Link className="mt-3 inline-block text-sm text-navy-700 underline" to={`/fdrs/${pred.id}`}>Back to {pred.id}</Link></Card>;
  }

  const inst = state.institutions[institutionId];
  const validation = validateDraft(draft, today, state.settings.amountCapPaise);
  const fieldErrors = validation.ok ? {} : validation.errors;
  const visibleErrors = Object.fromEntries(Object.entries({ ...fieldErrors, ...serverErrors }).filter(([k]) => showAll || touched.has(k) || serverErrors[k]));
  const duplicates = draft.referenceNo && draft.bankId ? findDuplicates({ referenceNorm: normaliseReference(draft.referenceNo), bankId: draft.bankId, amountPaise: draft.amountPaise ?? -1, issueDate: draft.issueDate }, Object.values(state.fdrs)) : [];
  const exact = duplicates.some((d) => d.kind === 'EXACT');
  const possible = duplicates.some((d) => d.kind === 'POSSIBLE');
  const req = draft.category ? state.settings.categoryRequirements[draft.category].requiredDocs : (['FDR_SCAN'] as DocumentKind[]);
  const missingDocs = req.filter((k) => !documents.some((d) => d.kind === k));
  const canViewFdr = (instId: string) => can(user, 'fdr.view', { institutionId: instId }).allowed;

  const update = (d: InstrumentDraft) => { dirty.current = true; setServerErrors({}); setDraft(d); };
  const next = () => {
    if (step === 0 && !inst) { setShowAll(true); return; }
    if (step === 1) {
      setShowAll(true);
      if (!validation.ok || exact || (possible && !ack)) return;
    }
    if (step === 2 && !documents.some((d) => d.kind === 'FDR_SCAN')) { setShowAll(true); return; }
    setShowAll(false);
    setStep((s) => s + 1);
  };

  const submit = () => {
    if (!validation.ok) return;
    const payload = { details: validation.details, documents, acknowledgeDuplicate: possible ? ack : undefined };
    const r = pred
      ? run({ type: 'renewal.submit', payload: { ...payload, predecessorId: pred.id, type } }, { toastValidation: true })
      : run({ type: 'fdr.create', payload: { ...payload, institutionId } }, { toastValidation: true });
    if (!r.ok) {
      setServerErrors(r.error.fieldErrors ?? {});
      if (r.error.fieldErrors && Object.keys(r.error.fieldErrors).some((k) => k in FIELD_LABELS && k !== 'documents')) setStep(1);
      return;
    }
    dirty.current = false;
    rt.drafts.clear(user.id);
    setResult(r.value as { fdrId: string; applicationRef: string });
    setStep(4);
  };

  const cancel = () => { dirty.current = false; rt.drafts.clear(user.id); nav(pred ? `/fdrs/${pred.id}` : '/fdrs'); };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={pred ? `Renewal / replacement of ${pred.id}` : 'New submission'}
        title={pred ? 'Submit renewal or replacement' : 'Add new FDR'}
        description={pred ? 'The new instrument goes through normal verification. The predecessor stays on record and is only superseded once the new one is accepted.' : 'Your draft is saved automatically at each step.'}
      />
      <Card className="mb-4 p-4"><Stepper steps={STEPS} current={step} /></Card>
      <Card>
        <CardBody className="space-y-4">
          {step === 0 && (
            <Field label="Institution" required error={showAll && !inst ? 'Select an institution.' : undefined}>
              <Select value={institutionId} onChange={(e) => { dirty.current = true; setInstitutionId(e.target.value); setDraft((d) => ({ ...d, declaredInstitutionCode: state.institutions[e.target.value]?.aicteCode ?? '' })); }}>
                <option value="">Select institution…</option>
                {scopedInstitutions(state, user).filter((i) => i.status !== 'INACTIVE').map((i) => <option key={i.id} value={i.id}>{i.id} · {i.name}</option>)}
              </Select>
            </Field>
          )}
          {step >= 1 && step < 4 && inst && (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Institution: <strong>{inst.name}</strong> ({inst.id} · code {inst.aicteCode}){(user.institutionId || pred) && <span className="ml-1 text-xs text-slate-500">— locked</span>}
            </div>
          )}
          {step === 1 && (
            <>
              {pred && (
                <Field label="Type">
                  <Select value={type} onChange={(e) => setType(e.target.value as 'RENEWAL' | 'REPLACEMENT')}>
                    <option value="RENEWAL">Renewal (same bank, new term)</option>
                    <option value="REPLACEMENT">Replacement (new instrument)</option>
                  </Select>
                </Field>
              )}
              <FormErrorSummary errors={showAll ? { ...fieldErrors, ...serverErrors } : serverErrors} labels={FIELD_LABELS} />
              <InstrumentFields value={draft} onChange={update} errors={visibleErrors} onBlurField={(k) => setTouched((t) => new Set(t).add(k))} banks={Object.values(state.banks)} />
              <DuplicateNotice matches={duplicates} canView={canViewFdr} acknowledged={ack} onAcknowledge={(v) => { dirty.current = true; setAck(v); }} />
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-sm text-slate-700">Required for <strong>{draft.category ? CATEGORY_LABEL[draft.category] : 'this category'}</strong>: {req.map((k) => DOCUMENT_KIND_LABEL[k]).join(', ')}. Uploaded files are stored as submitted; they are not authenticated by this system.</p>
              <DocumentUploader drafts={documents} onChange={(d) => { dirty.current = true; setDocuments(d); }} kinds={['FDR_SCAN', 'BANK_CONFIRMATION', 'AUTHORISATION_LETTER']} error={showAll && !documents.some((d) => d.kind === 'FDR_SCAN') ? 'Attach the FDR scan or PDF to continue.' : serverErrors.documents} />
              {missingDocs.length > 0 && documents.some((d) => d.kind === 'FDR_SCAN') && (
                <p className="rounded-md border border-amber-600/40 bg-amber-50 px-3 py-2 text-xs text-amber-700">Still missing: {missingDocs.map((k) => DOCUMENT_KIND_LABEL[k]).join(', ')}. You may submit now, but this will be recorded as a blocking potential issue until the document is supplied.</p>
              )}
            </>
          )}
          {step === 3 && validation.ok && (
            <div className="space-y-3">
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {[
                  ['Institution', `${inst?.name} (${institutionId})`], ['FDR reference', draft.referenceNo], ['Bank / branch', `${state.banks[draft.bankId]?.name} — ${draft.branch}`],
                  ['Amount', formatINR(validation.details.amountPaise)], ['Issue date', formatDate(draft.issueDate)], ['Maturity date', formatDate(draft.maturityDate)],
                  ['Category', draft.category ? CATEGORY_LABEL[draft.category] : ''], ['Institution code on instrument', draft.declaredInstitutionCode],
                  ['Documents', documents.map((d) => `${d.fileName} (${DOCUMENT_KIND_LABEL[d.kind]})`).join(', ')], ['Remarks', draft.remarks || '—'],
                  ...(pred ? [['Predecessor', `${pred.id} (${type === 'RENEWAL' ? 'renewal' : 'replacement'})`]] : []),
                ].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
              </dl>
              {possible && <p className="text-xs text-amber-700">Possible duplicate acknowledged — a review finding will be created.</p>}
              <FormErrorSummary errors={serverErrors} labels={FIELD_LABELS} />
            </div>
          )}
          {step === 4 && result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-teal-600/30 bg-teal-50 px-4 py-3">
                <CheckCircle2 className="mt-0.5 text-teal-600" aria-hidden />
                <div>
                  <p className="font-semibold text-navy-900">Submitted for verification</p>
                  <p className="text-sm text-slate-700">Application reference <strong>{result.applicationRef}</strong> · record <Link className="font-medium text-navy-700 underline" to={`/fdrs/${result.fdrId}`}>{result.fdrId}</Link>. Status: Verification Pending.</p>
                </div>
              </div>
              <Timeline items={[
                { id: '1', title: 'Submitted', meta: 'Completed just now', tone: 'teal' },
                { id: '2', title: 'Officer assignment', meta: 'Administrator assigns a verification officer', tone: 'slate' },
                { id: '3', title: 'Verification review', meta: 'Officer scrutinises documents and records conclusions', tone: 'slate' },
                { id: '4', title: 'Decision', meta: 'Administrator accepts, or rejects with a written reason', tone: 'slate' },
              ]} />
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => nav(`/fdrs/${result.fdrId}`)}>Open record</Button>
                <Button onClick={() => nav('/fdrs')}>Go to registry</Button>
              </div>
            </div>
          )}
        </CardBody>
        {step < 4 && (
          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={cancel}>Cancel and discard draft</Button>
            </div>
            <div className="flex gap-2">
              {step > (user.institutionId || pred ? 1 : 0) && <Button icon={<ArrowLeft size={16} aria-hidden />} onClick={() => setStep((s) => s - 1)}>Back</Button>}
              {step < 3 && <Button variant="primary" onClick={next} disabled={step === 1 && exact} disabledReason="Exact duplicate — change the reference or bank.">Next <ArrowRight size={16} aria-hidden /></Button>}
              {step === 3 && <Button variant="primary" icon={<Send size={16} aria-hidden />} loading={pending} onClick={submit}>Submit for verification</Button>}
            </div>
          </div>
        )}
      </Card>
      {blocker.state === 'blocked' && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="leave-title" className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 id="leave-title" className="text-base font-semibold text-navy-900">Leave this submission?</h2>
            <p className="mt-2 text-sm text-slate-600">Your draft is saved in this browser and will be restored when you return.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => blocker.reset()}>Stay</Button>
              <Button variant="primary" onClick={() => blocker.proceed()}>Leave</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
