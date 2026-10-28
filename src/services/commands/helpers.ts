import { err, ok, type Result } from '@/lib/result';
import type { AppState, Fdr, ReleaseRequest } from '@/domain/types';
import type { DomainError, Target } from './types';

export const fail = (code: DomainError['code'], message: string, fieldErrors?: Record<string, string>) => err<DomainError>({ code, message, fieldErrors });

export function touch<T extends { version: number; updatedAt?: string }>(entity: T, now: string): T {
  return { ...entity, version: entity.version + 1, ...('updatedAt' in entity ? { updatedAt: now } : {}) };
}

export const str = (raw: Record<string, unknown>, key: string): string => (typeof raw[key] === 'string' ? (raw[key] as string) : '');

export function fdrTarget(state: AppState, raw: Record<string, unknown>): Result<Target, DomainError> {
  const id = str(raw, 'fdrId');
  const f = state.fdrs[id];
  if (!f) return fail('NOT_FOUND', `FDR ${id || '(none)'} was not found.`);
  return ok({ entityType: 'FDR', entityId: f.id, version: f.version, machineState: f.verificationStatus, scope: { institutionId: f.institutionId, assignedOfficerId: f.assignedOfficerId } });
}

export function requestTarget(state: AppState, raw: Record<string, unknown>): Result<Target, DomainError> {
  const id = str(raw, 'requestId');
  const r = state.requests[id];
  if (!r) return fail('NOT_FOUND', `Request ${id || '(none)'} was not found.`);
  return ok({ entityType: 'REQUEST', entityId: r.id, version: r.version, machineState: r.stage, scope: { institutionId: r.institutionId, assignedOfficerId: r.assignedOfficerId } });
}

export function putFdr(state: AppState, fdr: Fdr): AppState {
  return { ...state, fdrs: { ...state.fdrs, [fdr.id]: fdr } };
}

export function putRequest(state: AppState, r: ReleaseRequest): AppState {
  return { ...state, requests: { ...state.requests, [r.id]: r } };
}

export function nextId(state: AppState, key: string, prefix: string, width: number): { id: string; state: AppState } {
  const n = (state.counters[key] ?? 0) + 1;
  return { id: `${prefix}${String(n).padStart(width, '0')}`, state: { ...state, counters: { ...state.counters, [key]: n } } };
}

/** Flatten zod issues to a field → message map for inline errors. */
export function zodFieldErrors(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path.join('.') || '_';
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
