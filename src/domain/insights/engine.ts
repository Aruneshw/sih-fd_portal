import { REVIEW_RULES } from './catalogue/insightRules';
import type { AppState, DemoUser, Insight } from '../types';

export interface InsightProvider {
  readonly name: string;
  generate(state: AppState, today: string, user: DemoUser): Insight[];
}

/** Default provider — rule-based, advisory, no API key (FR-M15-5). */
export const RuleBasedInsightProvider: InsightProvider = {
  name: 'Rule-based insight provider',
  generate: (state, today, user) => REVIEW_RULES.flatMap((r) => r(state, today, user)),
};

