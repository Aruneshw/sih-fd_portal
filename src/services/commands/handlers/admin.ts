import { z } from 'zod';
import { ok } from '@/lib/result';
import { SettingsSchema } from '@/domain/schemas';
import { notificationVisibleTo } from '@/domain/selectors/scope';
import type { Settings } from '@/domain/types';
import { diff } from '../../audit/appendAudit';
import { fail, str } from '../helpers';
import { defineHandler, type AnyHandler } from '../types';

export const adminHandlers: Record<string, AnyHandler> = {
  'notification.markRead': defineHandler({
    schema: z.object({ ids: z.array(z.string()).min(1).max(500) }),
    target: () => ok({ entityType: 'NOTIFICATION', entityId: 'batch' }),
    apply: (state, p, ctx) => {
      const notifications = { ...state.notifications };
      const changed: string[] = [];
      for (const id of p.ids) {
        const n = notifications[id];
        if (!n || n.readBy[ctx.user.id] || !notificationVisibleTo(n, ctx.user)) continue;
        notifications[id] = { ...n, readBy: { ...n.readBy, [ctx.user.id]: ctx.now } };
        changed.push(id);
      }
      if (!changed.length) return fail('VALIDATION', 'Nothing to mark as read.');
      return ok({ state: { ...state, notifications }, audits: [{ action: 'notification.markRead', entityType: 'NOTIFICATION', entityId: changed.length === 1 ? changed[0] : `${changed.length} notifications`, after: { read: changed } }] });
    },
  }),

  'user.manage': defineHandler({
    schema: z.object({ userId: z.string(), active: z.boolean().optional(), maxAssignedCases: z.number().int().min(1).max(100).optional() }),
    target: (state, raw) => (state.users[str(raw, 'userId')] ? ok({ entityType: 'USER', entityId: str(raw, 'userId') }) : fail('NOT_FOUND', 'User not found.')),
    apply: (state, p, ctx) => {
      const u = state.users[p.userId];
      if (p.active === false && u.id === ctx.user.id) return fail('VALIDATION', 'You cannot deactivate your own account.');
      const next = { ...u, ...(p.active !== undefined ? { active: p.active } : {}), ...(p.maxAssignedCases !== undefined && u.role === 'VERIFICATION_OFFICER' ? { maxAssignedCases: p.maxAssignedCases } : {}) };
      const changes = diff(u, next);
      if (!Object.keys(changes.after).length) return fail('VALIDATION', 'No changes to save.');
      return ok({ state: { ...state, users: { ...state.users, [u.id]: next } }, audits: [{ action: 'user.manage', entityType: 'USER', entityId: u.id, ...changes }] });
    },
  }),

  'settings.manage': defineHandler({
    schema: z.object({ settings: SettingsSchema }),
    target: () => ok({ entityType: 'SETTINGS', entityId: 'settings' }),
    apply: (state, p) => {
      const next = p.settings as Settings;
      const changes = diff(state.settings, next, []);
      if (!Object.keys(changes.after).length) return fail('VALIDATION', 'No changes to save.');
      return ok({ state: { ...state, settings: next }, audits: [{ action: 'settings.manage', entityType: 'SETTINGS', entityId: 'settings', ...changes }] });
    },
  }),
};
