import { z } from 'zod';
import { ok } from '@/lib/result';
import { InstitutionFormSchema } from '@/domain/schemas';
import type { Institution } from '@/domain/types';
import { diff } from '../../audit/appendAudit';
import { fail, nextId, str, touch } from '../helpers';
import { defineHandler, type AnyHandler } from '../types';

export const institutionHandlers: Record<string, AnyHandler> = {
  'institution.create': defineHandler({
    schema: z.object({ form: InstitutionFormSchema, fixedId: z.string().regex(/^INST-\d{4}$/).optional(), representativeUserId: z.string().optional() }),
    target: () => ok({ entityType: 'INSTITUTION', entityId: 'new' }),
    apply: (state, p, ctx) => {
      if (Object.values(state.institutions).some((i) => i.aicteCode === p.form.aicteCode)) {
        return fail('VALIDATION', 'Another institution already uses this code.', { aicteCode: 'Code already in use.' });
      }
      let s = state;
      let id = p.fixedId && ctx.seeding ? p.fixedId : '';
      if (!id) {
        const n = nextId(s, 'INST', 'INST-', 4);
        id = n.id;
        s = n.state;
      } else {
        s = { ...s, counters: { ...s.counters, INST: Math.max(s.counters.INST ?? 0, Number(id.slice(5))) } };
      }
      const inst: Institution = { ...p.form, id, ...(p.representativeUserId ? { representativeUserId: p.representativeUserId } : {}), createdAt: ctx.now, updatedAt: ctx.now, version: 1, isDemo: true };
      return ok({ state: { ...s, institutions: { ...s.institutions, [id]: inst } }, audits: [{ action: 'institution.create', entityType: 'INSTITUTION', entityId: id, after: p.form }], result: { institutionId: id } });
    },
  }),

  'institution.edit': defineHandler({
    schema: z.object({ institutionId: z.string(), form: InstitutionFormSchema }),
    target: (state, raw) => {
      const i = state.institutions[str(raw, 'institutionId')];
      return i ? ok({ entityType: 'INSTITUTION', entityId: i.id, version: i.version, scope: { institutionId: i.id } }) : fail('NOT_FOUND', 'Institution not found.');
    },
    apply: (state, p, ctx) => {
      const cur = state.institutions[p.institutionId];
      if (Object.values(state.institutions).some((i) => i.id !== cur.id && i.aicteCode === p.form.aicteCode)) {
        return fail('VALIDATION', 'Another institution already uses this code.', { aicteCode: 'Code already in use.' });
      }
      const next = touch({ ...cur, ...p.form }, ctx.now);
      const changes = diff(cur, next);
      if (!Object.keys(changes.after).length) return fail('VALIDATION', 'No changes to save.');
      return ok({ state: { ...state, institutions: { ...state.institutions, [cur.id]: next } }, audits: [{ action: 'institution.edit', entityType: 'INSTITUTION', entityId: cur.id, ...changes }] });
    },
  }),
};
