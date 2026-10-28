import type { VerificationStatus as V } from '../types';
import type { Machine } from './machine';

const WORKING: V[] = ['UNDER_REVIEW', 'DISCREPANCY_FLAGGED', 'FURTHER_SCRUTINY'];

/** architecture.md §7.1 */
export const verificationMachine: Machine<V> = {
  name: 'verification',
  transitions: [
    { from: ['SUBMITTED'], action: 'verification.assign', to: 'ASSIGNED', label: 'Assign officer' },
    { from: ['ASSIGNED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'DISCREPANCY_FLAGGED', 'FURTHER_SCRUTINY'], action: 'verification.assign', to: null, label: 'Reassign officer' },
    { from: ['ASSIGNED'], action: 'verification.startReview', to: 'UNDER_REVIEW', label: 'Mark as reviewed' },
    { from: ['UNDER_REVIEW', 'DISCREPANCY_FLAGGED'], action: 'verification.requestInfo', to: 'INFO_REQUESTED', label: 'Request additional documents' },
    { from: ['INFO_REQUESTED'], action: 'verification.respond', to: 'UNDER_REVIEW', label: 'Respond to request' },
    { from: ['UNDER_REVIEW', 'INFO_REQUESTED'], action: 'verification.flag', to: 'DISCREPANCY_FLAGGED', label: 'Flag discrepancy' },
    { from: ['DISCREPANCY_FLAGGED'], action: 'verification.resolveFlag', to: 'UNDER_REVIEW', label: 'Resolve flag' },
    { from: ['UNDER_REVIEW', 'DISCREPANCY_FLAGGED'], action: 'verification.escalate', to: 'FURTHER_SCRUTINY', label: 'Send for further scrutiny' },
    { from: ['FURTHER_SCRUTINY'], action: 'verification.resumeReview', to: 'UNDER_REVIEW', label: 'Resume review' },
    { from: ['UNDER_REVIEW'], action: 'verification.recommendAccept', to: 'RECOMMENDED_ACCEPT', label: 'Recommend acceptance', confirm: true },
    { from: ['UNDER_REVIEW', 'DISCREPANCY_FLAGGED'], action: 'verification.recommendReject', to: 'RECOMMENDED_REJECT', label: 'Recommend rejection', confirm: true },
    { from: ['RECOMMENDED_ACCEPT', 'RECOMMENDED_REJECT'], action: 'verification.accept', to: 'ACCEPTED', label: 'Accept', confirm: true },
    { from: ['RECOMMENDED_REJECT'], action: 'verification.reject', to: 'REJECTED', label: 'Reject', confirm: true },
    { from: ['RECOMMENDED_ACCEPT', 'RECOMMENDED_REJECT'], action: 'verification.returnToOfficer', to: 'UNDER_REVIEW', label: 'Return to officer' },
    // Non-transition actions (assignee only, while the case is being worked).
    { from: WORKING, action: 'verification.recordObservation', to: null, label: 'Record observation' },
    { from: WORKING, action: 'verification.recordExtracted', to: null, label: 'Record values as read from document' },
    { from: WORKING, action: 'verification.recordVerified', to: null, label: 'Record verified details' },
    { from: WORKING, action: 'verification.saveChecklist', to: null, label: 'Save checklist' },
    { from: WORKING, action: 'finding.acknowledge', to: null, label: 'Acknowledge finding' },
    { from: WORKING, action: 'finding.dismiss', to: null, label: 'Dismiss finding' },
  ],
};

/** Statuses an FDR can still be edited in by its submitter (fdr.edit). */
export const EDITABLE_STATUSES: V[] = ['SUBMITTED', 'INFO_REQUESTED'];
export const OPEN_VERIFICATION: V[] = ['SUBMITTED', 'ASSIGNED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'DISCREPANCY_FLAGGED', 'FURTHER_SCRUTINY', 'RECOMMENDED_ACCEPT', 'RECOMMENDED_REJECT'];
