/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0E8A4F',
          dark: '#0A6B3D',
          light: '#E7F4EC',
          lighter: '#F1F9F4',
        },
        gold: { DEFAULT: '#E2A000', dark: '#8A5E00' },
        danger: { DEFAULT: '#D23A2C', dark: '#A82E22' },
        sidebar: { DEFAULT: '#0B2A1B', dark: '#07150D' },
        app: {
          bg: '#F4F6F3',
          surface: '#FFFFFF',
          border: '#E6EAE3',
          text: '#13201A',
          muted: '#566159',
          subtle: '#8A938B',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
