/** Every action the permission matrix knows about (architecture.md §8). */
export const ACTIONS = [
  'dashboard.view',
  'institution.view', 'institution.create', 'institution.edit',
  'fdr.view', 'fdr.create', 'fdr.edit',
  'document.upload',
  'verification.assign',
  'verification.startReview', 'verification.recordObservation', 'verification.flag', 'verification.resolveFlag',
  'verification.requestInfo', 'verification.recordExtracted', 'verification.recordVerified', 'verification.escalate',
  'verification.resumeReview', 'verification.recommendAccept', 'verification.recommendReject', 'verification.saveChecklist',
  'verification.respond',
  'verification.accept', 'verification.reject', 'verification.returnToOfficer',
  'finding.acknowledge', 'finding.dismiss',
  'renewal.submit',
  'request.submit', 'request.resubmit', 'request.respond',
  'request.assign', 'request.approve', 'request.reject', 'request.recordAction', 'request.close', 'request.returnToOfficer',
  'request.requestInfo', 'request.recommend',
  'notification.view', 'notification.markRead',
  'report.view', 'report.export',
  'audit.view', 'audit.export', 'audit.verifyChain',
  'user.manage', 'settings.manage', 'demo.reset',
  'insights.view',
] as const;

export type ActionId = (typeof ACTIONS)[number];

export function isActionId(x: string): x is ActionId {
  return (ACTIONS as readonly string[]).includes(x);
}

/** Verification review actions (assigned officer only) — `verification.review*` in the matrix. */
export const REVIEW_ACTIONS: ActionId[] = [
  'verification.startReview', 'verification.recordObservation', 'verification.flag', 'verification.resolveFlag',
  'verification.requestInfo', 'verification.recordExtracted', 'verification.recordVerified', 'verification.escalate',
  'verification.recommendAccept', 'verification.recommendReject', 'verification.saveChecklist',
];
