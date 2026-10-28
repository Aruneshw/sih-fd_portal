import { useMemo } from 'react';
import { fdrViewsFor, type FdrView } from '@/domain/selectors/views';
import { useAppState, useToday, useUser } from '@/app/hooks';

export function useFdrViews(): FdrView[] {
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  return useMemo(() => fdrViewsFor(state, today, user), [state, today, user]);
}

export function useUserName() {
  const state = useAppState();
  return (id?: string) => (!id ? '—' : id === 'SYSTEM' ? 'System' : state.users[id]?.name ?? id);
}
