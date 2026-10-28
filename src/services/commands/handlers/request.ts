import { z } from 'zod';
import { ok } from '@/lib/result';
import { DocumentDraftSchema } from '@/domain/schemas';
import { OPEN_REQUEST_STAGES } from '@/domain/workflows/requestMachine';
import { OPEN_VERIFICATION } from '@/domain/workflows/verificationMachine';
import type { AppState, Fdr, ReleaseRequest, RequestStage } from '@/domain/types';
import type { AuditDraft } from '../../audit/appendAudit';
import { addDocuments } from '../documents';
import { fail, nextId, putFdr, putRequest, requestTarget, str, touch } from '../helpers';
import { defineHandler, type AnyHandler, type CommandContext } from '../types';

const requestId = z.string();
const textMin = (n: number, label: string) => z.string().trim().min(n, `${label} must be at least ${n} characters.`).max(2000);
const MIN_REASON = 30;

function stageMove(state: AppState, r: ReleaseRequest, to: RequestStage, action: string, ctx: CommandContext, note?: string, extra: Partial<ReleaseRequest> = {}): { state: AppState; audit: AuditDraft } {
  const next = touch({ ...r, ...extra, stage: to, reviewNotes: note ? [...r.reviewNotes, { stage: to, by: ctx.user.id, at: ctx.now, text: note }] : r.reviewNotes }, ctx.now);
  const after: Record<string, unknown> = { stage: to };
  for (const k of Object.keys(extra)) after[k] = (next as unknown as Record<string, unknown>)[k];
  return { state: putRequest(state, next), audit: { action, entityType: 'REQUEST', entityId: r.id, before: { stage: r.stage }, after, comment: note } };
}

function setFdrAdmin(state: AppState, fdrId: string, to: Fdr['adminStatus'], action: string, ctx: CommandContext, comment: string): { state: AppState; audit: AuditDraft } {
  const f = state.fdrs[fdrId];
  return { state: putFdr(state, touch({ ...f, adminStatus: to }, ctx.now)), audit: { action, entityType: 'FDR', entityId: f.id, before: { adminStatus: f.adminStatus }, after: { adminStatus: to }, comment } };
}

/** System validation step (architecture.md §7.3): reason length and supporting documents. */
function systemValidate(state: AppState, r: ReleaseRequest, ctx: CommandContext): { state: AppState; audit: AuditDraft } {
  const problems: string[] = [];
  if (r.reason.trim().length < MIN_REASON) problems.push(`the reason must be at least ${MIN_REASON} characters`);
  if (!r.documentIds.some((d) => state.documents[d]?.kind === 'REQUEST_SUPPORT')) problems.push('at least one supporting document is required');
  const to: RequestStage = problems.length ? 'RETURNED_FOR_CORRECTION' : 'VALIDATED';
  const text = problems.length ? `Returned for correction: ${problems.join('; ')}.` : 'System validation passed.';
  const next = touch({ ...r, stage: to, reviewNotes: [...r.reviewNotes, { stage: to, by: 'SYSTEM', at: ctx.now, text }] }, ctx.now);
  return { state: putRequest(state, next), audit: { action: 'request.validate', entityType: 'REQUEST', entityId: r.id, before: { stage: r.stage }, after: { stage: to }, comment: text, system: true } };
}

