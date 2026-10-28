import { MemoryStorageAdapter, KEYS } from '@/data/storage/StorageAdapter';
import { fixedClock } from '@/lib/clock';
import { execute } from '@/services/commands/dispatcher';
import { createRuntime } from '@/services/runtime';
import { verifyChain } from '@/services/audit/hashChain';
import { generateSeed } from '@/services/seed/generate';
import { selectKpis, fdrView } from '@/domain/selectors';
import { NOW, TODAY, makeState, pdfDraft, users } from '@/test/fixtures';

const ctx = (user = users.rep) => ({ user, now: NOW, today: TODAY, seeding: false });
const details = (over: Record<string, unknown> = {}) => ({
  referenceNo: 'NTB/FD/123456', bankId: 'BNK-04', branch: 'Mall Road', amountPaise: 10_00_000_00, issueDate: '2026-10-01',
  maturityDate: '2027-10-01', category: 'CONTINUATION', declaredInstitutionCode: 'DEMO-MH-1003', ...over,
});

function runtime() {
  const ad = new MemoryStorageAdapter();
  const rt = createRuntime(ad, fixedClock(TODAY, NOW));
  rt.init();
  return { rt, ad, state: () => rt.getState()! };
}

describe('dispatcher', () => {
  it('denied command → FORBIDDEN and a DENIED audit event', () => {
    const s = makeState();
    const r = execute(s, { type: 'verification.accept', payload: { fdrId: 'x' } }, ctx(users.auditor));
    expect(r.ok).toBe(false);
    const s2 = { ...s, fdrs: { 'FDR-1': { ...generateSeed(TODAY).fdrs['FDR-DEMO-0015'], id: 'FDR-1' } } };
    const d = execute(s2, { type: 'verification.accept', payload: { fdrId: 'FDR-1' } }, ctx(users.auditor));
    expect(d).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(d.state.audit.at(-1)).toMatchObject({ outcome: 'DENIED', action: 'verification.accept', userId: users.auditor.id });
  });

  it('validation errors return field errors and write a FAILED (not SUCCESS) event', () => {
    const { rt, state } = runtime();
    const before = state().audit.length;
    const r = rt.dispatch({ type: 'fdr.create', payload: { institutionId: 'INST-0003', details: details({ maturityDate: '2026-09-01' }), documents: [pdfDraft()] } }, users.rep.id);
    expect(r).toMatchObject({ ok: false, error: { code: 'VALIDATION', fieldErrors: { maturityDate: expect.any(String) } } });
    expect(state().audit.length).toBe(before + 1);
    expect(state().audit.at(-1)!.outcome).toBe('FAILED');
  });

  it('version conflict', () => {
    const { rt, state } = runtime();
    const f = state().fdrs['FDR-DEMO-0035'];
    const r = rt.dispatch({ type: 'verification.assign', payload: { fdrId: f.id, officerId: 'USR-OFF-02' }, expectedVersion: f.version - 1 }, users.admin.id);
    expect(r).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  });

  it('rolls back in-memory state when storage fails', () => {
    const { rt, ad, state } = runtime();
    const prev = state();
    ad.failNextWrite = true;
    const r = rt.dispatch({ type: 'verification.assign', payload: { fdrId: 'FDR-DEMO-0035', officerId: 'USR-OFF-02' } }, users.admin.id);
    expect(r).toMatchObject({ ok: false, error: { code: 'STORAGE' } });
    expect(state()).toBe(prev);
  });

  it('invalid transition is rejected', () => {
    const { rt } = runtime();
    const r = rt.dispatch({ type: 'verification.recommendAccept', payload: { fdrId: 'FDR-DEMO-0035', checklist: {}, note: 'xxxxx' } }, 'USR-OFF-01');
    expect(r.ok).toBe(false);
  });
});

