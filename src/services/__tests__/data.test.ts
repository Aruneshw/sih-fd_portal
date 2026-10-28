import { loadState, saveState } from '@/data/persistence';
import { migrate } from '@/data/migrations';
import { KEYS, MemoryStorageAdapter } from '@/data/storage/StorageAdapter';
import { fixedClock } from '@/lib/clock';
import { createRuntime } from '@/services/runtime';
import { generateSeed } from '@/services/seed/generate';
import { generateNotifications, mergeNotifications, syncNotifications } from '@/services/notifications/generate';
import { verifyChain } from '@/services/audit/hashChain';
import { NOW, TODAY } from '@/test/fixtures';

describe('seed', () => {
  const a = generateSeed(TODAY);
  it('is deterministic', () => {
    expect(JSON.stringify(generateSeed(TODAY))).toBe(JSON.stringify(a));
  });
  it('meets the volume requirements (prd.md §7.1)', () => {
    expect(Object.keys(a.institutions).length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(a.fdrs).length).toBeGreaterThanOrEqual(36);
    expect(Object.keys(a.banks).length).toBe(6);
    expect(Object.keys(a.requests).length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(a.notifications).length).toBeGreaterThanOrEqual(40);
    expect(a.audit.length).toBeGreaterThanOrEqual(150);
    expect(Object.values(a.fdrs).every((f) => f.isDemo)).toBe(true);
  });
  it('builds an intact hash chain starting with demo.seed', () => {
    expect(verifyChain(a.audit)).toEqual({ ok: true, count: a.audit.length });
    expect(a.audit[0].action).toBe('demo.seed');
  });
  it('contains the fixed scenarios S-01…S-13', () => {
    const f = a.fdrs;
    expect(f['FDR-DEMO-0005']).toMatchObject({ institutionId: 'INST-0003', verificationStatus: 'ACCEPTED', maturityDate: '2026-11-02' });
    expect(f['FDR-DEMO-0020'].maturityDate).toBe('2026-11-17');
    expect(f['FDR-DEMO-0012']).toMatchObject({ maturityDate: '2026-10-16', verificationStatus: 'ACCEPTED', adminStatus: 'RECORDED' });
    expect(f['FDR-DEMO-0031']).toMatchObject({ adminStatus: 'SUPERSEDED', currentSuccessorId: 'FDR-DEMO-0032' });
    expect(f['FDR-DEMO-0032']).toMatchObject({ predecessorId: 'FDR-DEMO-0031', verificationStatus: 'ACCEPTED' });
    expect(Object.values(f).some((x) => x.referenceNo === 'KCB/FD/778812')).toBe(true);
    expect(f['FDR-DEMO-0019'].referenceNorm).toBe(f['FDR-DEMO-0018'].referenceNorm);
    expect(a.requests['REQ-DEMO-0003'].stage).toBe('INFO_REQUESTED');
    expect(a.requests['REQ-DEMO-0004']).toMatchObject({ stage: 'RECOMMENDED', recommendation: 'APPROVE' });
    expect(a.requests['REQ-DEMO-0001'].stage).toBe('CLOSED');
    expect(f['FDR-DEMO-0027'].adminStatus).toBe('RELEASED');
    expect(f['FDR-DEMO-0014']).toMatchObject({ assignedOfficerId: 'USR-OFF-01', verificationStatus: 'UNDER_REVIEW' });
    expect(a.extracted['FDR-DEMO-0014'].values.amountPaise).toBe(String(5_00_000_00));
    expect(f['FDR-DEMO-0035']).toMatchObject({ verificationStatus: 'SUBMITTED' });
    expect(f['FDR-DEMO-0035'].assignedOfficerId).toBeUndefined();
    const inst3Accepted = Object.values(f).filter((x) => x.institutionId === 'INST-0003' && x.verificationStatus === 'ACCEPTED' && x.adminStatus === 'RECORDED');
    expect(inst3Accepted.length).toBeGreaterThanOrEqual(3);
  });
});

describe('persistence', () => {
  it('round-trips state', () => {
    const ad = new MemoryStorageAdapter();
    const s = generateSeed(TODAY);
    saveState(ad, s, NOW);
    const r = loadState(ad, NOW);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.state.audit.length).toBe(s.audit.length);
  });
  it('quarantines corrupt JSON instead of wiping it', () => {
    const ad = new MemoryStorageAdapter();
    ad.set(KEYS.state, '{not json');
    const r = loadState(ad, NOW);
    expect(r.kind).toBe('corrupt');
    if (r.kind === 'corrupt') expect(ad.get(r.corruptKey)).toBe('{not json');
    expect(ad.get(KEYS.state)).toBe('{not json');
  });
  it('rejects a structurally invalid envelope', () => {
    const ad = new MemoryStorageAdapter();
    ad.set(KEYS.state, JSON.stringify({ schemaVersion: 1, savedAt: NOW, data: { fdrs: 'x' } }));
    expect(loadState(ad, NOW).kind).toBe('corrupt');
  });
  it('migrates v0 → v1', () => {
    const old = { ...generateSeed(TODAY), schemaVersion: 0 } as Record<string, unknown>;
    delete old.counters;
    const m = migrate(old, 0);
    expect(m.schemaVersion).toBe(1);
    expect(m.counters).toEqual({});
    const ad = new MemoryStorageAdapter();
    ad.set(KEYS.state, JSON.stringify({ schemaVersion: 0, savedAt: NOW, data: old }));
    const r = loadState(ad, NOW);
    expect(r).toMatchObject({ kind: 'ok', migrated: true });
  });
  it('runtime enters recovery mode on corrupt storage (T12)', () => {
    const ad = new MemoryStorageAdapter();
    ad.set(KEYS.state, '{"broken":');
    const rt = createRuntime(ad, fixedClock(TODAY, NOW));
    rt.init();
    expect(rt.store.get().kind).toBe('recovery');
    expect(rt.readCorrupt()).toBe('{"broken":');
    rt.recoverWithFreshSeed();
    expect(rt.store.get().kind).toBe('ready');
  });
});

describe('notifications', () => {
  it('generation is idempotent (run twice → same count)', () => {
    const s = generateSeed(TODAY);
    const once = syncNotifications(s, TODAY, NOW);
    const twice = syncNotifications(once, TODAY, NOW);
    expect(Object.keys(twice.notifications).length).toBe(Object.keys(once.notifications).length);
    expect(twice).toBe(once);
  });
  it('never duplicates dedupe keys and keeps read history', () => {
    const s = generateSeed(TODAY);
    const keys = Object.values(s.notifications).map((n) => n.dedupeKey);
    expect(new Set(keys).size).toBe(keys.length);
    const id = Object.keys(s.notifications)[0];
    const read = { ...s, notifications: { ...s.notifications, [id]: { ...s.notifications[id], readBy: { u: NOW } } } };
    const merged = mergeNotifications(read, generateNotifications(read, TODAY), NOW);
    expect(merged.notifications[id].readBy).toEqual({ u: NOW });
  });
  it('S-01 has a critical-band reminder; S-03 is escalated', () => {
    const s = generateSeed(TODAY);
    const keys = Object.values(s.notifications).map((n) => n.dedupeKey);
    expect(keys).toContain('MAT:FDR-DEMO-0005:CRITICAL');
    expect(keys).toContain('OVD:FDR-DEMO-0012:ESCALATED');
  });
});
