import type { Band } from '../types';

/** architecture.md §6: days < 0 → MATURED; 0–b3 CRITICAL; b3+1–b2 DUE_SOON; b2+1–b1 WATCH; > b1 LONG. */
export function bandFor(daysToMaturity: number, bands: [number, number, number]): Band {
  const [b1, b2, b3] = bands;
  if (daysToMaturity < 0) return 'MATURED';
  if (daysToMaturity <= b3) return 'CRITICAL';
  if (daysToMaturity <= b2) return 'DUE_SOON';
  if (daysToMaturity <= b1) return 'WATCH';
  return 'LONG';
}

export const BAND_ORDER: Band[] = ['MATURED', 'CRITICAL', 'DUE_SOON', 'WATCH', 'LONG'];
