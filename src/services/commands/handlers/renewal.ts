import { z } from 'zod';
import { ok } from '@/lib/result';
import { canRenew } from '@/domain/workflows/renewalMachine';
import type { RenewalLink } from '@/domain/types';
import { checkInstrument, createFdrRecord, fdrSummary, NewInstrumentSchema } from '../fdrCreation';
import { fail, nextId, putFdr, str, touch } from '../helpers';
import { defineHandler, type AnyHandler } from '../types';

export const renewalHandlers: Record<string, AnyHandler> = {
  'renewal.submit': defineHandler({
    schema: NewInstrumentSchema.extend({ predecessorId: z.string(), type: z.enum(['RENEWAL', 'REPLACEMENT']).default('RENEWAL') }),
    target: (state, raw) => {
      const f = state.fdrs[str(raw, 'predecessorId')];
      if (!f) return fail('NOT_FOUND', 'Predecessor instrument not found.');
      return ok({ entityType: 'FDR', entityId: f.id, version: f.version, scope: { institutionId: f.institutionId } });
    },
    apply: (state, p, ctx) => {
      const pred = state.fdrs[p.predecessorId];
      const guard = canRenew(pred);
      if (!guard.ok) return fail('INVALID_TRANSITION', guard.reason ?? 'Renewal not allowed.');
      const check = checkInstrument(state, p.details, ctx, { acknowledgeDuplicate: p.acknowledgeDuplicate, documents: p.documents });
      if (!check.ok) return check;
      const created = createFdrRecord(state, { institutionId: pred.institutionId, details: p.details, documents: p.documents, fixedId: p.fixedId, predecessorId: pred.id, possibleDuplicates: check.value.possibleDuplicates }, ctx);
      const n = nextId(created.state, 'LNK', 'LNK-', 5);
      const link: RenewalLink = { id: n.id, predecessorId: pred.id, successorId: created.fdr.id, type: p.type, status: 'SUBMITTED', createdAt: ctx.now };
      // C-07: the predecessor is never overwritten — only its renewal pointers change.
      const nextPred = touch({ ...pred, renewalStatus: 'SUBMITTED' as const, currentSuccessorId: created.fdr.id }, ctx.now);
      const s = putFdr({ ...n.state, renewalLinks: { ...n.state.renewalLinks, [link.id]: link } }, nextPred);
      return ok({
        state: s,
        audits: [
          { action: 'fdr.create', entityType: 'FDR', entityId: created.fdr.id, after: { ...fdrSummary(created.fdr), predecessorId: pred.id }, comment: `${p.type === 'RENEWAL' ? 'Renewal' : 'Replacement'} of ${pred.id}. Application ${created.fdr.applicationRef}.` },
          { action: 'renewal.submit', entityType: 'FDR', entityId: pred.id, before: { renewalStatus: pred.renewalStatus }, after: { renewalStatus: 'SUBMITTED', currentSuccessorId: created.fdr.id }, comment: `${p.type === 'RENEWAL' ? 'Renewal' : 'Replacement'} submitted as ${created.fdr.id}.` },
        ],
        result: { fdrId: created.fdr.id, applicationRef: created.fdr.applicationRef },
      });
    },
  }),
};
