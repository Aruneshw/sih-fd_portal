import { DEFAULT_SETTINGS } from '@/domain/defaults';
import type { AppState, DemoUser, Fdr, Institution } from '@/domain/types';
import { emptyState } from '@/services/seed/generate';

export const TODAY = '2026-10-28';
export const NOW = '2026-10-28T10:00:00+05:30';

export const users: Record<string, DemoUser> = {
  admin: { id: 'USR-ADM-01', name: 'Ananya Rao', role: 'ADMIN', active: true, title: '' },
  officer: { id: 'USR-OFF-01', name: 'Vikram Nair', role: 'VERIFICATION_OFFICER', active: true, maxAssignedCases: 15, title: '' },
  officer2: { id: 'USR-OFF-02', name: 'Farah Siddiqui', role: 'VERIFICATION_OFFICER', active: true, maxAssignedCases: 12, title: '' },
  rep: { id: 'USR-REP-01', name: 'Rahul Menon', role: 'INSTITUTION_REP', institutionId: 'INST-0003', active: true, title: '' },
  auditor: { id: 'USR-AUD-01', name: 'Priya Iyer', role: 'AUDITOR', active: true, title: '' },
};

export function makeInstitution(id: string, over: Partial<Institution> = {}): Institution {
  return {
    id, name: `Test Institute ${id}`, type: 'ENGINEERING', state: 'Maharashtra', district: 'Pune', aicteCode: `DEMO-T-${id.slice(5)}`,
    representativeName: 'Rep', contactEmail: 'a@b.invalid', contactPhone: '+91 00000 00000', status: 'ACTIVE',
    createdAt: NOW, updatedAt: NOW, version: 1, isDemo: true, ...over,
  };
}

let counter = 0;
export function makeFdr(over: Partial<Fdr> = {}): Fdr {
  counter += 1;
  return {
    id: `FDR-T-${counter}`, applicationRef: `APP-T-${counter}`, institutionId: 'INST-0003', referenceNo: `BSB/FD/${100000 + counter}`,
    referenceNorm: `BSBFD${100000 + counter}`, bankId: 'BNK-01', branch: 'MG Road', amountPaise: 25_00_000_00, issueDate: '2026-01-01',
    maturityDate: '2027-06-01', category: 'CONTINUATION', declaredInstitutionCode: 'DEMO-T-0003', verificationStatus: 'ACCEPTED',
    priority: 'MEDIUM', renewalStatus: 'NONE', adminStatus: 'RECORDED', documentIds: [], createdAt: NOW, createdBy: 'USR-ADM-01',
    updatedAt: NOW, version: 1, isDemo: true, ...over,
  };
}

export function makeState(fdrs: Fdr[] = [], extra: Partial<AppState> = {}): AppState {
  const s = emptyState(NOW);
  return {
    ...s,
    users: Object.fromEntries(Object.values(users).map((u) => [u.id, u])),
    institutions: { 'INST-0003': makeInstitution('INST-0003'), 'INST-0004': makeInstitution('INST-0004') },
    fdrs: Object.fromEntries(fdrs.map((f) => [f.id, f])),
    settings: structuredClone(DEFAULT_SETTINGS),
    ...extra,
  };
}

export const pdfDraft = (kind: 'FDR_SCAN' | 'BANK_CONFIRMATION' | 'REQUEST_SUPPORT' | 'INFO_RESPONSE' | 'VERIFICATION_EVIDENCE' = 'FDR_SCAN') => ({
  kind, fileName: `${kind.toLowerCase()}.pdf`, mimeType: 'application/pdf' as const, sizeBytes: 1000, sha256: 'a'.repeat(64), isPlaceholder: false,
});
