import { z } from 'zod';
import { isIsoDate } from '@/lib/dates';
import { ok } from '@/lib/result';
import { DocumentDraftSchema, DocumentKindSchema, PrioritySchema, VerifiableFieldSchema } from '@/domain/schemas';
import { OPEN_VERIFICATION } from '@/domain/workflows/verificationMachine';
import { runRules } from '@/domain/rules/engine';
import { DOCUMENT_KIND_LABEL } from '@/domain/labels';
import type { AppState, Fdr, VerifiableField, VerificationStatus, VerifiedField } from '@/domain/types';
import { addDocuments } from '../documents';
import { addReview } from '../reviews';
import { fail, fdrTarget, nextId, putFdr, touch } from '../helpers';
import { defineHandler, type AnyHandler, type CommandContext } from '../types';
import type { AuditDraft } from '../../audit/appendAudit';

const fdrId = z.string();
const textMin = (n: number, label: string) => z.string().trim().min(n, `${label} must be at least ${n} characters.`).max(2000);

/** Move an FDR to a new verification status with one audit draft. */
export function moveStatus(state: AppState, f: Fdr, to: VerificationStatus, action: string, ctx: CommandContext, comment?: string, extra: Partial<Fdr> = {}): { state: AppState; audit: AuditDraft } {
  const next = touch({ ...f, ...extra, verificationStatus: to }, ctx.now);
  const before: Record<string, unknown> = { verificationStatus: f.verificationStatus };
  const after: Record<string, unknown> = { verificationStatus: to };
  for (const k of Object.keys(extra) as (keyof Fdr)[]) { before[k] = f[k]; after[k] = next[k]; }
  return { state: putFdr(state, next), audit: { action, entityType: 'FDR', entityId: f.id, before, after, comment } };
}

const simpleMove = (action: string, schema: z.ZodType<{ fdrId: string; note?: string }>, opts: { review?: 'OBSERVATION' | 'DECISION' } = {}) =>
  defineHandler({
    schema,
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      let s = state;
      if (p.note && opts.review) s = addReview(s, f.id, opts.review, p.note, ctx);
      const m = moveStatus(s, f, nextStatus[action], action, ctx, p.note);
      return ok({ state: m.state, audits: [m.audit] });
    },
  });

const nextStatus: Record<string, VerificationStatus> = {
  'verification.startReview': 'UNDER_REVIEW',
  'verification.resolveFlag': 'UNDER_REVIEW',
  'verification.resumeReview': 'UNDER_REVIEW',
  'verification.escalate': 'FURTHER_SCRUTINY',
  'verification.returnToOfficer': 'UNDER_REVIEW',
};

function validExtractedValue(field: VerifiableField, v: string): boolean {
  if (field === 'amountPaise') return /^\d+$/.test(v) && Number(v) > 0;
  if (field === 'issueDate' || field === 'maturityDate') return isIsoDate(v);
  return v.trim().length > 0 && v.length <= 80;
}

