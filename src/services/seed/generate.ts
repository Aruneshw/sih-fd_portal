import { addDaysIso, toIstTimestamp } from '@/lib/dates';
import { sha256Sync } from '@/lib/hash';
import { createRng } from '@/data/seed/prng';
import {
  BRANCHES, DEMO_BANKS, DEMO_FDRS, DEMO_INSTITUTIONS, DEMO_REQUESTS, DEMO_USERS, OFFICER_ID, RENEWAL_SEED, demoFdrId, demoReqId,
  type FdrSeed, type RequestSeed,
} from '@/data/seed/catalogue';
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, SEED_VERSION } from '@/domain/defaults';
import type { DocumentDraft } from '@/domain/schemas';
import type { AppState, DemoUser, DocumentKind } from '@/domain/types';
import { appendAudit } from '../audit/appendAudit';
import { execute } from '../commands/dispatcher';
import type { Command } from '../commands/types';
import { syncNotifications } from '../notifications/generate';

const SEED = 'AICTE-SecureFDR-SIH-26265';
const ADMIN = 'USR-ADM-01';

interface Op { t: number; user: string; cmd: Command }

export function emptyState(seededAt: string): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    institutions: {}, banks: Object.fromEntries(DEMO_BANKS.map((b) => [b.id, b])), fdrs: {}, documents: {}, extracted: {}, verified: {},
    reviews: {}, findingResolutions: {}, renewalLinks: {}, requests: {}, notifications: {}, audit: [],
    users: Object.fromEntries(DEMO_USERS.map((u) => [u.id, { ...u }])),
    settings: structuredClone(DEFAULT_SETTINGS),
    counters: {},
    meta: { seededAt, seedVersion: SEED_VERSION },
  };
}

const placeholder = (fileName: string, kind: DocumentKind, size: number): DocumentDraft => ({
  kind, fileName, mimeType: 'application/pdf', sizeBytes: size, sha256: sha256Sync(`placeholder:${fileName}`), isPlaceholder: true,
});

function repFor(inst: string): string {
  return DEMO_USERS.find((u) => u.role === 'INSTITUTION_REP' && u.institutionId === inst)?.id ?? ADMIN;
}


/** Verification steps up to the target state, starting at time `t`. */
function workflowOps(id: string, s: FdrSeed, start: number, add: (t: number, user: string, type: Command['type'], payload: unknown) => void, checklist: string[], evidenceDoc?: () => string) {
  const off = s.officer ? OFFICER_ID[s.officer] : undefined;
  if (s.final === 'SUBMITTED' || !off) return;
  let t = start;
  const step = () => (t += 1.2);
  add(step(), ADMIN, 'verification.assign', { fdrId: id, officerId: off });
  if (s.final === 'ASSIGNED') return;
  add(step(), off, 'verification.startReview', { fdrId: id });
  const all = Object.fromEntries(checklist.map((c) => [c, true]));
  switch (s.final) {
    case 'UNDER_REVIEW':
      if (s.n === 14) add(step(), off, 'verification.recordExtracted', { fdrId: id, values: { amountPaise: String(5_00_000 * 100), referenceNo: '' } });
      if (s.n === 7) add(step(), off, 'verification.recordObservation', { fdrId: id, text: 'Bank confirmation letter not yet on file; FDR scan reviewed.' });
      return;
    case 'INFO_REQUESTED':
      add(step(), off, 'verification.requestInfo', { fdrId: id, message: 'Please upload a clearer scan of the FDR showing the maturity date.', documentsRequested: ['FDR_SCAN'] });
      return;
    case 'DISCREPANCY_FLAGGED':
      add(step(), off, 'verification.recordVerified', { fdrId: id, field: 'amountPaise', value: String(50 * 1_00_000 * 100), method: 'BANK_CONFIRMATION_LETTER', evidenceDocumentId: evidenceDoc?.(), note: 'Amount as stated on the bank confirmation letter on file.' });
      add(step(), off, 'verification.flag', { fdrId: id, findingKey: `R-12:${id}:amountPaise`, observation: 'The bank confirmation letter on file states ₹50,00,000 while the submission states ₹55,00,000. Clarification required from the institution.' });
      return;
    case 'FURTHER_SCRUTINY':
      add(step(), off, 'verification.escalate', { fdrId: id, note: 'New institution category with high value; referring for further scrutiny by the supervisor.' });
      return;
    case 'RECOMMENDED_ACCEPT':
      add(step(), off, 'verification.recommendAccept', { fdrId: id, checklist: all, note: 'All checklist items confirmed against the documents on file.' });
      return;
    case 'RECOMMENDED_REJECT':
      add(step(), off, 'verification.recommendReject', { fdrId: id, reason: 'The institution code written on the instrument does not match the institution record; the instrument appears to be issued in favour of a different code.' });
      return;
    case 'ACCEPTED':
      add(step(), off, 'verification.recommendAccept', { fdrId: id, checklist: all, note: 'Checklist complete; documents consistent with submission.' });
      add(step(), ADMIN, 'verification.accept', { fdrId: id, note: 'Accepted after verification.' });
      return;
    case 'REJECTED':
      add(step(), off, 'verification.recommendReject', { fdrId: id, reason: 'The FDR scan is illegible and the institution did not supply a replacement within the response window.' });
      add(step(), ADMIN, 'verification.reject', { fdrId: id, reason: 'Rejected on the officer recommendation: document illegible, no replacement supplied.' });
      return;
    default:
      return;
  }
}

