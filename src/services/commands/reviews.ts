import type { AppState, ReviewEntry } from '@/domain/types';
import type { CommandContext } from './types';
import { nextId } from './helpers';

export function addReview(state: AppState, fdrId: string, kind: ReviewEntry['kind'], text: string, ctx: CommandContext, checklist?: Record<string, boolean>): AppState {
  const n = nextId(state, 'REV', 'REV-', 6);
  const entry: ReviewEntry = { id: n.id, fdrId, officerId: ctx.user.id, kind, text, ...(checklist ? { checklist } : {}), createdAt: ctx.now };
  return { ...n.state, reviews: { ...n.state.reviews, [entry.id]: entry } };
}
