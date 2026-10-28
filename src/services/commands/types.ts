import type { ZodType, ZodTypeDef } from 'zod';
import type { ActionId } from '@/domain/permissions/actions';
import type { ResourceScope } from '@/domain/permissions/can';
import type { AppState, DemoUser, EntityType } from '@/domain/types';
import type { Result } from '@/lib/result';
import type { AuditDraft } from '../audit/appendAudit';

export interface Command {
  type: ActionId;
  payload: unknown;
  expectedVersion?: number;
}

export type ErrorCode = 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'INVALID_TRANSITION' | 'NOT_FOUND' | 'STORAGE';

export interface DomainError {
  code: ErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface CommandContext {
  user: DemoUser;
  now: string;
  today: string;
  /** True only while the deterministic seed replays commands (fixed demo IDs allowed). */
  seeding: boolean;
}

export interface Target {
  entityType: EntityType;
  entityId: string;
  scope?: ResourceScope;
  version?: number;
  /** Current workflow state for the machine check. */
  machineState?: string;
}

export interface ApplyOutput {
  state: AppState;
  audits: AuditDraft[];
  result?: unknown;
}

export interface Handler<P> {
  schema: ZodType<P, ZodTypeDef, unknown>;
  machine?: 'verification' | 'request';
  /** Resolve the target from the raw payload (before validation) so scope can be authorised first. */
  target(state: AppState, raw: Record<string, unknown>): Result<Target, DomainError>;
  apply(state: AppState, payload: P, ctx: CommandContext, target: Target): Result<ApplyOutput, DomainError>;
}

export type AnyHandler = Handler<unknown>;
export const defineHandler = <P>(h: Handler<P>): AnyHandler => h as unknown as AnyHandler;
