import { createContext } from 'react';
import type { Runtime } from '@/services/runtime';
import type { AuthProvider } from '@/services/integrations';

export interface SessionApi {
  userId: string | null;
  signIn(userId: string): void;
  signOut(): void;
  auth: AuthProvider;
}

export const RuntimeContext = createContext<Runtime | null>(null);
export const SessionContext = createContext<SessionApi | null>(null);
