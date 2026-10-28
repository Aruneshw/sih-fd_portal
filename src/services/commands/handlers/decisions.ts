import { z } from 'zod';
import { ok } from '@/lib/result';
import { openBlocking, runRules } from '@/domain/rules/engine';
import type { AppState, Fdr } from '@/domain/types';
import type { AuditDraft } from '../../audit/appendAudit';
import { addReview } from '../reviews';
import { fail, fdrTarget, putFdr, touch } from '../helpers';
import { defineHandler, type AnyHandler, type CommandContext } from '../types';
import { moveStatus } from './verification';

const fdrId = z.string();

/** §7.2 steps 3–4: the successor's decision updates its predecessor and link in the same commit. */
function applyRenewalOutcome(state: AppState, successor: Fdr, accepted: boolean, ctx: CommandContext): { state: AppState; audits: AuditDraft[] } {
  if (!successor.predecessorId) return { state, audits: [] };
  const link = Object.values(state.renewalLinks).find((l) => l.successorId === successor.id && l.status === 'SUBMITTED');
  const pred = state.fdrs[successor.predecessorId];
  if (!link || !pred) return { state, audits: [] };
  const nextLink = { ...link, status: accepted ? ('ACCEPTED' as const) : ('REJECTED' as const), closedAt: ctx.now };
  const nextPred: Fdr = accepted
    ? touch({ ...pred, renewalStatus: 'COMPLETED', adminStatus: 'SUPERSEDED' }, ctx.now)
    : touch({ ...pred, renewalStatus: 'DUE', currentSuccessorId: undefined }, ctx.now);
  const s = putFdr({ ...state, renewalLinks: { ...state.renewalLinks, [link.id]: nextLink } }, nextPred);
  return {
    state: s,
    audits: [{
      action: accepted ? 'renewal.supersede' : 'renewal.revert',
      entityType: 'FDR',
      entityId: pred.id,
      before: { renewalStatus: pred.renewalStatus, adminStatus: pred.adminStatus, currentSuccessorId: pred.currentSuccessorId },
      after: { renewalStatus: nextPred.renewalStatus, adminStatus: nextPred.adminStatus, currentSuccessorId: nextPred.currentSuccessorId },
      comment: accepted ? `Superseded by accepted ${link.type.toLowerCase()} ${successor.id}. History retained.` : `${link.type === 'RENEWAL' ? 'Renewal' : 'Replacement'} ${successor.id} was rejected; renewal is due again.`,
    }],
  };
}

export const decisionHandlers: Record<string, AnyHandler> = {
  'verification.recommendAccept': defineHandler({
    schema: z.object({ fdrId, checklist: z.record(z.boolean()), note: z.string().trim().min(5, 'Add a short recommendation note.').max(2000), overrideNote: z.string().trim().max(2000).optional() }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      const items = state.settings.categoryRequirements[f.category]?.checklist ?? [];
      const missing = items.filter((i) => !p.checklist[i]);
      if (missing.length) return fail('VALIDATION', `Complete the mandatory checklist first (${missing.length} item${missing.length === 1 ? '' : 's'} open).`, { checklist: missing.join('; ') });
      // FR-M07-7: blocking findings need an audited override justification.
      const blocking = openBlocking(runRules(state, ctx.today).filter((x) => x.entityRefs[0]?.id === f.id));
      let s = addReview(state, f.id, 'CHECKLIST', 'Checklist completed.', ctx, p.checklist);
      const audits: AuditDraft[] = [];
      if (blocking.length) {
        if (!p.overrideNote || p.overrideNote.length < 20) {
          return fail('VALIDATION', `${blocking.length} blocking finding${blocking.length === 1 ? ' is' : 's are'} open. Record an override justification (at least 20 characters) to continue.`, { overrideNote: 'Override justification required.' });
        }
        s = addReview(s, f.id, 'OVERRIDE', p.overrideNote, ctx);
        audits.push({ action: 'verification.override', entityType: 'FDR', entityId: f.id, after: { overriddenFindings: blocking.map((b) => b.key) }, comment: p.overrideNote });
      }
      s = addReview(s, f.id, 'RECOMMENDATION', `Recommend acceptance. ${p.note}`, ctx);
      const m = moveStatus(s, f, 'RECOMMENDED_ACCEPT', 'verification.recommendAccept', ctx, p.note);
      return ok({ state: m.state, audits: [...audits, m.audit] });
    },
  }),

  'verification.recommendReject': defineHandler({
    schema: z.object({ fdrId, reason: z.string().trim().min(20, 'Reason must be at least 20 characters.').max(2000) }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      const m = moveStatus(addReview(state, f.id, 'RECOMMENDATION', `Recommend rejection. ${p.reason}`, ctx), f, 'RECOMMENDED_REJECT', 'verification.recommendReject', ctx, p.reason);
      return ok({ state: m.state, audits: [m.audit] });
    },
  }),

  'verification.accept': defineHandler({
    schema: z.object({ fdrId, note: z.string().trim().max(2000).optional() }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      let s = p.note ? addReview(state, f.id, 'DECISION', `Accepted. ${p.note}`, ctx) : state;
      const m = moveStatus(s, f, 'ACCEPTED', 'verification.accept', ctx, p.note ?? 'Accepted after verification.', { lastVerifiedAt: ctx.now });
      s = m.state;
      const r = applyRenewalOutcome(s, s.fdrs[f.id], true, ctx);
      return ok({ state: r.state, audits: [m.audit, ...r.audits] });
    },
  }),

  'verification.reject': defineHandler({
    schema: z.object({ fdrId, reason: z.string().trim().min(10, 'A written reason of at least 10 characters is required (C-04).').max(2000) }),
    machine: 'verification',
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      const m = moveStatus(addReview(state, f.id, 'DECISION', `Rejected. ${p.reason}`, ctx), f, 'REJECTED', 'verification.reject', ctx, p.reason);
      const r = applyRenewalOutcome(m.state, m.state.fdrs[f.id], false, ctx);
      return ok({ state: r.state, audits: [m.audit, ...r.audits] });
    },
  }),
};
