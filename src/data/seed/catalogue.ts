import type { Bank, DemoUser, InstitutionType, InstrumentCategory, VerificationStatus } from '@/domain/types';

/**
 * Fixed demonstration catalogue (prd.md §7). Every name, code, bank, phone
 * number and amount here is fictional (C-08).
 */
export const DEMO_USERS: DemoUser[] = [
  { id: 'USR-ADM-01', name: 'Ananya Rao', role: 'ADMIN', active: true, title: 'Competent authority (prototype)' },
  { id: 'USR-OFF-01', name: 'Vikram Nair', role: 'VERIFICATION_OFFICER', active: true, maxAssignedCases: 15, supervisorId: 'USR-ADM-01', title: 'Senior verification officer' },
  { id: 'USR-OFF-02', name: 'Farah Siddiqui', role: 'VERIFICATION_OFFICER', active: true, maxAssignedCases: 12, supervisorId: 'USR-ADM-01', title: 'Verification officer' },
  { id: 'USR-REP-01', name: 'Rahul Menon', role: 'INSTITUTION_REP', institutionId: 'INST-0003', active: true, supervisorId: 'USR-ADM-01', title: 'Registrar' },
  { id: 'USR-AUD-01', name: 'Priya Iyer', role: 'AUDITOR', active: true, title: 'Read-only auditor' },
  { id: 'USR-REP-02', name: 'Arjun Bhatia', role: 'INSTITUTION_REP', institutionId: 'INST-0002', active: true, supervisorId: 'USR-ADM-01', title: 'Accounts officer' },
  { id: 'USR-REP-03', name: 'Kavita Deshpande', role: 'INSTITUTION_REP', institutionId: 'INST-0006', active: true, supervisorId: 'USR-ADM-01', title: 'Principal' },
  { id: 'USR-REP-04', name: 'Meera Pillai', role: 'INSTITUTION_REP', institutionId: 'INST-0008', active: true, supervisorId: 'USR-ADM-01', title: 'Finance officer' },
];

/** The five users shown as cards on the login page (prd.md §4). */
export const PRIMARY_USER_IDS = ['USR-ADM-01', 'USR-OFF-01', 'USR-OFF-02', 'USR-REP-01', 'USR-AUD-01'];

export const DEMO_BANKS: Bank[] = [
  { id: 'BNK-01', name: 'Bharat Sahyog Bank (Demo)', shortCode: 'BSB' },
  { id: 'BNK-02', name: 'Deccan Union Bank (Demo)', shortCode: 'DUB' },
  { id: 'BNK-03', name: 'Kaveri Co-operative Bank (Demo)', shortCode: 'KCB' },
  { id: 'BNK-04', name: 'Northern Trust Bank of India (Demo)', shortCode: 'NTB' },
  { id: 'BNK-05', name: 'Coastal Federal Bank (Demo)', shortCode: 'CFB' },
  { id: 'BNK-06', name: 'Vindhya Gramin Bank (Demo)', shortCode: 'VGB' },
];

export const BRANCHES: Record<string, string[]> = {
  'BNK-01': ['Shivaji Nagar', 'Civil Lines', 'MG Road'],
  'BNK-02': ['Banjara Hills', 'Station Road', 'Market Yard'],
  'BNK-03': ['Gandhi Bazaar', 'Temple Street', 'Fort Area'],
  'BNK-04': ['Mall Road', 'Sector 17', 'Cantonment'],
  'BNK-05': ['Marine Drive', 'Harbour Road', 'Beach Road'],
  'BNK-06': ['Collectorate', 'Bus Stand Road', 'College Road'],
};

export interface InstitutionSeed {
  id: string; name: string; type: InstitutionType; state: string; district: string; code: string; rep: string; repUserId?: string;
  status?: 'ACTIVE' | 'UNDER_REVIEW' | 'INACTIVE';
}

