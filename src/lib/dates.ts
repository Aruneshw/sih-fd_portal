import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';

/** NFR-11: business dates are date-only strings evaluated in Asia/Kolkata. */
export const BUSINESS_TZ = 'Asia/Kolkata';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = parseISO(value);
  return !Number.isNaN(d.getTime()) && format(d, 'yyyy-MM-dd') === value;
}

/** The calendar date (YYYY-MM-DD) of an instant, as seen in Asia/Kolkata. */
export function toBusinessDate(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

export function addDaysIso(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

export function addMonthsIso(date: string, months: number): string {
  return format(addMonths(parseISO(date), months), 'yyyy-MM-dd');
}

/** Display format `DD MMM YYYY` (e.g. 28 Oct 2026). */
export function formatDate(date: string | undefined): string {
  if (!date) return '—';
  const d = parseISO(date.length > 10 ? date.slice(0, 10) : date);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy');
}

/** Timestamps are displayed in Asia/Kolkata local time. */
export function formatDateTime(ts: string | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const date = formatDate(toBusinessDate(d));
  const time = new Intl.DateTimeFormat('en-IN', {
    timeZone: BUSINESS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${date}, ${time}`;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function formatMonth(key: string): string {
  return format(parseISO(`${key}-01`), 'MMM yyyy');
}

/** ISO-8601 timestamp with the IST offset, for audit and record timestamps. */
export function toIstTimestamp(instant: Date): string {
  const ist = new Date(instant.getTime() + 330 * 60_000);
  return `${ist.toISOString().slice(0, 19)}+05:30`;
}
