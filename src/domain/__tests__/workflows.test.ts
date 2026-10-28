import { availableActions, requestMachine, transition, verificationMachine } from '@/domain/workflows';
import type { DemoUser } from '@/domain/types';
import { users } from '@/test/fixtures';

const roleFor = (action: string): DemoUser => {
  if (['verification.assign', 'verification.accept', 'verification.reject', 'verification.returnToOfficer', 'request.assign', 'request.approve', 'request.reject', 'request.recordAction', 'request.close', 'request.returnToOfficer'].includes(action)) return users.admin;
  if (['verification.respond', 'request.resubmit', 'request.respond'].includes(action)) return users.rep;
  return users.officer;
};

describe('verification machine', () => {
  it.each(verificationMachine.transitions.flatMap((t) => t.from.map((f) => [f, t.action, t.to ?? f] as const)))('%s --%s--> %s', (from, action, to) => {
    const r = transition(verificationMachine, from, action);
    expect(r.ok && r.value).toBe(to);
    const resource = { institutionId: 'INST-0003', assignedOfficerId: users.officer.id };
    expect(availableActions(verificationMachine, from, roleFor(action), resource).some((a) => a.action === action)).toBe(true);
    expect(availableActions(verificationMachine, from, users.auditor, resource).some((a) => a.action === action)).toBe(false);
  });

  it('has no direct path to REJECTED without a recommendation, and ACCEPTED is terminal', () => {
    expect(transition(verificationMachine, 'SUBMITTED', 'verification.reject').ok).toBe(false);
    expect(transition(verificationMachine, 'UNDER_REVIEW', 'verification.reject').ok).toBe(false);
    expect(transition(verificationMachine, 'RECOMMENDED_ACCEPT', 'verification.reject').ok).toBe(false);
    expect(verificationMachine.transitions.filter((t) => t.from.includes('ACCEPTED'))).toEqual([]);
    expect(verificationMachine.transitions.filter((t) => t.from.includes('REJECTED'))).toEqual([]);
  });

  it('denies the wrong role', () => {
    const resource = { institutionId: 'INST-0003', assignedOfficerId: users.officer.id };
    expect(availableActions(verificationMachine, 'RECOMMENDED_ACCEPT', users.officer, resource).map((a) => a.action)).not.toContain('verification.accept');
    expect(availableActions(verificationMachine, 'UNDER_REVIEW', users.officer2, resource)).toEqual([]);
  });
});

describe('request machine', () => {
  it.each(requestMachine.transitions.flatMap((t) => t.from.map((f) => [f, t.action, t.to] as const)))('%s --%s--> %s', (from, action, to) => {
    const r = transition(requestMachine, from, action);
    expect(r.ok && r.value).toBe(to);
    const resource = { institutionId: 'INST-0003', assignedOfficerId: users.officer.id };
    expect(availableActions(requestMachine, from, roleFor(action), resource).some((a) => a.action === action)).toBe(true);
  });

  it('cannot approve before recommendation or close before a decision', () => {
    expect(transition(requestMachine, 'UNDER_REVIEW', 'request.approve').ok).toBe(false);
    expect(transition(requestMachine, 'APPROVED', 'request.close').ok).toBe(false);
  });
});
