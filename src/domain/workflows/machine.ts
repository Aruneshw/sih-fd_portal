import { err, ok, type Result } from '@/lib/result';
import { can, type ResourceScope } from '../permissions/can';
import type { ActionId } from '../permissions/actions';
import type { DemoUser } from '../types';

/** One row of a transition table. `to: null` marks a non-transition action allowed in `from`. */
export interface Transition<S extends string> {
  from: S[];
  action: ActionId;
  to: S | null;
  label: string;
  /** Consequential actions show a ConfirmDialog. */
  confirm?: boolean;
}

export interface Machine<S extends string> {
  name: string;
  transitions: Transition<S>[];
}

export interface TransitionError {
  code: 'INVALID_TRANSITION' | 'FORBIDDEN';
  message: string;
}

/** Validate an action against the table; returns the next state (unchanged for non-transition actions). */
export function transition<S extends string>(
  machine: Machine<S>,
  current: S,
  action: ActionId,
): Result<S, TransitionError> {
  const row = machine.transitions.find((t) => t.action === action && t.from.includes(current));
  if (!row) {
    return err({ code: 'INVALID_TRANSITION', message: `"${action}" is not allowed while the ${machine.name} is in state ${current}.` });
  }
  return ok(row.to ?? current);
}

/** Actions the user may take now — UI buttons are generated from this so illegal actions never render. */
export function availableActions<S extends string>(
  machine: Machine<S>,
  current: S,
  user: DemoUser | null,
  resource: ResourceScope,
): Transition<S>[] {
  const seen = new Set<string>();
  return machine.transitions.filter((t) => {
    if (!t.from.includes(current) || seen.has(t.action)) return false;
    if (!can(user, t.action, resource).allowed) return false;
    seen.add(t.action);
    return true;
  });
}
