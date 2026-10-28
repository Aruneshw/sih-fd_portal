import type { Role } from '../types';
import { ACTIONS, REVIEW_ACTIONS, type ActionId } from './actions';

/**
 * Scope of a granted permission:
 * - all: any record
 * - own: records of the user's institution
 * - assigned: records assigned to the user
 * - ownActions: audit events the user produced (view only)
 */
export type Scope = 'all' | 'own' | 'assigned' | 'ownActions';
export type Matrix = Record<ActionId, Partial<Record<Role, Scope>>>;

const A = 'all' as const;

const base: Partial<Matrix> = {
  'dashboard.view': { ADMIN: A, INSTITUTION_REP: 'own', VERIFICATION_OFFICER: A, AUDITOR: A },
  'institution.view': { ADMIN: A, INSTITUTION_REP: 'own', VERIFICATION_OFFICER: A, AUDITOR: A },
  'institution.create': { ADMIN: A },
  'institution.edit': { ADMIN: A },
  'fdr.view': { ADMIN: A, INSTITUTION_REP: 'own', VERIFICATION_OFFICER: A, AUDITOR: A },
  'fdr.create': { ADMIN: A, INSTITUTION_REP: 'own' },
  'fdr.edit': { ADMIN: A, INSTITUTION_REP: 'own' },
  'document.upload': { ADMIN: A, INSTITUTION_REP: 'own', VERIFICATION_OFFICER: 'assigned' },
  'verification.assign': { ADMIN: A },
  'verification.respond': { INSTITUTION_REP: 'own' },
  'verification.accept': { ADMIN: A },
  'verification.reject': { ADMIN: A },
  'verification.returnToOfficer': { ADMIN: A },
  'verification.resumeReview': { ADMIN: A, VERIFICATION_OFFICER: 'assigned' },
  'finding.acknowledge': { ADMIN: A, VERIFICATION_OFFICER: 'assigned' },
  'finding.dismiss': { ADMIN: A, VERIFICATION_OFFICER: 'assigned' },
  'renewal.submit': { ADMIN: A, INSTITUTION_REP: 'own' },
  'request.submit': { INSTITUTION_REP: 'own' },
  'request.resubmit': { INSTITUTION_REP: 'own' },
  'request.respond': { INSTITUTION_REP: 'own' },
  'request.assign': { ADMIN: A },
  'request.approve': { ADMIN: A },
  'request.reject': { ADMIN: A },
  'request.recordAction': { ADMIN: A },
  'request.close': { ADMIN: A },
  'request.returnToOfficer': { ADMIN: A },
  'request.requestInfo': { VERIFICATION_OFFICER: 'assigned' },
  'request.recommend': { VERIFICATION_OFFICER: 'assigned' },
  'notification.view': { ADMIN: A, INSTITUTION_REP: 'own', VERIFICATION_OFFICER: A, AUDITOR: A },
  'notification.markRead': { ADMIN: A, INSTITUTION_REP: 'own', VERIFICATION_OFFICER: A, AUDITOR: A },
  'report.view': { ADMIN: A, INSTITUTION_REP: 'own', VERIFICATION_OFFICER: A, AUDITOR: A },
  'report.export': { ADMIN: A, INSTITUTION_REP: 'own', VERIFICATION_OFFICER: A, AUDITOR: A },
  'audit.view': { ADMIN: A, VERIFICATION_OFFICER: 'ownActions', AUDITOR: A },
  'audit.export': { ADMIN: A, AUDITOR: A },
  'audit.verifyChain': { ADMIN: A, AUDITOR: A },
  'user.manage': { ADMIN: A },
  'settings.manage': { ADMIN: A },
  'demo.reset': { ADMIN: A },
  'insights.view': { ADMIN: A, INSTITUTION_REP: 'own', VERIFICATION_OFFICER: A, AUDITOR: A },
};

for (const a of REVIEW_ACTIONS) base[a] = { VERIFICATION_OFFICER: 'assigned' };

/** The permission matrix as data (P4). Guards, UI and the dispatcher all read this one object. */
export const MATRIX: Matrix = Object.fromEntries(ACTIONS.map((a) => [a, base[a] ?? {}])) as Matrix;
