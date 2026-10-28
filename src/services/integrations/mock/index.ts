import { err, ok } from '@/lib/result';
import { KEYS } from '@/data/storage/StorageAdapter';
import type { AuthProvider, BankConfirmationPort, NotificationChannelPort, OcrPort } from '../ports';

const NOT_CONFIGURED = { code: 'NOT_CONFIGURED' as const, message: 'Not configured — mock adapter active.' };

export function createDemoAuthProvider(storage: { get(k: string): string | null; set(k: string, v: string): void; remove(k: string): void }, now: () => string): AuthProvider {
  return {
    status: { id: 'identity', name: 'Identity provider', configured: false, adapter: 'DemoAuthProvider — demonstration authentication, not for production use', production: 'Institutional SSO / government identity provider with MFA' },
    currentUserId() {
      try {
        const raw = storage.get(KEYS.session);
        const parsed = raw ? (JSON.parse(raw) as { userId?: unknown }) : null;
        return typeof parsed?.userId === 'string' ? parsed.userId : null;
      } catch {
        return null;
      }
    },
    signIn(userId) {
      try { storage.set(KEYS.session, JSON.stringify({ userId, startedAt: now() })); } catch { /* session stays in memory */ }
    },
    signOut() {
      storage.remove(KEYS.session);
    },
  };
}

export const NotConfiguredBankConfirmation: BankConfirmationPort = {
  status: { id: 'bank', name: 'Bank confirmation', configured: false, adapter: 'NotConfiguredBankConfirmation — always returns NOT_CONFIGURED', production: 'Authorised bank interface or approved confirmation process' },
  configured: false,
  confirm: async () => err(NOT_CONFIGURED),
};

export const ManualOcr: OcrPort = {
  status: { id: 'ocr', name: 'Document OCR', configured: false, adapter: 'ManualOcr — officers enter “values as read from document”', production: 'Approved OCR service behind the same port' },
  configured: false,
  extract: async () => err(NOT_CONFIGURED),
};

export const InAppChannel: NotificationChannelPort = {
  status: { id: 'notifications', name: 'Notification delivery', configured: false, adapter: 'InAppChannel — in-app notification centre only', production: 'Server-side scheduler with authorised email/SMS gateways' },
  send: async () => ok(undefined),
};
