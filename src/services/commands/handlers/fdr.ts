import { z } from 'zod';
import { ok } from '@/lib/result';
import { normaliseReference } from '@/lib/text';
import { DocumentDraftSchema, InstrumentDetailsSchema } from '@/domain/schemas';
import { EDITABLE_STATUSES } from '@/domain/workflows/verificationMachine';
import type { Fdr } from '@/domain/types';
import { diff } from '../../audit/appendAudit';
import { addDocuments } from '../documents';
import { checkInstrument, createFdrRecord, fdrSummary, NewInstrumentSchema } from '../fdrCreation';
import { fail, fdrTarget, putFdr, str, touch } from '../helpers';
import { defineHandler, type AnyHandler } from '../types';

export const fdrHandlers: Record<string, AnyHandler> = {
  'fdr.create': defineHandler({
    schema: NewInstrumentSchema.extend({ institutionId: z.string().min(1, 'Select an institution.') }),
    target: (state, raw) => {
      const inst = state.institutions[str(raw, 'institutionId')];
      if (!inst) return fail('VALIDATION', 'Select an institution.', { institutionId: 'Select an institution.' });
      return ok({ entityType: 'FDR', entityId: 'new', scope: { institutionId: inst.id } });
    },
    apply: (state, p, ctx) => {
      if (state.institutions[p.institutionId].status === 'INACTIVE') return fail('VALIDATION', 'This institution is inactive.');
      const check = checkInstrument(state, p.details, ctx, { acknowledgeDuplicate: p.acknowledgeDuplicate, documents: p.documents });
      if (!check.ok) return check;
      const { state: s, fdr } = createFdrRecord(state, { institutionId: p.institutionId, details: p.details, documents: p.documents, fixedId: p.fixedId, possibleDuplicates: check.value.possibleDuplicates }, ctx);
      return ok({
        state: s,
        audits: [{ action: 'fdr.create', entityType: 'FDR', entityId: fdr.id, after: fdrSummary(fdr), comment: check.value.possibleDuplicates.length ? `Possible duplicate acknowledged (${check.value.possibleDuplicates.join(', ')}).` : `Submitted with ${fdr.documentIds.length} document(s). Application ${fdr.applicationRef}.` }],
        result: { fdrId: fdr.id, applicationRef: fdr.applicationRef },
      });
    },
  }),

  'fdr.edit': defineHandler({
    schema: z.object({ fdrId: z.string(), details: InstrumentDetailsSchema, acknowledgeDuplicate: z.boolean().optional() }),
    target: fdrTarget,
    apply: (state, p, ctx) => {
      const f = state.fdrs[p.fdrId];
      if (!EDITABLE_STATUSES.includes(f.verificationStatus)) {
        return fail('INVALID_TRANSITION', 'This record can only be edited while it is Submitted or Information requested.');
      }
      const check = checkInstrument(state, p.details, ctx, { selfId: f.id, acknowledgeDuplicate: p.acknowledgeDuplicate });
      if (!check.ok) return check;
      const d = p.details;
      const next: Fdr = touch({
        ...f, referenceNo: d.referenceNo.trim(), referenceNorm: normaliseReference(d.referenceNo), bankId: d.bankId, branch: d.branch.trim(),
        amountPaise: d.amountPaise, issueDate: d.issueDate, maturityDate: d.maturityDate, category: d.category,
        declaredInstitutionCode: d.declaredInstitutionCode.trim().toUpperCase(), remarks: d.remarks || undefined,
      }, ctx.now);
      const changes = diff(f, next);
      if (!Object.keys(changes.after).length) return fail('VALIDATION', 'No changes to save.');
      return ok({ state: putFdr(state, next), audits: [{ action: 'fdr.edit', entityType: 'FDR', entityId: f.id, ...changes }] });
    },
  }),

  'document.upload': defineHandler({
    schema: z.object({ fdrId: z.string(), documents: z.array(DocumentDraftSchema).min(1, 'Choose at least one file.').max(10) }),
    target: fdrTarget,
    apply: (state, p, ctx) => {
      if (ctx.user.role === 'VERIFICATION_OFFICER' && p.documents.some((d) => d.kind !== 'VERIFICATION_EVIDENCE')) {
        return fail('FORBIDDEN', 'Officers may upload verification evidence only.');
      }
      const f = state.fdrs[p.fdrId];
      if (f.adminStatus === 'RELEASED' || f.adminStatus === 'SUPERSEDED') return fail('INVALID_TRANSITION', 'Documents cannot be added to a released or superseded record.');
      const docs = addDocuments(state, p.documents, { fdrId: f.id }, ctx);
      const next = touch({ ...f, documentIds: [...f.documentIds, ...docs.ids] }, ctx.now);
      return ok({
        state: putFdr(docs.state, next),
        audits: [{ action: 'document.upload', entityType: 'FDR', entityId: f.id, after: { documents: docs.ids }, comment: p.documents.map((d) => d.fileName).join(', ') }],
      });
    },
  }),
};
