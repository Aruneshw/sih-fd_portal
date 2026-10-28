import { dailySummary, RuleBasedInsightProvider, suggestedNextStep } from '@/domain/insights';
import { generateSeed } from '@/services/seed/generate';
import { makeFdr, TODAY, users } from '@/test/fixtures';

describe('insights', () => {
  const state = generateSeed(TODAY);
  const admin = state.users['USR-ADM-01'];
  const insights = RuleBasedInsightProvider.generate(state, TODAY, admin);

  it('produces explainable, advisory insights with records', () => {
    const ids = insights.map((i) => i.id);
    for (const id of ['I-01', 'I-02', 'I-04', 'I-05', 'I-06']) expect(ids).toContain(id);
    for (const i of insights) {
      expect(i.why.length).toBeGreaterThan(10);
      expect(i.records.length).toBeGreaterThan(0);
      expect(i.reviewAction.length).toBeGreaterThan(10);
    }
    expect(insights.find((i) => i.id === 'I-01')!.records.map((r) => r.id)).toContain('FDR-DEMO-0005');
    expect(insights.find((i) => i.id === 'I-06')!.records.map((r) => r.id)).toContain('INST-0006');
  });

  it('daily summary is templated plain language without scores', () => {
    const text = dailySummary(state, TODAY, admin, insights);
    expect(text).toContain('Daily action summary');
    expect(text).not.toMatch(/%|fraud|confidence|AI decision/i);
  });

  it('rep only sees their own institution', () => {
    const rep = state.users['USR-REP-01'];
    const repInsights = RuleBasedInsightProvider.generate(state, TODAY, rep);
    for (const i of repInsights) for (const r of i.records) if (r.type === 'FDR') expect(state.fdrs[r.id].institutionId).toBe('INST-0003');
  });

  it('suggests a next step per role', () => {
    expect(suggestedNextStep(makeFdr({ verificationStatus: 'SUBMITTED' }), 'ADMIN')).toMatch(/Assign/);
    expect(suggestedNextStep(makeFdr({ verificationStatus: 'INFO_REQUESTED' }), users.rep.role)).toMatch(/Upload/);
    expect(suggestedNextStep(makeFdr(), 'INSTITUTION_REP', undefined, -3)).toMatch(/Matured — action required/);
  });
});
