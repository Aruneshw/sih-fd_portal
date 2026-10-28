import type { AppState, Fdr, Finding, Settings, Severity } from '../types';

export interface RuleContext {
  state: AppState;
  today: string;
  settings: Settings;
  /** FDRs the rules consider (rejected instruments are excluded). */
  fdrs: Fdr[];
}

export interface Rule {
  id: string;
  title: string;
  severity: Severity;
  appliesTo: 'FDR' | 'REQUEST';
  evaluate(ctx: RuleContext): Finding[];
}
