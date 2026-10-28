import { useMemo, useState, type ReactNode } from 'react';
import { createDemoAuthProvider } from '@/services/integrations';
import { useRuntime } from '../hooks';
import { SessionContext, type SessionApi } from '../runtimeContext';

/** FR-M01-2/3/4: the session survives refresh; switching users keeps data; logout keeps data. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const rt = useRuntime();
  const auth = useMemo(() => createDemoAuthProvider(rt.adapter, () => rt.clock.now()), [rt]);
  const [userId, setUserId] = useState<string | null>(() => auth.currentUserId());
  const api = useMemo<SessionApi>(() => ({
    userId,
    auth,
    signIn(id) { auth.signIn(id); setUserId(id); },
    signOut() { auth.signOut(); setUserId(null); },
  }), [auth, userId]);
  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}