export const DEMO_INSTITUTIONS: InstitutionSeed[] = [
  { id: 'INST-0001', name: 'Aranyak Institute of Technology', type: 'ENGINEERING', state: 'Maharashtra', district: 'Pune', code: 'DEMO-MH-1001', rep: 'Sunil Kale' },
  { id: 'INST-0002', name: 'Shivalik Valley College of Engineering', type: 'ENGINEERING', state: 'Himachal Pradesh', district: 'Solan', code: 'DEMO-HP-1002', rep: 'Arjun Bhatia', repUserId: 'USR-REP-02' },
  { id: 'INST-0003', name: 'Konkan Coast Institute of Engineering', type: 'ENGINEERING', state: 'Maharashtra', district: 'Ratnagiri', code: 'DEMO-MH-1003', rep: 'Rahul Menon', repUserId: 'USR-REP-01' },
  { id: 'INST-0004', name: 'Ganga Doab School of Management', type: 'MANAGEMENT', state: 'Uttar Pradesh', district: 'Meerut', code: 'DEMO-UP-1004', rep: 'Neha Srivastava' },
  { id: 'INST-0005', name: 'Malnad Polytechnic Institute', type: 'POLYTECHNIC', state: 'Karnataka', district: 'Shivamogga', code: 'DEMO-KA-1005', rep: 'Ramesh Gowda', status: 'UNDER_REVIEW' },
  { id: 'INST-0006', name: 'Thar Desert Institute of Pharmacy', type: 'PHARMACY', state: 'Rajasthan', district: 'Jodhpur', code: 'DEMO-RJ-1006', rep: 'Kavita Deshpande', repUserId: 'USR-REP-03' },
  { id: 'INST-0007', name: 'Cauvery Delta College of Technology', type: 'ENGINEERING', state: 'Tamil Nadu', district: 'Thanjavur', code: 'DEMO-TN-1007', rep: 'Karthik Subramanian' },
  { id: 'INST-0008', name: 'Brahmaputra Valley School of Architecture', type: 'ARCHITECTURE', state: 'Assam', district: 'Kamrup', code: 'DEMO-AS-1008', rep: 'Meera Pillai', repUserId: 'USR-REP-04' },
  { id: 'INST-0009', name: 'Satpura Institute of Engineering', type: 'ENGINEERING', state: 'Madhya Pradesh', district: 'Betul', code: 'DEMO-MP-1009', rep: 'Alok Verma' },
  { id: 'INST-0010', name: 'Nilgiri Hills College of Pharmacy', type: 'PHARMACY', state: 'Tamil Nadu', district: 'Nilgiris', code: 'DEMO-TN-1010', rep: 'Divya Raman' },
  { id: 'INST-0011', name: 'Godavari Basin Institute of Technology', type: 'ENGINEERING', state: 'Telangana', district: 'Karimnagar', code: 'DEMO-TG-1011', rep: 'Srinivas Reddy' },
  { id: 'INST-0012', name: 'Chilika Lake Institute of Management', type: 'MANAGEMENT', state: 'Odisha', district: 'Khordha', code: 'DEMO-OD-1012', rep: 'Pooja Mohanty' },
];

export type Officer = 'V' | 'F';
export const OFFICER_ID: Record<Officer, string> = { V: 'USR-OFF-01', F: 'USR-OFF-02' };

export interface FdrSeed {
  n: number; inst: string; bank: string; lakhs: number; issue: number; maturity: number;
  category: InstrumentCategory; final: VerificationStatus; officer?: Officer;
  ref?: string; bankConf?: boolean; code?: string; note?: string;
}

