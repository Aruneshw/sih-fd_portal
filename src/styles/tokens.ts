/** The single token file (architecture.md §17). Tailwind and the charts both read from here. */
export const colors = {
  navy: { 900: '#0B1F3A', 800: '#112B4F', 700: '#16345F', 600: '#1F4579', 100: '#DCE6F3', 50: '#EEF3FA' },
  teal: { 700: '#0B7368', 600: '#0E8C7E', 100: '#D5F0EC', 50: '#ECF8F6' },
  amber: { 700: '#92400E', 600: '#B45309', 100: '#FDF0D5', 50: '#FFF8EB' },
  red: { 900: '#7F1D1D', 800: '#991B1B', 700: '#B91C1C', 100: '#FDE2E2', 50: '#FEF2F2' },
  violet: { 700: '#6D28D9', 400: '#A78BFA', 100: '#EDE4FD', 50: '#F6F1FE' },
  chart: { grid: '#E2E8F0', slate: '#64748B', slateLight: '#94A3B8' },
} as const;
