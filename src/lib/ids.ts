/** IDs come from persisted counters, never Math.random() (agent.md §5). */
export function padded(prefix: string, n: number, width: number): string {
  return `${prefix}${String(n).padStart(width, '0')}`;
}

export function nextCounter(counters: Record<string, number>, key: string): { n: number; counters: Record<string, number> } {
  const n = (counters[key] ?? 0) + 1;
  return { n, counters: { ...counters, [key]: n } };
}