describe('acceptance flows at the command layer', () => {
  it('T01 create FDR → Verification Pending and KPI +1', () => {
    const { rt, state } = runtime();
    const kpi = () => selectKpis(state(), TODAY, users.rep).find((k) => k.id === 'pending')!.value;
    const before = kpi();
    const r = rt.dispatch({ type: 'fdr.create', payload: { institutionId: 'INST-0003', details: details(), documents: [pdfDraft()] } }, users.rep.id);
    expect(r.ok).toBe(true);
    const { fdrId, applicationRef } = (r as { value: { fdrId: string; applicationRef: string } }).value;
    expect(fdrId).toMatch(/^FDR-2026-\d{5}$/);
    expect(applicationRef).toMatch(/^APP-2026-\d{6}$/);
    expect(fdrView(state(), TODAY, fdrId)!.derived.status).toBe('VERIFICATION_PENDING');
    expect(kpi()).toBe(before + 1);
  });

  it('T10 blocks bad dates, missing fields, exact duplicates; nothing saved', () => {
    const { rt, state } = runtime();
    const n = Object.keys(state().fdrs).length;
    const cases = [
      details({ maturityDate: '2026-01-01' }),
      details({ branch: '' }),
      details({ referenceNo: 'KCB/FD/778812', bankId: 'BNK-03' }),
      details({ issueDate: '2026-12-01', maturityDate: '2027-12-01' }),
      details({ amountPaise: 0 }),
    ];
    for (const d of cases) {
      const r = rt.dispatch({ type: 'fdr.create', payload: { institutionId: 'INST-0003', details: d, documents: [pdfDraft()] } }, users.rep.id);
      expect(r.ok).toBe(false);
    }
    const noScan = rt.dispatch({ type: 'fdr.create', payload: { institutionId: 'INST-0003', details: details(), documents: [] } }, users.rep.id);
    expect(noScan).toMatchObject({ ok: false, error: { fieldErrors: { documents: expect.any(String) } } });
    expect(Object.keys(state().fdrs).length).toBe(n);
    expect(state().audit.filter((e) => e.action === 'fdr.create' && e.at === NOW && e.outcome === 'SUCCESS')).toEqual([]);
  });

  it('possible duplicate requires acknowledgement and creates an open finding', () => {
    const { rt, state } = runtime();
    const d = details({ referenceNo: 'KCB FD 778812', bankId: 'BNK-01' });
    const r1 = rt.dispatch({ type: 'fdr.create', payload: { institutionId: 'INST-0003', details: d, documents: [pdfDraft()] } }, users.rep.id);
    expect(r1).toMatchObject({ ok: false, error: { fieldErrors: { acknowledgeDuplicate: expect.any(String) } } });
    const r2 = rt.dispatch({ type: 'fdr.create', payload: { institutionId: 'INST-0003', details: d, documents: [pdfDraft()], acknowledgeDuplicate: true } }, users.rep.id);
    expect(r2.ok).toBe(true);
    const id = (r2 as { value: { fdrId: string } }).value.fdrId;
    expect(fdrView(state(), TODAY, id)!.derived.flags).toContain('POSSIBLE_DUPLICATE');
  });

  it('T03 officer flags discrepancy on FDR-DEMO-0014', () => {
    const { rt, state } = runtime();
    const v = fdrView(state(), TODAY, 'FDR-DEMO-0014')!;
    const finding = v.findings.find((f) => f.ruleId === 'R-08')!;
    expect(finding.explanation).toMatch(/₹5,00,000.*₹50,00,000/);
    const r = rt.dispatch({ type: 'verification.flag', payload: { fdrId: 'FDR-DEMO-0014', findingKey: finding.key, observation: 'Amount on the uploaded FDR scan does not match the submission.' } }, 'USR-OFF-01');
    expect(r.ok).toBe(true);
    expect(fdrView(state(), TODAY, 'FDR-DEMO-0014')!.derived.status).toBe('DISCREPANCY_FLAGGED');
    const e = [...state().audit].reverse().find((x) => x.action === "verification.flag")!;
    expect(e).toMatchObject({ before: { verificationStatus: 'UNDER_REVIEW' }, after: { verificationStatus: 'DISCREPANCY_FLAGGED' }, outcome: 'SUCCESS' });
    expect(e.comment).toContain('does not match');
  });

  it('T04 renewal of FDR-DEMO-0005 supersedes the predecessor on acceptance', () => {
    const { rt, state } = runtime();
    const r = rt.dispatch({ type: 'renewal.submit', payload: { predecessorId: 'FDR-DEMO-0005', type: 'RENEWAL', details: details({ referenceNo: 'NTB/FD/900001', issueDate: '2026-10-28', maturityDate: '2027-11-02' }), documents: [pdfDraft()] } }, users.rep.id);
    expect(r.ok).toBe(true);
    const succ = (r as { value: { fdrId: string } }).value.fdrId;
    expect(state().fdrs[succ].predecessorId).toBe('FDR-DEMO-0005');
    expect(fdrView(state(), TODAY, 'FDR-DEMO-0005')!.derived.status).toBe('RENEWAL_PENDING');
    const steps: [string, string, Record<string, unknown>][] = [
      ['verification.assign', 'USR-ADM-01', { officerId: 'USR-OFF-02' }],
      ['verification.startReview', 'USR-OFF-02', {}],
      ['verification.recommendAccept', 'USR-OFF-02', { checklist: Object.fromEntries(state().settings.categoryRequirements.CONTINUATION.checklist.map((c) => [c, true])), note: 'All consistent.' }],
      ['verification.accept', 'USR-ADM-01', {}],
    ];
    for (const [type, user, p] of steps) expect(rt.dispatch({ type: type as never, payload: { fdrId: succ, ...p } }, user)).toMatchObject({ ok: true });
    expect(fdrView(state(), TODAY, 'FDR-DEMO-0005')!.derived.status).toBe('SUPERSEDED');
    expect(state().fdrs['FDR-DEMO-0005'].renewalStatus).toBe('COMPLETED');
    expect(state().audit.some((e) => e.action === 'renewal.supersede' && e.entityId === 'FDR-DEMO-0005')).toBe(true);
  });

  it('successor rejection returns predecessor to renewal due (FR-M08-7)', () => {
    const { rt, state } = runtime();
    const r = rt.dispatch({ type: 'renewal.submit', payload: { predecessorId: 'FDR-DEMO-0004', details: details({ referenceNo: 'BSB/FD/900009', bankId: 'BNK-01' }), documents: [pdfDraft()] } }, users.rep.id);
    const succ = (r as { value: { fdrId: string } }).value.fdrId;
    rt.dispatch({ type: 'verification.assign', payload: { fdrId: succ, officerId: 'USR-OFF-02' } }, 'USR-ADM-01');
    rt.dispatch({ type: 'verification.startReview', payload: { fdrId: succ } }, 'USR-OFF-02');
    rt.dispatch({ type: 'verification.recommendReject', payload: { fdrId: succ, reason: 'The scan does not show the bank seal or signature.' } }, 'USR-OFF-02');
    expect(rt.dispatch({ type: 'verification.reject', payload: { fdrId: succ, reason: 'No seal or signature.' } }, 'USR-ADM-01')).toMatchObject({ ok: true });
    expect(state().fdrs['FDR-DEMO-0004']).toMatchObject({ renewalStatus: 'DUE', adminStatus: 'RECORDED' });
    expect(state().fdrs['FDR-DEMO-0004'].currentSuccessorId).toBeUndefined();
    expect(Object.values(state().renewalLinks).find((l) => l.successorId === succ)?.status).toBe('REJECTED');
  });

  it('T05 release request end to end', () => {
    const { rt, state } = runtime();
    const sub = rt.dispatch({ type: 'request.submit', payload: { fdrId: 'FDR-DEMO-0003', type: 'RELEASE', reason: 'Programme approval conditions fulfilled; requesting release.', documents: [pdfDraft('REQUEST_SUPPORT')] } }, users.rep.id);
    expect(sub).toMatchObject({ ok: true, value: { stage: 'VALIDATED' } });
    const id = (sub as { value: { requestId: string } }).value.requestId;
    const steps: [string, string, Record<string, unknown>][] = [
      ['request.assign', 'USR-ADM-01', { officerId: 'USR-OFF-01' }],
      ['request.recommend', 'USR-OFF-01', { recommendation: 'APPROVE', notes: 'Documents consistent with record.' }],
      ['request.approve', 'USR-ADM-01', { decisionRef: 'AICTE/RB/DEMO/2026/099', reason: 'Approved.' }],
      ['request.recordAction', 'USR-ADM-01', { finalActionRef: 'AICTE/RB/DEMO/2026/099-FA' }],
      ['request.close', 'USR-ADM-01', {}],
    ];
    for (const [type, user, p] of steps) expect(rt.dispatch({ type: type as never, payload: { requestId: id, ...p } }, user)).toMatchObject({ ok: true });
    expect(state().requests[id]).toMatchObject({ stage: 'CLOSED', closedAt: TODAY });
    expect(state().fdrs['FDR-DEMO-0003'].adminStatus).toBe('RELEASED');
    const acts = state().audit.filter((e) => e.entityId === id).map((e) => e.action);
    expect(acts).toEqual(['request.submit', 'request.validate', 'request.assign', 'request.recommend', 'request.approve', 'request.recordAction', 'request.close']);
  });

  it('short reason is returned for correction by system validation', () => {
    const { rt, state } = runtime();
    const r = rt.dispatch({ type: 'request.submit', payload: { fdrId: 'FDR-DEMO-0010', type: 'REFUND', reason: 'Too short', documents: [] } }, users.rep.id);
    expect(r).toMatchObject({ ok: true, value: { stage: 'RETURNED_FOR_CORRECTION' } });
    const second = rt.dispatch({ type: 'request.submit', payload: { fdrId: 'FDR-DEMO-0010', type: 'REFUND', reason: 'Another one', documents: [] } }, users.rep.id);
    expect(second.ok).toBe(false);
    expect(state().audit.at(-1)!.outcome).toBe('FAILED');
  });

  it('recommend acceptance is blocked by open blocking findings unless overridden (FR-M07-7)', () => {
    const { rt, state } = runtime();
    const checklist = Object.fromEntries(state().settings.categoryRequirements.NEW_INSTITUTION.checklist.map((c) => [c, true]));
    const r = rt.dispatch({ type: 'verification.recommendAccept', payload: { fdrId: 'FDR-DEMO-0007', checklist, note: 'Looks fine.' } }, 'USR-OFF-02');
    expect(r).toMatchObject({ ok: false, error: { fieldErrors: { overrideNote: expect.any(String) } } });
    const r2 = rt.dispatch({ type: 'verification.recommendAccept', payload: { fdrId: 'FDR-DEMO-0007', checklist, note: 'Looks fine.', overrideNote: 'Bank letter sighted in original at the regional office.' } }, 'USR-OFF-02');
    expect(r2.ok).toBe(true);
    expect(state().audit.some((e) => e.action === 'verification.override')).toBe(true);
  });

  it('T11 chain verifies, and tampering is detected at the first broken event', () => {
    const { rt, ad } = runtime();
    expect(verifyChain(rt.getState()!.audit).ok).toBe(true);
    const env = JSON.parse(ad.get(KEYS.state)!);
    env.data.audit[40].comment = 'edited in DevTools';
    const check = verifyChain(env.data.audit);
    expect(check).toMatchObject({ ok: false, firstBrokenSeq: env.data.audit[40].seq });
  });

  it('T12 reset requires RESET and starts a new chain with demo.reset', () => {
    const { rt, state } = runtime();
    rt.dispatch({ type: 'verification.assign', payload: { fdrId: 'FDR-DEMO-0035', officerId: 'USR-OFF-02' } }, 'USR-ADM-01');
    expect(rt.resetDemo('USR-ADM-01', 'reset').ok).toBe(false);
    expect(rt.resetDemo('USR-AUD-01', 'RESET')).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(rt.resetDemo('USR-ADM-01', 'RESET').ok).toBe(true);
    expect(state().audit[0]).toMatchObject({ action: 'demo.reset', userId: 'USR-ADM-01', seq: 1 });
    expect(state().fdrs['FDR-DEMO-0035'].verificationStatus).toBe('SUBMITTED');
    expect(verifyChain(state().audit).ok).toBe(true);
  });

  it('T08 persistence: changes survive a reload', () => {
    const { rt, ad } = runtime();
    rt.dispatch({ type: 'verification.assign', payload: { fdrId: 'FDR-DEMO-0035', officerId: 'USR-OFF-02' } }, 'USR-ADM-01');
    const rt2 = createRuntime(ad, fixedClock(TODAY, NOW));
    rt2.init();
    expect(rt2.getState()!.fdrs['FDR-DEMO-0035'].verificationStatus).toBe('ASSIGNED');
  });
});
