import { ACTIONS, MATRIX, can } from '@/domain/permissions';
import { ROLES } from '@/domain/types';
import { users } from '@/test/fixtures';

describe('permission matrix', () => {
  it('matches the snapshot (architecture.md §8)', () => {
    const table = Object.fromEntries(ACTIONS.map((a) => [a, ROLES.map((r) => `${r}:${MATRIX[a][r] ?? '-'}`).join(' ')]));
    expect(table).toMatchSnapshot();
  });

  it('auditor is read-only', () => {
    const writes = ACTIONS.filter((a) => !/\.(view|export|verifyChain)$/.test(a) && a !== 'notification.markRead');
    for (const a of writes) expect(can(users.auditor, a).allowed).toBe(false);
  });

  it('rep scope is own institution', () => {
    expect(can(users.rep, 'fdr.create', { institutionId: 'INST-0003' }).allowed).toBe(true);
    expect(can(users.rep, 'fdr.create', { institutionId: 'INST-0004' })).toMatchObject({ allowed: false });
  });

  it('officer review actions require assignment', () => {
    expect(can(users.officer, 'verification.flag', { assignedOfficerId: users.officer.id }).allowed).toBe(true);
    expect(can(users.officer, 'verification.flag', { assignedOfficerId: users.officer2.id }).allowed).toBe(false);
    expect(can(users.admin, 'verification.flag', { assignedOfficerId: users.admin.id }).allowed).toBe(false);
  });

  it('inactive users are denied everything', () => {
    expect(can({ ...users.admin, active: false }, 'dashboard.view').allowed).toBe(false);
  });

  it('only admin decides (C-04)', () => {
    for (const u of [users.rep, users.officer, users.auditor]) {
      expect(can(u, 'verification.reject').allowed).toBe(false);
      expect(can(u, 'request.approve').allowed).toBe(false);
    }
    expect(can(users.admin, 'verification.reject').allowed).toBe(true);
  });
});