/** Scenario IDs S-01…S-13 (prd.md §7.3) are noted inline. Offsets are days from today. */
export const DEMO_FDRS: FdrSeed[] = [
  { n: 1, inst: 'INST-0001', bank: 'BNK-01', lakhs: 25, issue: -400, maturity: 330, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V' },
  { n: 2, inst: 'INST-0002', bank: 'BNK-02', lakhs: 40, issue: -300, maturity: 430, category: 'INTAKE_INCREASE', final: 'ACCEPTED', officer: 'F' },
  { n: 3, inst: 'INST-0003', bank: 'BNK-03', lakhs: 30, issue: -200, maturity: 530, category: 'NEW_PROGRAMME', final: 'ACCEPTED', officer: 'V' },
  { n: 4, inst: 'INST-0003', bank: 'BNK-01', lakhs: 15, issue: -250, maturity: 150, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'F' },
  { n: 5, inst: 'INST-0003', bank: 'BNK-04', lakhs: 50, issue: -360, maturity: 5, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V', note: 'S-01' },
  { n: 6, inst: 'INST-0004', bank: 'BNK-05', lakhs: 35, issue: -100, maturity: 630, category: 'NEW_PROGRAMME', final: 'ACCEPTED', officer: 'F' },
  { n: 7, inst: 'INST-0005', bank: 'BNK-06', lakhs: 100, issue: -20, maturity: 710, category: 'NEW_INSTITUTION', final: 'UNDER_REVIEW', officer: 'F', bankConf: false, note: 'S-07' },
  { n: 8, inst: 'INST-0004', bank: 'BNK-02', lakhs: 20, issue: -340, maturity: 25, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V' },
  { n: 9, inst: 'INST-0005', bank: 'BNK-01', lakhs: 45, issue: -500, maturity: 60, category: 'INTAKE_INCREASE', final: 'ACCEPTED', officer: 'F' },
  { n: 10, inst: 'INST-0003', bank: 'BNK-03', lakhs: 60, issue: -150, maturity: 580, category: 'INTAKE_INCREASE', final: 'ACCEPTED', officer: 'V', ref: 'KCB/FD/778812', note: 'S-05' },
  { n: 11, inst: 'INST-0007', bank: 'BNK-04', lakhs: 25, issue: -380, maturity: -3, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'F' },
  { n: 12, inst: 'INST-0001', bank: 'BNK-05', lakhs: 75, issue: -377, maturity: -12, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V', note: 'S-03' },
  { n: 13, inst: 'INST-0009', bank: 'BNK-06', lakhs: 30, issue: -30, maturity: 700, category: 'NEW_PROGRAMME', final: 'ASSIGNED', officer: 'V' },
  { n: 14, inst: 'INST-0010', bank: 'BNK-02', lakhs: 50, issue: -25, maturity: 705, category: 'INTAKE_INCREASE', final: 'UNDER_REVIEW', officer: 'V', note: 'S-11' },
  { n: 15, inst: 'INST-0011', bank: 'BNK-01', lakhs: 20, issue: -40, maturity: 690, category: 'CONTINUATION', final: 'RECOMMENDED_ACCEPT', officer: 'F' },
  { n: 16, inst: 'INST-0012', bank: 'BNK-03', lakhs: 10, issue: -35, maturity: 695, category: 'NEW_PROGRAMME', final: 'RECOMMENDED_REJECT', officer: 'V', code: 'DEMO-OD-1210' },
  { n: 17, inst: 'INST-0009', bank: 'BNK-04', lakhs: 55, issue: -45, maturity: 320, category: 'CONTINUATION', final: 'DISCREPANCY_FLAGGED', officer: 'V', bankConf: true },
  { n: 18, inst: 'INST-0007', bank: 'BNK-02', lakhs: 40, issue: -200, maturity: 165, category: 'INTAKE_INCREASE', final: 'ACCEPTED', officer: 'F', ref: 'DUB/FD/440021', note: 'S-06' },
  { n: 19, inst: 'INST-0007', bank: 'BNK-05', lakhs: 40, issue: -15, maturity: 715, category: 'INTAKE_INCREASE', final: 'UNDER_REVIEW', officer: 'F', ref: 'DUB-FD-440021', note: 'S-06' },
  { n: 20, inst: 'INST-0010', bank: 'BNK-06', lakhs: 35, issue: -345, maturity: 20, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'F', note: 'S-02' },
  { n: 21, inst: 'INST-0006', bank: 'BNK-01', lakhs: 25, issue: -10, maturity: 720, category: 'NEW_PROGRAMME', final: 'SUBMITTED', note: 'S-12' },
  { n: 22, inst: 'INST-0006', bank: 'BNK-03', lakhs: 30, issue: -28, maturity: 700, category: 'CONTINUATION', final: 'INFO_REQUESTED', officer: 'V', note: 'S-12' },
  { n: 23, inst: 'INST-0006', bank: 'BNK-04', lakhs: 45, issue: -400, maturity: -8, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'F', note: 'S-12' },
  { n: 24, inst: 'INST-0006', bank: 'BNK-02', lakhs: 20, issue: -353, maturity: 12, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V', note: 'S-12' },
  { n: 25, inst: 'INST-0006', bank: 'BNK-05', lakhs: 15, issue: -300, maturity: 65, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V', note: 'S-12' },
  { n: 26, inst: 'INST-0011', bank: 'BNK-06', lakhs: 65, issue: -60, maturity: 670, category: 'NEW_INSTITUTION', final: 'FURTHER_SCRUTINY', officer: 'F' },
  { n: 27, inst: 'INST-0008', bank: 'BNK-01', lakhs: 30, issue: -420, maturity: -50, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V', note: 'S-10' },
  { n: 28, inst: 'INST-0002', bank: 'BNK-03', lakhs: 20, issue: -260, maturity: 100, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'F' },
  { n: 29, inst: 'INST-0008', bank: 'BNK-04', lakhs: 25, issue: -390, maturity: -20, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V' },
  { n: 30, inst: 'INST-0002', bank: 'BNK-02', lakhs: 35, issue: -380, maturity: -5, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'F' },
  { n: 31, inst: 'INST-0004', bank: 'BNK-01', lakhs: 40, issue: -380, maturity: -15, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V', note: 'S-04' },
  { n: 33, inst: 'INST-0002', bank: 'BNK-05', lakhs: 10, issue: -200, maturity: 200, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V' },
  { n: 34, inst: 'INST-0008', bank: 'BNK-06', lakhs: 18, issue: -365, maturity: 0, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'F' },
  { n: 35, inst: 'INST-0009', bank: 'BNK-03', lakhs: 28, issue: -3, maturity: 727, category: 'NEW_PROGRAMME', final: 'SUBMITTED', note: 'S-13' },
  { n: 36, inst: 'INST-0002', bank: 'BNK-04', lakhs: 12, issue: -400, maturity: -30, category: 'CONTINUATION', final: 'ACCEPTED', officer: 'V' },
  { n: 37, inst: 'INST-0012', bank: 'BNK-02', lakhs: 22, issue: -50, maturity: 680, category: 'CONTINUATION', final: 'REJECTED', officer: 'F' },
];

/** FDR-DEMO-0032 is created as the accepted renewal of FDR-DEMO-0031 (S-04). */
export const RENEWAL_SEED = { predecessor: 31, successor: 32, issue: -15, maturity: 350, officer: 'F' as Officer };

export interface RequestSeed {
  n: number; fdr: number; type: 'RELEASE' | 'REFUND';
  steps: ('assign' | 'requestInfo' | 'recommendApprove' | 'recommendReject' | 'approve' | 'reject' | 'recordAction' | 'close')[];
  officer?: Officer; shortReason?: boolean; start: number;
}

export const DEMO_REQUESTS: RequestSeed[] = [
  { n: 1, fdr: 27, type: 'RELEASE', officer: 'V', start: -45, steps: ['assign', 'recommendApprove', 'approve', 'recordAction', 'close'] },
  { n: 2, fdr: 28, type: 'REFUND', officer: 'F', start: -40, steps: ['assign', 'recommendReject', 'reject', 'close'] },
  { n: 3, fdr: 29, type: 'RELEASE', officer: 'V', start: -14, steps: ['assign', 'requestInfo'] },
  { n: 4, fdr: 30, type: 'REFUND', officer: 'F', start: -9, steps: ['assign', 'recommendApprove'] },
  { n: 5, fdr: 25, type: 'RELEASE', officer: 'V', start: -6, steps: ['assign'] },
  { n: 6, fdr: 33, type: 'RELEASE', start: -3, steps: [] },
  { n: 7, fdr: 34, type: 'RELEASE', start: -2, steps: [], shortReason: true },
  { n: 8, fdr: 36, type: 'REFUND', officer: 'F', start: -20, steps: ['assign', 'recommendApprove', 'approve'] },
];

export const demoFdrId = (n: number) => `FDR-DEMO-${String(n).padStart(4, '0')}`;
export const demoReqId = (n: number) => `REQ-DEMO-${String(n).padStart(4, '0')}`;
