import type { Result } from '@/lib/result';
import type { DemoUser, Notification, VerifiableField } from '@/domain/types';

/** Integration ports (architecture.md §15). Production swaps adapters, not features (P5). */
export interface PortStatus {
  id: string;
  name: string;
  configured: boolean;
  adapter: string;
  production: string;
}

export interface AuthProvider {
  readonly status: PortStatus;
  currentUserId(): string | null;
  signIn(userId: string): void;
  signOut(): void;
}

export interface BankConfirmation {
  matched: boolean;
  confirmedFields: Partial<Record<VerifiableField, string>>;
}

export interface BankConfirmationPort {
  readonly status: PortStatus;
  readonly configured: boolean;
  confirm(req: { bankId: string; referenceNo: string; amountPaise: number; issueDate: string; maturityDate: string }): Promise<Result<BankConfirmation, { code: 'NOT_CONFIGURED'; message: string }>>;
}

export interface OcrPort {
  readonly status: PortStatus;
  readonly configured: boolean;
  extract(blob: Blob): Promise<Result<Partial<Record<VerifiableField, string>>, { code: 'NOT_CONFIGURED'; message: string }>>;
}

export interface NotificationChannelPort {
  readonly status: PortStatus;
  send(n: Notification, to: DemoUser): Promise<Result<void, { code: string; message: string }>>;
}