function requestOps(r: RequestSeed, add: (t: number, user: string, type: Command['type'], payload: unknown) => void) {
  const fdrId = demoFdrId(r.fdr);
  const inst = DEMO_FDRS.find((f) => f.n === r.fdr)!.inst;
  const rep = repFor(inst);
  const id = demoReqId(r.n);
  let t = r.start;
  const step = () => (t += 1.5);
  const off = r.officer ? OFFICER_ID[r.officer] : '';
  add(t, rep, 'request.submit', {
    fixedId: id, fdrId, type: r.type,
    reason: r.shortReason ? 'Instrument matured.' : r.type === 'RELEASE'
      ? 'Approval conditions for the programme are fulfilled; requesting release of the security deposit FDR as per the approval letter.'
      : 'Programme was discontinued before admissions; requesting refund of the security deposit instrument held.',
    documents: [placeholder(`${id}-supporting-letter.pdf`, 'REQUEST_SUPPORT', 120_000 + r.n * 3_000)],
  });
  for (const s of r.steps) {
    switch (s) {
      case 'assign': add(step(), ADMIN, 'request.assign', { requestId: id, officerId: off }); break;
      case 'requestInfo': add(step(), off, 'request.requestInfo', { requestId: id, message: 'Please upload the original approval letter referenced in the request.' }); break;
      case 'recommendApprove': add(step(), off, 'request.recommend', { requestId: id, recommendation: 'APPROVE', notes: 'Supporting documents are consistent with the instrument record and approval history.' }); break;
      case 'recommendReject': add(step(), off, 'request.recommend', { requestId: id, recommendation: 'REJECT', notes: 'The approval conditions referenced are not yet fulfilled as per the record.' }); break;
      case 'approve': add(step(), ADMIN, 'request.approve', { requestId: id, decisionRef: `AICTE/RB/DEMO/2026/${String(10 + r.n).padStart(3, '0')}`, reason: 'Approved on the officer recommendation.' }); break;
      case 'reject': add(step(), ADMIN, 'request.reject', { requestId: id, decisionRef: `AICTE/RB/DEMO/2026/${String(10 + r.n).padStart(3, '0')}`, reason: 'Approval conditions not yet fulfilled; the instrument continues to be held.' }); break;
      case 'recordAction': add(step(), ADMIN, 'request.recordAction', { requestId: id, finalActionRef: `AICTE/RB/DEMO/2026/${String(10 + r.n).padStart(3, '0')}-FA` }); break;
      case 'close': add(step(), ADMIN, 'request.close', { requestId: id }); break;
    }
  }
}

