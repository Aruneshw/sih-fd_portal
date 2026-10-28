import { formatDate } from '@/lib/dates';
import type { AppState, DemoUser, Insight } from '../types';

/** I-07 — templated plain-language paragraph from computed facts; no generative model (FR-M15-4). */
export function dailySummary(state: AppState, today: string, user: DemoUser, insights: Insight[]): string {
  const n = (id: string) => insights.find((i) => i.id === id)?.records.length ?? 0;
  const parts: string[] = [];
  const mat = n('I-01');
  parts.push(mat ? `${mat} instrument${mat === 1 ? '' : 's'} mature within ${state.settings.maturityBands[2]} days or have matured without recorded action` : 'No instruments are in the critical maturity window');
  const dup = n('I-02');
  if (dup) parts.push(`${dup} record${dup === 1 ? '' : 's'} show${dup === 1 ? 's' : ''} a potential duplicate reference`);
  const inc = n('I-03');
  if (inc) parts.push(`${inc} submission${inc === 1 ? ' is' : 's are'} incomplete`);
  const fld = n('I-04');
  if (fld) parts.push(`${fld} record${fld === 1 ? ' has' : 's have'} inconsistent field values`);
  const backlog = insights.find((i) => i.id === 'I-05');
  const inst = n('I-06');
  const lead = `Daily action summary for ${formatDate(today)} (${user.role === 'INSTITUTION_REP' ? 'your institution' : 'all institutions in scope'}): `;
  const tail = [
    backlog ? backlog.why.split('.')[0] + '.' : 'There are no open verification cases.',
    inst ? `${inst} institution${inst === 1 ? ' has' : 's have'} three or more pending actions.` : '',
    'These are potential issues for human review, not conclusions.',
  ].filter(Boolean);
  return `${lead}${parts.join('; ')}. ${tail.join(' ')}`;
}
