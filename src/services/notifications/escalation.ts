import { addDaysIso } from '@/lib/dates';
import type { EscalationStage, Settings } from '@/domain/types';

/** FR-M10-5: initial at trigger → follow-up after N days → escalated after M days. */
export function escalationStages(triggerDate: string, today: string, settings: Settings): { stage: EscalationStage; date: string }[] {
  const { followUpAfterDays, escalateAfterDays } = settings.escalation;
  const stages: { stage: EscalationStage; date: string }[] = [
    { stage: 'INITIAL', date: triggerDate },
    { stage: 'FOLLOW_UP', date: addDaysIso(triggerDate, followUpAfterDays) },
    { stage: 'ESCALATED', date: addDaysIso(triggerDate, escalateAfterDays) },
  ];
  return stages.filter((s) => s.date <= today);
}
