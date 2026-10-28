import { ROLE_LABEL } from '../labels';
import type { DemoUser } from '../types';
import type { ActionId } from './actions';
import { MATRIX } from './matrix';

export interface ResourceScope {
  institutionId?: string;
  assignedOfficerId?: string;
}

export interface Decision {
  allowed: boolean;
  reason?: string;
}

/** Role permission + data scope (architecture.md §8). Pure; used by nav, rendering and the dispatcher. */
export function can(user: DemoUser | null | undefined, action: ActionId, resource?: ResourceScope): Decision {
  if (!user) return { allowed: false, reason: 'No active session.' };
  if (!user.active) return { allowed: false, reason: `${user.name} is marked inactive.` };
  const scope = MATRIX[action][user.role];
  if (!scope) return { allowed: false, reason: `${ROLE_LABEL[user.role]} does not have the "${action}" permission.` };
  if (!resource) return { allowed: true };
  switch (scope) {
    case 'all':
    case 'ownActions':
      return { allowed: true };
    case 'own':
      if (resource.institutionId && resource.institutionId !== user.institutionId) {
        return { allowed: false, reason: 'This record belongs to another institution.' };
      }
      return { allowed: true };
    case 'assigned':
      if (resource.assignedOfficerId !== user.id) {
        return { allowed: false, reason: 'Only the assigned officer can take this action.' };
      }
      return { allowed: true };
  }
}

export function canAny(user: DemoUser | null | undefined, actions: ActionId[]): boolean {
  return actions.some((a) => can(user, a).allowed);
}
