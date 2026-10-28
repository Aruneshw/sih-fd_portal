import type { Config } from 'tailwindcss';
import { colors } from './src/styles/tokens';

// Design tokens live in src/styles/tokens.ts (architecture.md §17).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { navy: colors.navy, teal: colors.teal, amber: colors.amber, red: colors.red, violet: colors.violet },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      fontSize: { base: ['14px', '20px'] },
    },
  },
  plugins: [],
} satisfies Config;
