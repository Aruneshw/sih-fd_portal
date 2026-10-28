import type { Fdr, ReleaseRequest, Role } from '../types';

/** I-08 — lookup table: (verification status, renewal, request stage, role) → advisory next step. */
export function suggestedNextStep(fdr: Fdr, role: Role, openRequest?: ReleaseRequest, daysToMaturity?: number): string {
  if (fdr.adminStatus === 'RELEASED') return 'No further action. Release action recorded (simulated).';
  if (fdr.adminStatus === 'SUPERSEDED') return 'No further action. Replaced by an accepted renewal; history retained.';
  if (openRequest) {
    const byStage: Partial<Record<ReleaseRequest['stage'], Partial<Record<Role, string>>>> = {
      RETURNED_FOR_CORRECTION: { INSTITUTION_REP: 'Correct the release/refund request and resubmit it.' },
      VALIDATED: { ADMIN: 'Assign a verification officer to the release/refund request.' },
      UNDER_REVIEW: { VERIFICATION_OFFICER: 'Review the request and record a recommendation.' },
      INFO_REQUESTED: { INSTITUTION_REP: 'Respond to the information request on the release/refund request.' },
      RECOMMENDED: { ADMIN: 'Decide the request (simulated administrative decision).' },
      APPROVED: { ADMIN: 'Record the final action reference for the approved request.' },
      ACTION_RECORDED: { ADMIN: 'Close the request.' },
    };
    const s = byStage[openRequest.stage]?.[role];
    if (s) return s;
  }
  const table: Partial<Record<Fdr['verificationStatus'], Partial<Record<Role, string>>>> = {
    SUBMITTED: { ADMIN: 'Assign a verification officer.', INSTITUTION_REP: 'Await officer assignment; you may still edit the submission.' },
    ASSIGNED: { VERIFICATION_OFFICER: 'Open the case and mark it as reviewed to begin scrutiny.' },
    UNDER_REVIEW: { VERIFICATION_OFFICER: 'Work through the checklist and open findings, then record a recommendation.' },
    INFO_REQUESTED: { INSTITUTION_REP: 'Upload the requested documents and respond.', VERIFICATION_OFFICER: 'Await the institution’s response.' },
    DISCREPANCY_FLAGGED: { VERIFICATION_OFFICER: 'Request information, resolve the flag, or recommend rejection.', INSTITUTION_REP: 'Await the officer’s follow-up on the flagged discrepancy.' },
    FURTHER_SCRUTINY: { VERIFICATION_OFFICER: 'Resume the review once further scrutiny is complete.', ADMIN: 'Review the escalation and resume the review when ready.' },
    RECOMMENDED_ACCEPT: { ADMIN: 'Decide: accept or return to officer.' },
    RECOMMENDED_REJECT: { ADMIN: 'Decide: reject with a written reason, accept, or return to officer.' },
    REJECTED: { INSTITUTION_REP: 'Review the rejection reason; submit a corrected instrument if appropriate.' },
  };
  const v = table[fdr.verificationStatus]?.[role];
  if (v) return v;
  if (fdr.verificationStatus === 'ACCEPTED' && daysToMaturity !== undefined) {
    if (fdr.renewalStatus === 'SUBMITTED') return 'Renewal is under verification; no action on this record until it is decided.';
    if (daysToMaturity < 0) return role === 'INSTITUTION_REP' ? 'Matured — action required. Submit a renewal or a release/refund request.' : 'Matured — action required. Follow up with the institution.';
    if (daysToMaturity <= 30) return role === 'INSTITUTION_REP' ? 'Arrange renewal or replacement before maturity.' : 'Monitor for a renewal submission before maturity.';
  }
  return 'No action needed now.';
}