function seedOps(today: string): Op[] {
  const rng = createRng(SEED);
  const ops: Op[] = [];
  const add = (t: number, user: string, type: Command['type'], payload: unknown) => ops.push({ t: Math.min(t, -0.05), user, cmd: { type, payload } });

  DEMO_INSTITUTIONS.forEach((i, idx) => {
    const n = Number(i.id.slice(5));
    add(-90 + idx * 0.05, ADMIN, 'institution.create', {
      fixedId: i.id, representativeUserId: i.repUserId,
      form: {
        name: i.name, type: i.type, state: i.state, district: i.district, aicteCode: i.code, representativeName: i.rep,
        contactEmail: `office@inst${String(n).padStart(4, '0')}.demo.invalid`, contactPhone: `+91 00000 ${String(10000 + n).slice(-5)}`, status: i.status ?? 'ACTIVE',
      },
    });
  });

  const details = (s: Pick<FdrSeed, 'inst' | 'bank' | 'lakhs' | 'issue' | 'maturity' | 'category' | 'ref' | 'code'>) => {
    const bank = DEMO_BANKS.find((b) => b.id === s.bank)!;
    const inst = DEMO_INSTITUTIONS.find((i) => i.id === s.inst)!;
    return {
      referenceNo: s.ref ?? `${bank.shortCode}/FD/${rng.int(100000, 999999)}`, bankId: bank.id, branch: rng.pick(BRANCHES[bank.id]),
      amountPaise: s.lakhs * 1_00_000 * 100, issueDate: addDaysIso(today, s.issue), maturityDate: addDaysIso(today, s.maturity),
      category: s.category, declaredInstitutionCode: s.code ?? inst.code,
    };
  };
  const docs = (id: string, s: Pick<FdrSeed, 'category' | 'bankConf'>) => {
    const needsConf = s.category === 'NEW_INSTITUTION' || s.category === 'INTAKE_INCREASE';
    const out = [placeholder(`${id}-fdr-scan.pdf`, 'FDR_SCAN', rng.int(140_000, 900_000))];
    if (s.bankConf ?? needsConf) out.push(placeholder(`${id}-bank-confirmation.pdf`, 'BANK_CONFIRMATION', rng.int(80_000, 300_000)));
    return out;
  };

  for (const s of DEMO_FDRS) {
    const id = demoFdrId(s.n);
    const created = Math.min(Math.max(s.issue + 1, -84 + s.n * 0.15), -1 - (s.final === 'SUBMITTED' ? 0 : 6));
    const createdAt = s.n === 35 ? -1.5 : s.n === 21 ? -4 : created;
    const user = repFor(s.inst);
    add(createdAt, user, 'fdr.create', { fixedId: id, institutionId: s.inst, details: details(s), documents: docs(id, s), acknowledgeDuplicate: s.n === 19 ? true : undefined });
    const checklist = DEFAULT_SETTINGS.categoryRequirements[s.category].checklist;
    workflowOps(id, s, createdAt, add, checklist, () => `__EVIDENCE__:${id}`);
  }

  // S-04: renewal chain FDR-DEMO-0031 → FDR-DEMO-0032.
  const pred = DEMO_FDRS.find((f) => f.n === RENEWAL_SEED.predecessor)!;
  const succId = demoFdrId(RENEWAL_SEED.successor);
  const succ: FdrSeed = { ...pred, n: RENEWAL_SEED.successor, issue: RENEWAL_SEED.issue, maturity: RENEWAL_SEED.maturity, final: 'ACCEPTED', officer: RENEWAL_SEED.officer };
  add(-14, repFor(pred.inst), 'renewal.submit', { fixedId: succId, predecessorId: demoFdrId(pred.n), type: 'RENEWAL', details: details(succ), documents: docs(succId, succ) });
  workflowOps(succId, succ, -14, add, DEFAULT_SETTINGS.categoryRequirements[succ.category].checklist);

  for (const r of DEMO_REQUESTS) requestOps(r, add);

  // Stable chronological order; per-entity steps were scheduled with increasing times.
  return ops.map((o, i) => ({ o, i })).sort((a, b) => a.o.t - b.o.t || a.i - b.i).map((x) => x.o);
}

const DAY = 86_400_000;

/** Deterministic seed: same `today` ⇒ identical state (NFR-04). Built by replaying commands. */
export function generateSeed(today: string, opts: { resetBy?: DemoUser; resetAt?: string } = {}): AppState {
  const base = Date.parse(`${today}T09:30:00+05:30`);
  const ts = (t: number) => toIstTimestamp(new Date(base + Math.round(t * DAY / 60_000) * 60_000));
  const firstAt = ts(-91);
  let state = emptyState(opts.resetAt ?? firstAt);
  // Reset starts a new chain whose first event is demo.reset (architecture.md §11).
  state = appendAudit(
    state,
    opts.resetBy
      ? { action: 'demo.reset', entityType: 'SYSTEM', entityId: 'demo-data', comment: 'Demo data reset; new audit chain started. Seed history follows.' }
      : { action: 'demo.seed', entityType: 'SYSTEM', entityId: 'demo-data', comment: 'Demonstration data generated.', system: true },
    opts.resetBy ?? null,
    firstAt,
  );

  for (const op of seedOps(today)) {
    const payload = resolveEvidence(state, op.cmd.payload);
    const user = state.users[op.user];
    const res = execute(state, { ...op.cmd, payload }, { user, now: ts(op.t), today, seeding: true });
    if (!res.ok) throw new Error(`Seed command ${op.cmd.type} failed: ${res.error.message} ${JSON.stringify(res.error.fieldErrors ?? {})}`);
    state = res.state;
  }
  return syncNotifications(state, today, ts(-0.05));
}

/** Replace `__EVIDENCE__:<fdrId>` with the FDR's bank confirmation document id. */
function resolveEvidence(state: AppState, payload: unknown): unknown {
  const p = payload as Record<string, unknown>;
  if (typeof p?.evidenceDocumentId === 'string' && p.evidenceDocumentId.startsWith('__EVIDENCE__:')) {
    const fdrId = p.evidenceDocumentId.split(':')[1];
    const doc = state.fdrs[fdrId]?.documentIds.map((d) => state.documents[d]).find((d) => d?.kind === 'BANK_CONFIRMATION');
    return { ...p, evidenceDocumentId: doc?.id };
  }
  return payload;
}
