import type { AppState, AuditEvent, DemoUser, Fdr, Institution, Notification, ReleaseRequest } from '../types';

/** Data scoping applied in every list selector (architecture.md §8). */
export function isInstitutionScoped(user: DemoUser): boolean {
  return user.role === 'INSTITUTION_REP';
}

export function inScope(user: DemoUser, institutionId: string | undefined): boolean {
  return !isInstitutionScoped(user) || (!!institutionId && institutionId === user.institutionId);
}

export function scopedInstitutions(state: AppState, user: DemoUser): Institution[] {
  return Object.values(state.institutions).filter((i) => inScope(user, i.id)).sort((a, b) => a.id.localeCompare(b.id));
}

export function scopedFdrs(state: AppState, user: DemoUser): Fdr[] {
  return Object.values(state.fdrs).filter((f) => inScope(user, f.institutionId));
}

export function scopedRequests(state: AppState, user: DemoUser): ReleaseRequest[] {
  return Object.values(state.requests).filter((r) => inScope(user, r.institutionId)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function notificationVisibleTo(n: Notification, user: DemoUser): boolean {
  if (user.role === 'AUDITOR') return true; // read-only oversight of all reminders
  if (n.audience.userId === user.id) return true;
  if (!n.audience.roles.includes(user.role)) return false;
  if (user.role === 'INSTITUTION_REP') return !!n.audience.institutionId && n.audience.institutionId === user.institutionId;
  return true;
}

export function scopedNotifications(state: AppState, user: DemoUser): Notification[] {
  return Object.values(state.notifications)
    .filter((n) => notificationVisibleTo(n, user))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

export function unreadCount(state: AppState, user: DemoUser): number {
  return scopedNotifications(state, user).filter((n) => !n.readBy[user.id] && !n.resolvedAt).length;
}

/** Officers see only their own actions in the audit log (architecture.md §8). */
export function scopedAudit(state: AppState, user: DemoUser): AuditEvent[] {
  if (user.role === 'VERIFICATION_OFFICER') return state.audit.filter((e) => e.userId === user.id);
  if (user.role === 'INSTITUTION_REP') return [];
  return state.audit;
}
