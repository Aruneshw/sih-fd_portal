import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { ActionId } from '@/domain/permissions/actions';
import { can } from '@/domain/permissions/can';
import { useRuntime, useUser } from '../hooks';
import { ForbiddenPage } from '../ForbiddenPage';

/** Route guard; a denied route writes a DENIED audit event (FR-M02-5, T06). */
export function RequirePermission({ anyOf, children }: { anyOf: ActionId[]; children: ReactNode }) {
  const user = useUser();
  const rt = useRuntime();
  const loc = useLocation();
  const allowed = anyOf.some((a) => can(user, a).allowed);
  useEffect(() => {
    if (!allowed) rt.recordRouteDenied(user.id, anyOf[0], loc.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, loc.pathname, user.id]);
  if (!allowed) return <ForbiddenPage missing={anyOf} />;
  return <>{children}</>;
}
