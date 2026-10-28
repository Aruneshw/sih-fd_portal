import { RuleBasedInsightProvider } from '@/domain/insights/engine';
import { InAppChannel, ManualOcr, NotConfiguredBankConfirmation } from './mock';
import type { PortStatus } from './ports';

/** All adapters are wired here, in one place (architecture.md §15). */
export const integrations = {
  bank: NotConfiguredBankConfirmation,
  ocr: ManualOcr,
  notifications: InAppChannel,
  insights: RuleBasedInsightProvider,
};

export const INSIGHTS_PORT: PortStatus = { id: 'insights', name: 'Insight provider', configured: false, adapter: 'RuleBasedInsightProvider — rule-based, advisory, no API key', production: 'Optional authorised AI service returning the same advisory shape' };

export { createDemoAuthProvider } from './mock';
export type * from './ports';
