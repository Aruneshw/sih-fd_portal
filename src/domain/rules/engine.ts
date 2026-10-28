import type { AppState, Finding, FindingResolution, Settings } from '../types';
import { R02, R03, R08, R10, R12 } from './catalogue/comparisonRules';
import { R01, R04, R05, R06, R07, R09, R11 } from './catalogue/recordRules';
import type { Rule } from './types';

export const RULES: Rule[] = [R01, R02, R03, R04, R05, R06, R07, R08, R09, R10, R11, R12];

const cache = new WeakMap<AppState, { today: string; findings: Finding[] }>();

/** Run every rule and attach stored resolutions. Memoised on state identity (architecture.md §12). */
export function runRules(state: AppState, today: string, settings: Settings = state.settings): Finding[] {
  const hit = cache.get(state);
  if (hit && hit.today === today) return hit.findings;
  const fdrs = Object.values(state.fdrs).filter((f) => f.verificationStatus !== 'REJECTED');
  const resolutions = new Map<string, FindingResolution>();
  // Latest resolution per key wins (resolution ids are sequential).
  for (const r of Object.values(state.findingResolutions).sort((a, b) => a.id.localeCompare(b.id))) resolutions.set(r.findingKey, r);
  const findings = RULES.flatMap((r) => r.evaluate({ state, today, settings, fdrs })).map((f) => ({
    ...f,
    resolution: resolutions.get(f.key),
  }));
  cache.set(state, { today, findings });
  return findings;
}

export function findingsByFdr(findings: Finding[]): Map<string, Finding[]> {
  const m = new Map<string, Finding[]>();
  for (const f of findings) {
    const id = f.entityRefs[0]?.id;
    if (!id) continue;
    m.set(id, [...(m.get(id) ?? []), f]);
  }
  return m;
}

export function isOpen(f: Finding): boolean {
  return f.resolution?.state !== 'DISMISSED';
}

export function openBlocking(findings: Finding[]): Finding[] {
  return findings.filter((f) => f.severity === 'BLOCKING' && isOpen(f));
}