export const requestHandlers: Record<string, AnyHandler> = {
  'request.submit': defineHandler({
    schema: z.object({ fdrId: z.string(), type: z.enum(['RELEASE', 'REFUND']), reason: z.string().trim().min(1, 'Enter the reason for the request.').max(2000), documents: z.array(DocumentDraftSchema).max(10).default([]), fixedId: z.string().regex(/^REQ-DEMO-\d{4}$/).optional() }),
    target: (state, raw) => {
      const f = state.fdrs[str(raw, 'fdrId')];
      if (!f) return fail('VALIDATION', 'Select an instrument.', { fdrId: 'Select an instrument.' });
      return ok({ entityType: 'REQUEST', entityId: 'new', scope: { institutionId: f.institutionId } });
    },
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      // FR-M09-3
      if (f.verificationStatus !== 'ACCEPTED') return fail('VALIDATION', 'Only an instrument accepted after verification can be the subject of a request.', { fdrId: 'Instrument is not accepted.' });
      if (f.adminStatus !== 'RECORDED') return fail('VALIDATION', 'This instrument is superseded, released or already has an open request.', { fdrId: 'Not eligible.' });
      if (f.renewalStatus === 'SUBMITTED') return fail('VALIDATION', 'A renewal of this instrument is under verification.', { fdrId: 'Renewal pending.' });
      if (Object.values(state.requests).some((r) => r.fdrId === f.id && OPEN_REQUEST_STAGES.includes(r.stage))) return fail('VALIDATION', 'Only one open request is allowed per instrument.', { fdrId: 'Request already open.' });
      let s = state;
      let id = p.fixedId && ctx.seeding ? p.fixedId : '';
      if (!id) {
        const n = nextId(s, `REQ-${ctx.today.slice(0, 4)}`, `REQ-${ctx.today.slice(0, 4)}-`, 4);
        id = n.id;
        s = n.state;
      }
      const docs = addDocuments(s, p.documents, { requestId: id }, ctx);
      s = docs.state;
      const r: ReleaseRequest = { id, institutionId: f.institutionId, fdrId: f.id, type: p.type, reason: p.reason, documentIds: docs.ids, stage: 'SUBMITTED', reviewNotes: [{ stage: 'SUBMITTED', by: ctx.user.id, at: ctx.now, text: p.reason }], submittedAt: ctx.now, version: 1, isDemo: true };
      s = putRequest(s, r);
      const fa = setFdrAdmin(s, f.id, 'RELEASE_REQUESTED', 'request.submit', ctx, `${p.type === 'RELEASE' ? 'Release' : 'Refund'} request ${id} submitted.`);
      const v = systemValidate(fa.state, fa.state.requests[id], ctx);
      return ok({
        state: v.state,
        audits: [{ action: 'request.submit', entityType: 'REQUEST', entityId: id, after: { stage: 'SUBMITTED', fdrId: f.id, type: p.type }, comment: p.reason }, fa.audit, v.audit],
        result: { requestId: id, stage: v.state.requests[id].stage },
      });
    },
  }),

  'request.resubmit': defineHandler({
    schema: z.object({ requestId, reason: z.string().trim().min(1).max(2000), documents: z.array(DocumentDraftSchema).max(10).default([]) }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      const r = state.requests[p.requestId];
      const docs = addDocuments(state, p.documents, { requestId: r.id }, ctx);
      const m = stageMove(docs.state, r, 'SUBMITTED', 'request.resubmit', ctx, p.reason, { reason: p.reason, documentIds: [...r.documentIds, ...docs.ids] });
      const v = systemValidate(m.state, m.state.requests[r.id], ctx);
      return ok({ state: v.state, audits: [m.audit, v.audit], result: { stage: v.state.requests[r.id].stage } });
    },
  }),

  'request.assign': defineHandler({
    schema: z.object({ requestId, officerId: z.string().min(1, 'Select an officer.') }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      const o = state.users[p.officerId];
      if (!o || o.role !== 'VERIFICATION_OFFICER' || !o.active) return fail('VALIDATION', 'Select an active verification officer.', { officerId: 'Select an active officer.' });
      const load = Object.values(state.fdrs).filter((x) => x.assignedOfficerId === o.id && OPEN_VERIFICATION.includes(x.verificationStatus)).length;
      if (o.maxAssignedCases !== undefined && load >= o.maxAssignedCases) return fail('VALIDATION', `${o.name} is at the assignment cap.`, { officerId: 'At cap.' });
      const m = stageMove(state, state.requests[p.requestId], 'UNDER_REVIEW', 'request.assign', ctx, `Assigned to ${o.name}.`, { assignedOfficerId: o.id });
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'request.requestInfo': defineHandler({
    schema: z.object({ requestId, message: textMin(10, 'Message') }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      const m = stageMove(state, state.requests[p.requestId], 'INFO_REQUESTED', 'request.requestInfo', ctx, p.message);
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'request.respond': defineHandler({
    schema: z.object({ requestId, note: z.string().trim().max(2000).default(''), documents: z.array(DocumentDraftSchema).max(10).default([]) }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      if (!p.note && !p.documents.length) return fail('VALIDATION', 'Add a note or at least one document.', { note: 'Add a note or attach a document.' });
      const r = state.requests[p.requestId];
      const docs = addDocuments(state, p.documents, { requestId: r.id }, ctx);
      const m = stageMove(docs.state, r, 'UNDER_REVIEW', 'request.respond', ctx, p.note || `Uploaded ${p.documents.length} document(s).`, { documentIds: [...r.documentIds, ...docs.ids] });
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'request.recommend': defineHandler({
    schema: z.object({ requestId, recommendation: z.enum(['APPROVE', 'REJECT']), notes: textMin(10, 'Review notes') }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      const m = stageMove(state, state.requests[p.requestId], 'RECOMMENDED', 'request.recommend', ctx, `Recommendation: ${p.recommendation === 'APPROVE' ? 'approve' : 'reject'}. ${p.notes}`, { recommendation: p.recommendation });
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'request.approve': defineHandler({
    schema: z.object({ requestId, decisionRef: z.string().trim().min(4, 'Enter the decision reference.').max(60), reason: textMin(5, 'Decision note') }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      // C-05: an approval is a simulated administrative decision; nothing is paid or released here.
      const m = stageMove(state, state.requests[p.requestId], 'APPROVED', 'request.approve', ctx, `Approved — simulated administrative decision (Ref: ${p.decisionRef}). ${p.reason}`, { decisionRef: p.decisionRef, decisionReason: p.reason });
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'request.reject': defineHandler({
    schema: z.object({ requestId, decisionRef: z.string().trim().min(4, 'Enter the decision reference.').max(60), reason: textMin(10, 'Reason') }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      const r = state.requests[p.requestId];
      const m = stageMove(state, r, 'REJECTED', 'request.reject', ctx, `Rejected — simulated administrative decision (Ref: ${p.decisionRef}). ${p.reason}`, { decisionRef: p.decisionRef, decisionReason: p.reason });
      const fa = setFdrAdmin(m.state, r.fdrId, 'RECORDED', 'request.reject', ctx, `Request ${r.id} rejected; instrument remains recorded.`);
      return ok({ state: fa.state, audits: [m.audit, fa.audit] });
    },
  }),

  'request.returnToOfficer': defineHandler({
    schema: z.object({ requestId, note: textMin(5, 'Note') }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      const m = stageMove(state, state.requests[p.requestId], 'UNDER_REVIEW', 'request.returnToOfficer', ctx, p.note);
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'request.recordAction': defineHandler({
    schema: z.object({ requestId, finalActionRef: z.string().trim().min(4, 'Enter the final action reference.').max(60) }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      const r = state.requests[p.requestId];
      const m = stageMove(state, r, 'ACTION_RECORDED', 'request.recordAction', ctx, `Release action recorded (Ref: ${p.finalActionRef}).`, { finalActionRef: p.finalActionRef });
      const fa = setFdrAdmin(m.state, r.fdrId, 'RELEASED', 'request.recordAction', ctx, `Release action recorded (Ref: ${p.finalActionRef}) — simulated.`);
      return ok({ state: fa.state, audits: [m.audit, fa.audit] });
    },
  }),

  'request.close': defineHandler({
    schema: z.object({ requestId, note: z.string().trim().max(1000).optional() }),
    machine: 'request',
    target: requestTarget,
    apply: (state, p, ctx) => {
      const m = stageMove(state, state.requests[p.requestId], 'CLOSED', 'request.close', ctx, p.note || `Closed on ${ctx.today}.`, { closedAt: ctx.today });
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),
};
