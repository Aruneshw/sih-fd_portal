import type { Settings } from './types';

/** Placeholder thresholds — not actual AICTE rules (prd.md A-2). */
export const DEFAULT_SETTINGS: Settings = {
  maturityBands: [90, 30, 7],
  expiringSoonDays: 30,
  escalation: { followUpAfterDays: 3, escalateAfterDays: 7 },
  upload: { maxBytes: 5 * 1024 * 1024, allowedMime: ['application/pdf', 'image/jpeg', 'image/png'] },
  amountCapPaise: 5_00_00_000_00, // ₹5,00,00,000
  categoryRequirements: {
    NEW_INSTITUTION: {
      requiredDocs: ['FDR_SCAN', 'BANK_CONFIRMATION'],
      checklist: ['Reference matches FDR scan', 'Amount matches FDR scan', 'Dates match FDR scan', 'Payee is AICTE as per instrument', 'Bank confirmation letter on file'],
    },
    INTAKE_INCREASE: {
      requiredDocs: ['FDR_SCAN', 'BANK_CONFIRMATION'],
      checklist: ['Reference matches FDR scan', 'Amount matches FDR scan', 'Dates match FDR scan', 'Bank confirmation letter on file'],
    },
    NEW_PROGRAMME: {
      requiredDocs: ['FDR_SCAN'],
      checklist: ['Reference matches FDR scan', 'Amount matches FDR scan', 'Dates match FDR scan'],
    },
    CONTINUATION: {
      requiredDocs: ['FDR_SCAN'],
      checklist: ['Reference matches FDR scan', 'Amount matches FDR scan', 'Dates match FDR scan'],
    },
  },
};

export const CURRENT_SCHEMA_VERSION = 1;
export const SEED_VERSION = 'securefdr-seed-v1';
