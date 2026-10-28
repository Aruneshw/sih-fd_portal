import { useCallback, useContext, useState, useSyncExternalStore } from 'react';
import type { ActionId } from '@/domain/permissions/actions';
import { can, type Decision, type ResourceScope } from '@/domain/permissions/can';
import type { AppState, DemoUser } from '@/domain/types';
import type { Result } from '@/lib/result';
import type { Command, DomainError } from '@/services/commands/types';
import { useToast } from '@/components/ui/Toast';
import { RuntimeContext, SessionContext } from './runtimeContext';

export function useRuntime() {
  const rt = useContext(RuntimeContext);
  if (!rt) throw new Error('RuntimeContext missing');
  return rt;
}

export function useStoreStatus() {
  const rt = useRuntime();
  return useSyncExternalStore(rt.store.subscribe, rt.store.get, rt.store.get);
}

/** Current app state. Only rendered under StoreProvider once data is ready. */
export function useAppState(): AppState {
  const s = useStoreStatus();
  if (s.kind !== 'ready') throw new Error('State not ready');
  return s.state;
}

export function useToday(): string {
  return useRuntime().clock.today();
}

export function useSessionApi() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('SessionContext missing');
  return s;
}

/** The signed-in demo user (fresh from state so activation changes apply immediately). */
export function useUser(): DemoUser {
  const state = useAppState();
  const { userId } = useSessionApi();
  const u = userId ? state.users[userId] : undefined;
  if (!u) throw new Error('No session');
  return u;
}

export function useCan(action: ActionId, resource?: ResourceScope): Decision {
  return can(useUser(), action, resource);
}

/** Single write path for React (architecture.md §9). */
export function useCommand() {
  const rt = useRuntime();
  const { userId } = useSessionApi();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<DomainError | null>(null);
  const run = useCallback(
    (cmd: Command, opts: { success?: string; toastValidation?: boolean } = {}): Result<unknown, DomainError> => {
      setPending(true);
      const r = rt.dispatch(cmd, userId ?? '');
      setPending(false);
      if (!r.ok) {
        setError(r.error);
        if (r.error.code !== 'VALIDATION' || opts.toastValidation !== false) toast.error(r.error.message);
      } else {
        setError(null);
        if (opts.success) toast.success(opts.success);
      }
      return r;
    },
    [rt, userId, toast],
  );
  return { run, pending, error, fieldErrors: error?.fieldErrors ?? {}, clearError: () => setError(null) };
}
