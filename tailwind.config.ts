import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      /* ── Brand Colors ── */
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
          950: '#1e3a8a',
        },
        accent: {
          50:  '#fff4e6',
          100: '#ffe8cc',
          200: '#ffd8a8',
          300: '#ffc078',
          400: '#ffa94d',
          500: '#ff922b',
          600: '#fd7e14',
          700: '#e8590c',
          800: '#d9480f',
          900: '#c92a2a',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
          950: '#0f1117',
        },
      },

      /* ── Typography ── */
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['4.5rem',  { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl':  ['3.75rem', { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg':  ['3rem',    { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md':  ['2.25rem', { lineHeight: '1.2',  letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-sm':  ['1.875rem',{ lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-xs':  ['1.5rem',  { lineHeight: '1.3',  fontWeight: '600' }],
      },

      /* ── Spacing Scale ── */
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },

      /* ── Shadows ── */
      boxShadow: {
        'xs':      '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'soft':    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card':    '0 2px 8px -2px rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'elevated':'0 4px 16px -4px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'float':   '0 8px 32px -8px rgb(0 0 0 / 0.12), 0 4px 8px -4px rgb(0 0 0 / 0.08)',
      },

      /* ── Border Radius ── */
      borderRadius: {
        'card': '0.75rem',
        'btn':  '0.5rem',
        'pill': '9999px',
        'input':'0.5rem',
      },

      /* ── Transitions ── */
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },

      /* ── Container ── */
      maxWidth: {
        'content': '72rem',
        'narrow':  '48rem',
      },
    },
  },
  plugins: [],
}

export default config
