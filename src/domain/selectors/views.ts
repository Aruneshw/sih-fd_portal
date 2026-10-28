import { deriveStatus, type DerivedStatus } from '../status/deriveStatus';
import { findingsByFdr, isOpen, runRules } from '../rules/engine';
import { OPEN_REQUEST_STAGES } from '../workflows/requestMachine';
import type { AppState, Bank, DemoUser, Fdr, Finding, Institution, ReleaseRequest } from '../types';
import { inScope } from './scope';

export interface FdrView {
  fdr: Fdr;
  institution?: Institution;
  bank?: Bank;
  derived: DerivedStatus;
  findings: Finding[];
  openFindings: Finding[];
  openRequest?: ReleaseRequest;
  documentKinds: string[];
}

const cache = new WeakMap<AppState, { today: string; views: Map<string, FdrView> }>();

/** All FDR view models, memoised on state identity + today. */
export function allFdrViews(state: AppState, today: string): Map<string, FdrView> {
  const hit = cache.get(state);
  if (hit && hit.today === today) return hit.views;
  const findings = findingsByFdr(runRules(state, today));
  const openReq = new Map<string, ReleaseRequest>();
  for (const r of Object.values(state.requests)) if (OPEN_REQUEST_STAGES.includes(r.stage)) openReq.set(r.fdrId, r);
  const views = new Map<string, FdrView>();
  for (const fdr of Object.values(state.fdrs)) {
    const fs = findings.get(fdr.id) ?? [];
    const documentKinds = fdr.documentIds.map((d) => state.documents[d]?.kind).filter((k): k is NonNullable<typeof k> => !!k);
    const openRequest = openReq.get(fdr.id);
    views.set(fdr.id, {
      fdr,
      institution: state.institutions[fdr.institutionId],
      bank: state.banks[fdr.bankId],
      derived: deriveStatus(fdr, { today, settings: state.settings, findings: fs, openRequest, documentKinds }),
      findings: fs,
      openFindings: fs.filter(isOpen),
      openRequest,
      documentKinds,
    });
  }
  cache.set(state, { today, views });
  return views;
}

export function fdrViewsFor(state: AppState, today: string, user: DemoUser): FdrView[] {
  return [...allFdrViews(state, today).values()].filter((v) => inScope(user, v.fdr.institutionId)).sort((a, b) => a.fdr.id.localeCompare(b.fdr.id));
}

export function fdrView(state: AppState, today: string, id: string): FdrView | undefined {
  return allFdrViews(state, today).get(id);
}
