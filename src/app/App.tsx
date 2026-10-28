import { useMemo } from 'react';
import { ToastProvider } from '@/components/ui';
import { LocalStorageAdapter } from '@/data/storage/LocalStorageAdapter';
import { SystemClock } from '@/lib/clock';
import { createRuntime } from '@/services/runtime';
import { SessionProvider } from './providers/SessionProvider';
import { StoreProvider } from './providers/StoreProvider';
import { AppRouter } from './router';
import { RuntimeContext } from './runtimeContext';

export function App() {
  const runtime = useMemo(() => createRuntime(new LocalStorageAdapter(), SystemClock), []);
  return (
    <RuntimeContext.Provider value={runtime}>
      <ToastProvider>
        <StoreProvider>
          <SessionProvider>
            <AppRouter />
          </SessionProvider>
        </StoreProvider>
      </ToastProvider>
    </RuntimeContext.Provider>
  );
}
