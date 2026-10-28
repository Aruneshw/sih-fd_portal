import { z } from 'zod';
import { normaliseReference } from '@/lib/text';
import { ok, type Result } from '@/lib/result';
import { DocumentDraftSchema, InstrumentDetailsSchema, instrumentIssues, type DocumentDraft, type InstrumentDetails } from '@/domain/schemas';
import { findDuplicates } from '@/domain/rules/duplicate';
import type { AppState, Fdr, FindingResolution } from '@/domain/types';
import type { CommandContext, DomainError } from './types';
import { fail, nextId } from './helpers';
import { addDocuments } from './documents';

export const NewInstrumentSchema = z.object({
  details: InstrumentDetailsSchema,
  documents: z.array(DocumentDraftSchema).max(10),
  acknowledgeDuplicate: z.boolean().optional(),
  fixedId: z.string().regex(/^FDR-DEMO-\d{4}$/).optional(),
});

/** Validation shared by fdr.create, fdr.edit and renewal.submit (FR-M06-2, FR-M06-4). */
export function checkInstrument(
  state: AppState,
  details: InstrumentDetails,
  ctx: CommandContext,
  opts: { selfId?: string; acknowledgeDuplicate?: boolean; documents?: DocumentDraft[] },
): Result<{ possibleDuplicates: string[] }, DomainError> {
  const issues = instrumentIssues(details, ctx.today, state.settings.amountCapPaise);
  if (!state.banks[details.bankId]) issues.bankId = 'Select a bank from the list.';
  if (opts.documents && !opts.documents.some((d) => d.kind === 'FDR_SCAN')) issues.documents = 'Attach the FDR scan or PDF.';
  if (Object.keys(issues).length) return fail('VALIDATION', 'Please correct the highlighted fields.', issues);

  const matches = findDuplicates(
    { id: opts.selfId, referenceNorm: normaliseReference(details.referenceNo), bankId: details.bankId, amountPaise: details.amountPaise, issueDate: details.issueDate },
    Object.values(state.fdrs),
  );
  const exact = matches.find((m) => m.kind === 'EXACT');
  if (exact) {
    return fail('VALIDATION', `Exact duplicate: reference ${details.referenceNo} at this bank is already recorded as ${exact.other.id}.`, {
      referenceNo: `Already recorded as ${exact.other.id}.`,
      duplicateOf: exact.other.id,
    });
  }
  const possible = matches.filter((m) => m.kind === 'POSSIBLE').map((m) => m.other.id);
  if (possible.length && !opts.acknowledgeDuplicate) {
    return fail('VALIDATION', `Possible duplicate of ${possible.join(', ')}. Acknowledge to continue; a review finding will be created.`, {
      acknowledgeDuplicate: 'Acknowledgement required.',
      possibleDuplicates: possible.join(','),
    });
  }
  return ok({ possibleDuplicates: possible });
}

export function createFdrRecord(
  state: AppState,
  input: { institutionId: string; details: InstrumentDetails; documents: DocumentDraft[]; fixedId?: string; predecessorId?: string; possibleDuplicates: string[] },
  ctx: CommandContext,
): { state: AppState; fdr: Fdr } {
  let s = state;
  const year = ctx.today.slice(0, 4);
  let id = input.fixedId && ctx.seeding ? input.fixedId : '';
  if (!id) {
    const n = nextId(s, `FDR-${year}`, `FDR-${year}-`, 5);
    id = n.id;
    s = n.state;
  }
  const app = nextId(s, `APP-${year}`, `APP-${year}-`, 6);
  s = app.state;
  const docs = addDocuments(s, input.documents, { fdrId: id }, ctx);
  s = docs.state;
  const d = input.details;
  const fdr: Fdr = {
    id,
    applicationRef: app.id,
    institutionId: input.institutionId,
    referenceNo: d.referenceNo.trim(),
    referenceNorm: normaliseReference(d.referenceNo),
    bankId: d.bankId,
    branch: d.branch.trim(),
    amountPaise: d.amountPaise,
    issueDate: d.issueDate,
    maturityDate: d.maturityDate,
    category: d.category,
    ...(d.remarks ? { remarks: d.remarks } : {}),
    declaredInstitutionCode: d.declaredInstitutionCode.trim().toUpperCase(),
    verificationStatus: 'SUBMITTED',
    priority: input.predecessorId || d.amountPaise >= 1_00_00_000_00 ? 'HIGH' : 'MEDIUM',
    renewalStatus: 'NONE',
    adminStatus: 'RECORDED',
    ...(input.predecessorId ? { predecessorId: input.predecessorId } : {}),
    documentIds: docs.ids,
    createdAt: ctx.now,
    createdBy: ctx.user.id,
    updatedAt: ctx.now,
    version: 1,
    isDemo: true,
  };
  s = { ...s, fdrs: { ...s.fdrs, [id]: fdr } };
  // FR-M06-4: an acknowledged possible duplicate stays an open review finding.
  for (const other of input.possibleDuplicates) {
    const r = nextId(s, 'RES', 'RES-', 6);
    s = r.state;
    const res: FindingResolution = { id: r.id, findingKey: `R-03:${id}:${other}`, state: 'ACKNOWLEDGED', reason: 'Possible duplicate acknowledged by the submitter at submission.', by: ctx.user.id, at: ctx.now };
    s = { ...s, findingResolutions: { ...s.findingResolutions, [res.id]: res } };
  }
  return { state: s, fdr };
}

export function fdrSummary(f: Fdr) {
  return { referenceNo: f.referenceNo, bankId: f.bankId, amountPaise: f.amountPaise, issueDate: f.issueDate, maturityDate: f.maturityDate, verificationStatus: f.verificationStatus, institutionId: f.institutionId };
}
