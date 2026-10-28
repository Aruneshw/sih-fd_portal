import { can } from '@/domain/permissions/can';
import { isActionId, type ActionId } from '@/domain/permissions/actions';
import { transition } from '@/domain/workflows/machine';
import { verificationMachine } from '@/domain/workflows/verificationMachine';
import { requestMachine } from '@/domain/workflows/requestMachine';
import type { AppState, DemoUser, EntityType } from '@/domain/types';
import { appendAudit } from '../audit/appendAudit';
import { syncNotifications } from '../notifications/generate';
import { zodFieldErrors } from './helpers';
import { REGISTRY } from './registry';
import type { Command, CommandContext, DomainError } from './types';

export type Execution =
  | { ok: true; state: AppState; result?: unknown }
  | { ok: false; state: AppState; error: DomainError };

const machines = { verification: verificationMachine, request: requestMachine };

function failed(state: AppState, ctx: CommandContext, command: { type: string }, entity: { entityType: EntityType; entityId: string }, error: DomainError): Execution {
  // Every denied or failed attempt is itself audited (FR-M12-2, agent.md §3).
  const outcome = error.code === 'FORBIDDEN' ? 'DENIED' : 'FAILED';
  const next = appendAudit(state, { action: command.type, ...entity, outcome, comment: error.message }, ctx.user, ctx.now);
  return { ok: false, state: next, error };
}

/**
 * Pure command pipeline (architecture.md §9): resolve → authorise → validate →
 * concurrency → transition → apply → audit → derive. Persistence and emit are
 * done by the store around this function, with rollback on storage failure.
 */
export function execute(state: AppState, command: Command, ctx: CommandContext): Execution {
  const type = String(command.type);
  const handler = isActionId(type) ? REGISTRY[type as ActionId] : undefined;
  if (!handler) return failed(state, ctx, command, { entityType: 'SYSTEM', entityId: '-' }, { code: 'NOT_FOUND', message: `Unknown command "${type}".` });

  const raw = (command.payload && typeof command.payload === 'object' ? command.payload : {}) as Record<string, unknown>;
  // 1. Resolve
  const target = handler.target(state, raw);
  if (!target.ok) return failed(state, ctx, command, { entityType: 'SYSTEM', entityId: '-' }, target.error);
  const t = target.value;
  const entity = { entityType: t.entityType, entityId: t.entityId };

  // 2. Authorise (authoritative check; UI checks are convenience only)
  const decision = can(ctx.user, type as ActionId, t.scope);
  if (!decision.allowed) return failed(state, ctx, command, entity, { code: 'FORBIDDEN', message: decision.reason ?? 'Not permitted.' });

  // 3. Validate
  const parsed = handler.schema.safeParse(command.payload);
  if (!parsed.success) {
    const fieldErrors = zodFieldErrors(parsed.error.issues);
    return failed(state, ctx, command, entity, { code: 'VALIDATION', message: 'Please correct the highlighted fields.', fieldErrors });
  }

  // 4. Concurrency
  if (command.expectedVersion !== undefined && t.version !== undefined && command.expectedVersion !== t.version) {
    return failed(state, ctx, command, entity, { code: 'CONFLICT', message: 'This record changed in another tab. Reload to continue.' });
  }

  // 5. Transition
  if (handler.machine && t.machineState) {
    const tr = transition(machines[handler.machine] as typeof verificationMachine, t.machineState as never, type as ActionId);
    if (!tr.ok) return failed(state, ctx, command, entity, { code: 'INVALID_TRANSITION', message: tr.error.message });
  }

  // 6. Apply
  let applied;
  try {
    applied = handler.apply(state, parsed.data, ctx, t);
  } catch (e) {
    return failed(state, ctx, command, entity, { code: 'VALIDATION', message: `Unexpected error: ${(e as Error).message}` });
  }
  if (!applied.ok) return failed(state, ctx, command, entity, applied.error);

  // 7. Audit
  let next = applied.value.state;
  for (const draft of applied.value.audits) next = appendAudit(next, draft, ctx.user, ctx.now);

  // 8. Derive (idempotent)
  next = syncNotifications(next, ctx.today, ctx.now);
  return { ok: true, state: next, result: applied.value.result };
}

/** Audit a denied route access (FR-M02-5, T06). */
export function recordDenied(state: AppState, user: DemoUser, action: string, path: string, now: string): AppState {
  return appendAudit(state, { action, entityType: 'ROUTE', entityId: path, outcome: 'DENIED', comment: `Route access denied: missing "${action}" permission.` }, user, now);
}
