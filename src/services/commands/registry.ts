import type { ActionId } from '@/domain/permissions/actions';
import { adminHandlers } from './handlers/admin';
import { decisionHandlers } from './handlers/decisions';
import { fdrHandlers } from './handlers/fdr';
import { institutionHandlers } from './handlers/institution';
import { renewalHandlers } from './handlers/renewal';
import { requestHandlers } from './handlers/request';
import { verificationHandlers } from './handlers/verification';
import type { AnyHandler } from './types';

export const REGISTRY: Partial<Record<ActionId, AnyHandler>> = {
  ...institutionHandlers,
  ...fdrHandlers,
  ...verificationHandlers,
  ...decisionHandlers,
  ...renewalHandlers,
  ...requestHandlers,
  ...adminHandlers,
};
