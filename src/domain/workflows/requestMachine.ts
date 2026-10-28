import type { RequestStage as S } from '../types';
import type { Machine } from './machine';

/** architecture.md §7.3. `request.validate` is applied by the system inside `request.submit`. */
export const requestMachine: Machine<S> = {
  name: 'request',
  transitions: [
    { from: ['RETURNED_FOR_CORRECTION'], action: 'request.resubmit', to: 'SUBMITTED', label: 'Correct and resubmit' },
    { from: ['VALIDATED'], action: 'request.assign', to: 'UNDER_REVIEW', label: 'Assign officer' },
    { from: ['UNDER_REVIEW'], action: 'request.requestInfo', to: 'INFO_REQUESTED', label: 'Request information' },
    { from: ['INFO_REQUESTED'], action: 'request.respond', to: 'UNDER_REVIEW', label: 'Respond' },
    { from: ['UNDER_REVIEW'], action: 'request.recommend', to: 'RECOMMENDED', label: 'Record recommendation', confirm: true },
    { from: ['RECOMMENDED'], action: 'request.approve', to: 'APPROVED', label: 'Approve (simulated)', confirm: true },
    { from: ['RECOMMENDED'], action: 'request.reject', to: 'REJECTED', label: 'Reject (simulated)', confirm: true },
    { from: ['RECOMMENDED'], action: 'request.returnToOfficer', to: 'UNDER_REVIEW', label: 'Return to officer' },
    { from: ['APPROVED'], action: 'request.recordAction', to: 'ACTION_RECORDED', label: 'Record final action', confirm: true },
    { from: ['REJECTED', 'ACTION_RECORDED'], action: 'request.close', to: 'CLOSED', label: 'Close request', confirm: true },
  ],
};

export const OPEN_REQUEST_STAGES: S[] = ['SUBMITTED', 'RETURNED_FOR_CORRECTION', 'VALIDATED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED', 'APPROVED', 'ACTION_RECORDED'];
/** Stages that still need someone to act (ACTION_RECORDED still needs closing). */
export const REQUEST_AWAITING: S[] = OPEN_REQUEST_STAGES;
export const REQUEST_STAGE_ORDER: S[] = ['SUBMITTED', 'VALIDATED', 'UNDER_REVIEW', 'RECOMMENDED', 'APPROVED', 'ACTION_RECORDED', 'CLOSED'];
