import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppState, useSessionApi } from '../hooks';

export function RequireSession({ children }: { children: ReactNode }) {
  const { userId } = useSessionApi();
  const state = useAppState();
  const loc = useLocation();
  if (!userId || !state.users[userId]) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}
