import { runRules } from '@/domain/rules';
import type { AppState, Fdr } from '@/domain/types';
import { makeFdr, makeState, TODAY } from '@/test/fixtures';

const ids = (state: AppState, rule: string) => runRules(state, TODAY).filter((f) => f.ruleId === rule).map((f) => f.entityRefs[0].id);
const withDocs = (f: Fdr, kinds: string[], state: AppState): AppState => {
  const docs = Object.fromEntries(kinds.map((k, i) => [`D-${f.id}-${i}`, { id: `D-${f.id}-${i}`, fdrId: f.id, kind: k, fileName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 1, sha256: '', isPlaceholder: true, uploadedBy: 'u', uploadedAt: '' }]));
  return { ...state, documents: { ...state.documents, ...docs } as AppState['documents'], fdrs: { ...state.fdrs, [f.id]: { ...f, documentIds: Object.keys(docs) } } };
};

describe('rule engine R-01…R-12', () => {
  it('R-01 missing required field', () => {
    const bad = makeFdr({ branch: '' });
    const good = makeFdr();
    const s = makeState([bad, good]);
    expect(ids(s, 'R-01')).toEqual([bad.id]);
  });

  it('R-02 exact duplicate / R-03 possible duplicate / R-10 conflicting', () => {
    const a = makeFdr({ referenceNo: 'KCB/FD/1', referenceNorm: 'KCBFD1000', bankId: 'BNK-03' });
    const b = makeFdr({ referenceNo: 'KCB-FD-1', referenceNorm: 'KCBFD1000', bankId: 'BNK-03', amountPaise: 1 });
    const c = makeFdr({ referenceNorm: 'KCBFD1000', bankId: 'BNK-05' });
    const d = makeFdr({ referenceNorm: 'ZZZ999', bankId: 'BNK-06' });
    const s = makeState([a, b, c, d]);
    expect(ids(s, 'R-02').sort()).toEqual([a.id, b.id].sort());
    expect(ids(s, 'R-03')).toContain(c.id);
    expect(ids(s, 'R-03')).not.toContain(d.id);
    expect(ids(s, 'R-10').sort()).toEqual([a.id, b.id].sort());
  });

  it('R-03 near match (Levenshtein ≤ 1) and same bank+amount+date', () => {
    const a = makeFdr({ referenceNorm: 'BSBFD778812', bankId: 'BNK-01' });
    const b = makeFdr({ referenceNorm: 'BSBFD778813', bankId: 'BNK-01' });
    const c = makeFdr({ referenceNorm: 'BSBFD000001', bankId: 'BNK-02', amountPaise: 7, issueDate: '2026-02-02' });
    const e = makeFdr({ referenceNorm: 'BSBFD555555', bankId: 'BNK-02', amountPaise: 7, issueDate: '2026-02-02' });
    expect(ids(makeState([a, b, c, e]), 'R-03').sort()).toEqual([a.id, b.id, c.id, e.id].sort());
  });

  it('R-02 ignores rejected records', () => {
    const a = makeFdr({ referenceNorm: 'X1', bankId: 'BNK-01' });
    const b = makeFdr({ referenceNorm: 'X1', bankId: 'BNK-01', verificationStatus: 'REJECTED' });
    expect(ids(makeState([a, b]), 'R-02')).toEqual([]);
  });

  it('R-04 invalid date sequence', () => {
    const a = makeFdr({ issueDate: '2026-05-01', maturityDate: '2026-04-01' });
    const b = makeFdr({ issueDate: '2026-12-01', maturityDate: '2027-12-01' });
    const ok = makeFdr();
    expect(ids(makeState([a, b, ok]), 'R-04').sort()).toEqual([a.id, b.id].sort());
  });

  it('R-05 maturity approaching / R-06 maturity passed', () => {
    const soon = makeFdr({ maturityDate: '2026-11-02' });
    const far = makeFdr({ maturityDate: '2027-11-02' });
    const past = makeFdr({ maturityDate: '2026-10-16' });
    const released = makeFdr({ maturityDate: '2026-10-16', adminStatus: 'RELEASED' });
    const s = makeState([soon, far, past, released]);
    expect(ids(s, 'R-05')).toEqual([soon.id]);
    expect(ids(s, 'R-06')).toEqual([past.id]);
  });

  it('R-07 institution identifier mismatch', () => {
    const a = makeFdr({ declaredInstitutionCode: 'DEMO-OTHER' });
    const b = makeFdr();
    expect(ids(makeState([a, b]), 'R-07')).toEqual([a.id]);
  });

  it('R-08 document value mismatch with templated explanation', () => {
    const a = makeFdr({ amountPaise: 50_00_000_00 });
    const b = makeFdr({ amountPaise: 50_00_000_00 });
    const s = makeState([a, b], {
      extracted: {
        [a.id]: { fdrId: a.id, source: 'MANUAL_READING', values: { amountPaise: String(5_00_000_00) }, enteredBy: 'u', enteredAt: '' },
        [b.id]: { fdrId: b.id, source: 'MANUAL_READING', values: { amountPaise: String(50_00_000_00) }, enteredBy: 'u', enteredAt: '' },
      },
    });
    const f = runRules(s, TODAY).filter((x) => x.ruleId === 'R-08');
    expect(f.map((x) => x.entityRefs[0].id)).toEqual([a.id]);
    expect(f[0].explanation).toContain('(₹5,00,000) differs from the submitted amount (₹50,00,000)');
  });

  it('R-09 missing supporting document', () => {
    const a = makeFdr({ category: 'NEW_INSTITUTION' });
    const b = makeFdr({ category: 'NEW_INSTITUTION' });
    let s = makeState([a, b]);
    s = withDocs(a, ['FDR_SCAN'], s);
    s = withDocs(b, ['FDR_SCAN', 'BANK_CONFIRMATION'], s);
    expect(ids(s, 'R-09')).toEqual([a.id]);
  });

  it('R-11 amount outside range', () => {
    const a = makeFdr({ amountPaise: 9_00_00_00_000_00 });
    const b = makeFdr();
    expect(ids(makeState([a, b]), 'R-11')).toEqual([a.id]);
  });

  it('R-12 verified value differs from submitted', () => {
    const a = makeFdr({ amountPaise: 100 });
    const b = makeFdr({ amountPaise: 100 });
    const v = (fdrId: string, value: string) => ({ id: `V-${fdrId}`, fdrId, field: 'amountPaise' as const, value, method: 'BANK_CONFIRMATION_LETTER' as const, recordedBy: 'u', recordedAt: '' });
    const s = makeState([a, b], { verified: { [`V-${a.id}`]: v(a.id, '200'), [`V-${b.id}`]: v(b.id, '100') } });
    expect(ids(s, 'R-12')).toEqual([a.id]);
  });

  it('attaches stored resolutions by key and never uses forbidden wording', () => {
    const a = makeFdr({ declaredInstitutionCode: 'DEMO-OTHER' });
    const s = makeState([a], { findingResolutions: { 'RES-1': { id: 'RES-1', findingKey: `R-07:${a.id}`, state: 'DISMISSED', reason: 'ok', by: 'u', at: '' } } });
    const f = runRules(s, TODAY).find((x) => x.ruleId === 'R-07');
    expect(f?.resolution?.state).toBe('DISMISSED');
    expect(JSON.stringify(runRules(s, TODAY))).not.toMatch(/fraud|fake|invalid fdr/i);
  });
});
