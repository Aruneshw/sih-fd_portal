import { webcrypto } from 'node:crypto';
import { escapeCsvCell, toCsv } from './csv';
import { addDaysIso, daysBetween, formatDate, isIsoDate, toBusinessDate } from './dates';
import { checkFile } from './file';
import { canonicalJSON, sha256Sync } from './hash';
import { formatINR, formatINRCompact, parseRupeesInput } from './money';
import { levenshtein, normaliseReference } from './text';

describe('money', () => {
  it('formats with Indian grouping', () => {
    expect(formatINR(12_50_000_00)).toBe('₹12,50,000');
    expect(formatINR(5_00_00_000_00)).toBe('₹5,00,00,000');
    expect(formatINR(999_00)).toBe('₹999');
    expect(formatINR(1234_50)).toBe('₹1,234.50');
    expect(formatINRCompact(1_20_00_000_00)).toBe('₹1.2 Cr');
  });
  it('parses rupee input to paise', () => {
    expect(parseRupeesInput('5,00,000')).toBe(5_00_000_00);
    expect(parseRupeesInput('12.5')).toBe(1250);
    expect(parseRupeesInput('abc')).toBeNull();
    expect(parseRupeesInput('-5')).toBeNull();
  });
});

describe('dates', () => {
  it('computes calendar days and formats DD MMM YYYY', () => {
    expect(daysBetween('2026-10-28', '2026-11-02')).toBe(5);
    expect(daysBetween('2026-10-28', '2026-10-16')).toBe(-12);
    expect(addDaysIso('2026-12-30', 3)).toBe('2027-01-02');
    expect(formatDate('2026-10-28')).toBe('28 Oct 2026');
    expect(isIsoDate('2026-02-30')).toBe(false);
  });
  it('uses Asia/Kolkata for the business date', () => {
    expect(toBusinessDate(new Date('2026-10-27T20:00:00Z'))).toBe('2026-10-28'); // 01:30 IST
    expect(toBusinessDate(new Date('2026-10-27T18:00:00Z'))).toBe('2026-10-27'); // 23:30 IST
  });
});

describe('hash', () => {
  it('matches Web Crypto SHA-256', async () => {
    for (const msg of ['', 'abc', 'x'.repeat(1000), '₹ unicode ✓']) {
      const d = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
      const hex = Buffer.from(d).toString('hex');
      expect(sha256Sync(msg)).toBe(hex);
    }
  });
  it('canonical JSON sorts keys', () => {
    expect(canonicalJSON({ b: 1, a: { d: 2, c: [1, { f: 1, e: 2 }] } })).toBe('{"a":{"c":[1,{"e":2,"f":1}],"d":2},"b":1}');
  });
});

describe('csv', () => {
  it('guards against formula injection and quotes all fields', () => {
    expect(escapeCsvCell('=SUM(A1)')).toBe(`"'=SUM(A1)"`);
    expect(escapeCsvCell('+1')).toBe(`"'+1"`);
    expect(escapeCsvCell('@x')).toBe(`"'@x"`);
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(toCsv(['A', 'B'], [[1, 'x']])).toBe('"A","B"\r\n"1","x"');
  });
});

describe('text', () => {
  it('normalises references', () => {
    expect(normaliseReference('kcb/fd-778 812.')).toBe('KCBFD778812');
    expect(levenshtein('KCBFD778812', 'KCBFD778813')).toBe(1);
  });
});

describe('file checks', () => {
  const limits = { maxBytes: 5 * 1024 * 1024, allowedMime: ['application/pdf', 'image/png', 'image/jpeg'] };
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
  it('accepts a real PDF', () => expect(checkFile({ name: 'a.pdf', type: 'application/pdf', size: 100, head: pdf }, limits).ok).toBe(true));
  it('rejects wrong type, oversize and bad signature', () => {
    expect(checkFile({ name: 'a.exe', type: '', size: 100, head: pdf }, limits)).toMatchObject({ ok: false, code: 'EXTENSION' });
    expect(checkFile({ name: 'a.pdf', type: 'application/pdf', size: 6 * 1024 * 1024, head: pdf }, limits)).toMatchObject({ ok: false, code: 'SIZE' });
    expect(checkFile({ name: 'a.pdf', type: 'application/pdf', size: 100, head: new Uint8Array([1, 2, 3, 4]) }, limits)).toMatchObject({ ok: false, code: 'SIGNATURE' });
    expect(checkFile({ name: 'a.png', type: 'application/pdf', size: 100, head: pdf }, limits)).toMatchObject({ ok: false, code: 'MIME' });
  });
});