export const verificationHandlers: Record<string, AnyHandler> = {
  'verification.assign': defineHandler({
    schema: z.object({ fdrId, officerId: z.string().min(1, 'Select an officer.'), priority: PrioritySchema.optional() }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      const officer = state.users[p.officerId];
      if (!officer || officer.role !== 'VERIFICATION_OFFICER') return fail('VALIDATION', 'Select a verification officer.', { officerId: 'Select a verification officer.' });
      if (!officer.active) return fail('VALIDATION', `${officer.name} is inactive.`, { officerId: 'Officer is inactive.' });
      const load = Object.values(state.fdrs).filter((x) => x.id !== f.id && x.assignedOfficerId === officer.id && OPEN_VERIFICATION.includes(x.verificationStatus)).length;
      if (officer.maxAssignedCases !== undefined && load >= officer.maxAssignedCases) {
        return fail('VALIDATION', `${officer.name} already holds ${load} open cases (cap ${officer.maxAssignedCases}).`, { officerId: 'Officer is at the assignment cap.' });
      }
      const to = f.verificationStatus === 'SUBMITTED' ? 'ASSIGNED' : f.verificationStatus;
      const m = moveStatus(state, f, to, 'verification.assign', ctx, `Assigned to ${officer.name}.`, { assignedOfficerId: officer.id, ...(p.priority ? { priority: p.priority } : {}) });
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'verification.startReview': simpleMove('verification.startReview', z.object({ fdrId, note: z.string().max(2000).optional() })),
  'verification.resolveFlag': simpleMove('verification.resolveFlag', z.object({ fdrId, note: textMin(5, 'Resolution note') }), { review: 'OBSERVATION' }),
  'verification.resumeReview': simpleMove('verification.resumeReview', z.object({ fdrId, note: z.string().max(2000).optional() }), { review: 'OBSERVATION' }),
  'verification.escalate': simpleMove('verification.escalate', z.object({ fdrId, note: textMin(10, 'Reason') }), { review: 'OBSERVATION' }),
  'verification.returnToOfficer': simpleMove('verification.returnToOfficer', z.object({ fdrId, note: textMin(5, 'Note') }), { review: 'DECISION' }),

  'verification.recordObservation': defineHandler({
    schema: z.object({ fdrId, text: textMin(5, 'Observation') }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => ok({
      state: putFdr(addReview(state, p.fdrId, 'OBSERVATION', p.text, ctx), touch(state.fdrs[p.fdrId], ctx.now)),
      audits: [{ action: 'verification.recordObservation', entityType: 'FDR', entityId: p.fdrId, comment: p.text }],
    }),
  }),

  'verification.flag': defineHandler({
    schema: z.object({ fdrId, observation: textMin(20, 'Observation'), findingKey: z.string().optional(), field: z.string().optional() }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      if (!p.findingKey && !p.field) return fail('VALIDATION', 'Link the flag to a finding or a field.', { findingKey: 'Select the related finding or field.' });
      const f = state.fdrs[p.fdrId];
      const s = addReview(state, f.id, 'OBSERVATION', p.observation, ctx);
      const m = moveStatus(s, f, 'DISCREPANCY_FLAGGED', 'verification.flag', ctx, p.observation);
      m.audit.after = { ...(m.audit.after as object), linkedTo: p.findingKey ?? p.field };
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'verification.requestInfo': defineHandler({
    schema: z.object({ fdrId, message: textMin(10, 'Message'), documentsRequested: z.array(DocumentKindSchema).default([]) }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      const docs = p.documentsRequested.map((k) => DOCUMENT_KIND_LABEL[k]).join(', ');
      const text = docs ? `${p.message} Documents requested: ${docs}.` : p.message;
      const m = moveStatus(addReview(state, f.id, 'INFO_REQUEST', text, ctx), f, 'INFO_REQUESTED', 'verification.requestInfo', ctx, text);
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'verification.respond': defineHandler({
    schema: z.object({ fdrId, note: z.string().trim().max(2000).default(''), documents: z.array(DocumentDraftSchema).max(10).default([]) }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      if (!p.note && !p.documents.length) return fail('VALIDATION', 'Add a note or at least one document.', { note: 'Add a note or attach a document.' });
      const f = state.fdrs[p.fdrId];
      const docs = addDocuments(state, p.documents, { fdrId: f.id }, ctx);
      const s = addReview(docs.state, f.id, 'RESPONSE', p.note || `Uploaded ${p.documents.length} document(s).`, ctx);
      const m = moveStatus(s, f, 'UNDER_REVIEW', 'verification.respond', ctx, p.note || undefined, { documentIds: [...f.documentIds, ...docs.ids] });
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'verification.recordExtracted': defineHandler({
    schema: z.object({ fdrId, values: z.record(VerifiableFieldSchema, z.string().trim()), source: z.enum(['MANUAL_READING', 'OCR_PORT']).default('MANUAL_READING') }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const values: Partial<Record<VerifiableField, string>> = {};
      const errors: Record<string, string> = {};
      for (const [k, v] of Object.entries(p.values) as [VerifiableField, string][]) {
        if (!v) continue;
        if (!validExtractedValue(k, v)) errors[k] = 'Enter a valid value.';
        else values[k] = v;
      }
      if (Object.keys(errors).length) return fail('VALIDATION', 'Please correct the highlighted values.', errors);
      if (!Object.keys(values).length) return fail('VALIDATION', 'Enter at least one value as read from the document.');
      const before = state.extracted[p.fdrId]?.values;
      const entry = { fdrId: p.fdrId, source: p.source, values, enteredBy: ctx.user.id, enteredAt: ctx.now };
      return ok({
        state: putFdr({ ...state, extracted: { ...state.extracted, [p.fdrId]: entry } }, touch(state.fdrs[p.fdrId], ctx.now)),
        audits: [{ action: 'verification.recordExtracted', entityType: 'FDR', entityId: p.fdrId, before, after: values, comment: 'Values as read from document (manual entry).' }],
      });
    },
  }),

  'verification.recordVerified': defineHandler({
    schema: z.object({
      fdrId, field: VerifiableFieldSchema, value: z.string().trim().min(1, 'Enter the confirmed value.').max(80),
      method: z.enum(['BANK_CONFIRMATION_LETTER', 'OFFICIAL_BANK_CHANNEL_MANUAL', 'AUTHORISED_BANK_API']),
      evidenceDocumentId: z.string().optional(), note: z.string().trim().max(1000).optional(),
    }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      // FR-M07-9 / C-01: the bank API option is not configured in the prototype.
      if (p.method === 'AUTHORISED_BANK_API') return fail('VALIDATION', 'Authorised bank API — not configured in this prototype.', { method: 'Not configured.' });
      if (!validExtractedValue(p.field, p.value)) return fail('VALIDATION', 'Enter a valid value.', { value: 'Enter a valid value.' });
      if (p.method === 'BANK_CONFIRMATION_LETTER') {
        if (!p.evidenceDocumentId || !f.documentIds.includes(p.evidenceDocumentId)) return fail('VALIDATION', 'Select the bank confirmation letter on file as evidence.', { evidenceDocumentId: 'Select the evidence document.' });
      }
      if (p.method === 'OFFICIAL_BANK_CHANNEL_MANUAL' && (!p.note || p.note.length < 10)) {
        return fail('VALIDATION', 'Describe the official channel used (who, when, reference).', { note: 'At least 10 characters.' });
      }
      const n = nextId(state, 'VER', 'VER-', 6);
      const v: VerifiedField = JSON.parse(JSON.stringify({ id: n.id, fdrId: f.id, field: p.field, value: p.value, method: p.method, evidenceDocumentId: p.evidenceDocumentId, recordedBy: ctx.user.id, recordedAt: ctx.now, note: p.note || undefined }));
      const s = { ...n.state, verified: { ...n.state.verified, [v.id]: v } };
      return ok({
        state: putFdr(s, touch({ ...f, lastVerifiedAt: ctx.now }, ctx.now)),
        audits: [{ action: 'verification.recordVerified', entityType: 'FDR', entityId: f.id, after: { field: p.field, value: p.value, method: p.method, evidenceDocumentId: p.evidenceDocumentId }, comment: p.note }],
      });
    },
  }),

  'verification.saveChecklist': defineHandler({
    schema: z.object({ fdrId, checklist: z.record(z.boolean()) }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => ok({
      state: putFdr(addReview(state, p.fdrId, 'CHECKLIST', 'Checklist saved.', ctx, p.checklist), touch(state.fdrs[p.fdrId], ctx.now)),
      audits: [{ action: 'verification.saveChecklist', entityType: 'FDR', entityId: p.fdrId, after: p.checklist }],
    }),
  }),

  'finding.acknowledge': findingHandler('ACKNOWLEDGED'),
  'finding.dismiss': findingHandler('DISMISSED'),
};

function findingHandler(stateTo: 'ACKNOWLEDGED' | 'DISMISSED') {
  return defineHandler({
    schema: z.object({ fdrId, findingKey: z.string().min(1), reason: textMin(5, 'Reason') }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const finding = runRules(state, ctx.today).find((f) => f.key === p.findingKey && f.entityRefs[0]?.id === p.fdrId);
      if (!finding) return fail('NOT_FOUND', 'That finding no longer applies to this record.');
      const n = nextId(state, 'RES', 'RES-', 6);
      const res = { id: n.id, findingKey: p.findingKey, state: stateTo, reason: p.reason, by: ctx.user.id, at: ctx.now };
      return ok({
        state: putFdr({ ...n.state, findingResolutions: { ...n.state.findingResolutions, [res.id]: res } }, touch(state.fdrs[p.fdrId], ctx.now)),
        audits: [{ action: stateTo === 'DISMISSED' ? 'finding.dismiss' : 'finding.acknowledge', entityType: 'FINDING', entityId: p.findingKey, before: finding.resolution ? { state: finding.resolution.state } : { state: 'OPEN' }, after: { state: stateTo }, comment: p.reason }],
      });
    },
  });
}
