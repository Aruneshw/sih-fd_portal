import { toBusinessDate, toIstTimestamp } from './dates';

/** Injectable clock (P8): all date logic takes `today` from here. */
export interface Clock {
  today(): string;
  now(): string;
}

export const SystemClock: Clock = {
  today: () => toBusinessDate(new Date()),
  now: () => toIstTimestamp(new Date()),
};

export function fixedClock(today: string, now = `${today}T10:00:00+05:30`): Clock {
  return { today: () => today, now: () => now };
}
