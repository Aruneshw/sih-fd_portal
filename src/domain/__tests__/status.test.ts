import { DEFAULT_SETTINGS } from '@/domain/defaults';
import { bandFor, deriveStatus } from '@/domain/status';
import type { Fdr, Finding } from '@/domain/types';
import { makeFdr, TODAY } from '@/test/fixtures';

const ctx = (over: Partial<Parameters<typeof deriveStatus>[1]> = {}) => ({ today: TODAY, settings: DEFAULT_SETTINGS, findings: [] as Finding[], documentKinds: ['FDR_SCAN'], ...over });
const status = (f: Partial<Fdr>) => deriveStatus(makeFdr(f), ctx()).status;

describe('deriveStatus precedence (architecture.md §6)', () => {
  it.each([
    [{ adminStatus: 'RELEASED' as const, verificationStatus: 'REJECTED' as const }, 'RELEASED'],
    [{ adminStatus: 'SUPERSEDED' as const, maturityDate: '2026-01-01' }, 'SUPERSEDED'],
    [{ verificationStatus: 'REJECTED' as const }, 'REJECTED'],
    [{ verificationStatus: 'DISCREPANCY_FLAGGED' as const }, 'DISCREPANCY_FLAGGED'],
    [{ verificationStatus: 'UNDER_REVIEW' as const, maturityDate: '2026-01-01' }, 'VERIFICATION_PENDING'],
    [{ verificationStatus: 'SUBMITTED' as const }, 'VERIFICATION_PENDING'],
    [{ renewalStatus: 'SUBMITTED' as const, maturityDate: '2026-01-01' }, 'RENEWAL_PENDING'],
    [{ maturityDate: '2026-10-27' }, 'MATURED'],
    [{ maturityDate: '2026-11-27' }, 'EXPIRING_SOON'],
    [{ maturityDate: '2026-10-28' }, 'EXPIRING_SOON'],
    [{ maturityDate: '2026-11-28' }, 'ACTIVE'],
  ])('%o → %s', (f, expected) => expect(status(f)).toBe(expected));
});

describe('flags', () => {
  it('past maturity and renewal due', () => {
    const d = deriveStatus(makeFdr({ maturityDate: '2026-10-20' }), ctx());
    expect(d.flags).toContain('PAST_MATURITY');
    expect(d.flags).toContain('RENEWAL_DUE');
  });
  it('no past-maturity flag once released or superseded', () => {
    expect(deriveStatus(makeFdr({ maturityDate: '2026-10-20', adminStatus: 'RELEASED' }), ctx()).flags).toEqual([]);
    expect(deriveStatus(makeFdr({ maturityDate: '2026-10-20', adminStatus: 'SUPERSEDED' }), ctx()).flags).toEqual([]);
  });
  it('renewal due not set once a renewal is submitted', () => {
    expect(deriveStatus(makeFdr({ maturityDate: '2026-11-01', renewalStatus: 'SUBMITTED' }), ctx()).flags).not.toContain('RENEWAL_DUE');
    expect(deriveStatus(makeFdr({ maturityDate: '2026-11-01', renewalStatus: 'DUE' }), ctx()).flags).toContain('RENEWAL_DUE');
  });
  it('missing documents by category', () => {
    expect(deriveStatus(makeFdr({ category: 'NEW_INSTITUTION' }), ctx()).flags).toContain('MISSING_DOCUMENTS');
    expect(deriveStatus(makeFdr({ category: 'NEW_INSTITUTION' }), ctx({ documentKinds: ['FDR_SCAN', 'BANK_CONFIRMATION'] })).flags).not.toContain('MISSING_DOCUMENTS');
  });
  it('possible duplicate unless dismissed; release requested', () => {
    const f: Finding = { key: 'R-03:x:y', ruleId: 'R-03', severity: 'REVIEW', title: '', explanation: '', entityRefs: [], suggestedReview: '' };
    expect(deriveStatus(makeFdr(), ctx({ findings: [f] })).flags).toContain('POSSIBLE_DUPLICATE');
    const dismissed = { ...f, resolution: { id: 'r', findingKey: f.key, state: 'DISMISSED' as const, reason: 'x', by: 'u', at: '' } };
    expect(deriveStatus(makeFdr(), ctx({ findings: [dismissed] })).flags).not.toContain('POSSIBLE_DUPLICATE');
    const req = { id: 'R', stage: 'UNDER_REVIEW' } as never;
    expect(deriveStatus(makeFdr(), ctx({ openRequest: req })).flags).toContain('RELEASE_REQUESTED');
  });
});

describe('bands', () => {
  const b: [number, number, number] = [90, 30, 7];
  it.each([[-1, 'MATURED'], [0, 'CRITICAL'], [7, 'CRITICAL'], [8, 'DUE_SOON'], [30, 'DUE_SOON'], [31, 'WATCH'], [90, 'WATCH'], [91, 'LONG']])('%i days → %s', (d, band) => {
    expect(bandFor(d as number, b)).toBe(band);
  });
});
