/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';
import forms from '@tailwindcss/forms';

// Design tokens follow Atlassian Design System (ADS) conventions.
//
// Tailwind's stock palettes are remapped onto ADS colour ramps and exposed as CSS
// variables, so every page that uses `gray-*`, `blue-*`, `green-*`… picks up the
// system — and switches with the theme — without per-page edits.
//
// Light steps map to their nearest semantic role (50 = sunken surface, 200 = border,
// 500/600 = subtle text or bold fill, 800 = text). Dark steps are chosen so the same
// utility keeps its role: tints become dark tinted surfaces, text steps become light.
// Steps 500–700 are used both as fills under white text (bg-primary-600) and as text
// on the page (text-primary-600). In dark, the ramp keeps them as saturated fills and
// `text` lists lighter values that text-*-500/600/700 switch to, so both stay legible.

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const palettes = {
  gray: {
    light: ['#F7F8F9', '#F1F2F4', '#DCDFE4', '#B3B9C4', '#8590A2', '#626F86', '#44546F', '#2C3E5D', '#172B4D', '#172B4D', '#091E42'],
    dark: ['#161A1D', '#22272B', '#2C333A', '#454F59', '#738496', '#8C9BAB', '#9FADBC', '#B6C2CF', '#C7D1DB', '#DEE4EA', '#F1F2F4'],
  },
  blue: {
    light: ['#F0F6FF', '#E9F2FF', '#CCE0FF', '#85B8FF', '#579DFF', '#1D7AFC', '#0C66E4', '#0055CC', '#09326C', '#082145', '#061733'],
    dark: ['#1C2B41', '#1C2B41', '#09326C', '#0055CC', '#579DFF', '#1D7AFC', '#0C66E4', '#0055CC', '#85B8FF', '#CCE0FF', '#E9F2FF'],
    text: ['#579DFF', '#579DFF', '#85B8FF'],
  },
  green: {
    light: ['#EFFFF8', '#DCFFF1', '#BAF3DB', '#7EE2B8', '#4BCE97', '#22A06B', '#1F845A', '#216E4E', '#164B35', '#133527', '#0C241A'],
    dark: ['#1C3329', '#1C3329', '#164B35', '#216E4E', '#4BCE97', '#22A06B', '#1F845A', '#216E4E', '#7EE2B8', '#BAF3DB', '#DCFFF1'],
    text: ['#4BCE97', '#4BCE97', '#7EE2B8'],
  },
  red: {
    light: ['#FFF5F4', '#FFECEB', '#FFD5D2', '#FD9891', '#F87168', '#E2483D', '#C9372C', '#AE2E24', '#872018', '#5D1F1A', '#42221F'],
    dark: ['#42221F', '#42221F', '#5D1F1A', '#AE2E24', '#F87168', '#E2483D', '#C9372C', '#AE2E24', '#FD9891', '#FFD5D2', '#FFECEB'],
    text: ['#F87168', '#F87168', '#FD9891'],
  },
  yellow: {
    light: ['#FFFCEB', '#FFF7D6', '#F8E6A0', '#F5CD47', '#E2B203', '#CF9F02', '#B38600', '#946F00', '#7F5F01', '#533F04', '#3F3102'],
    dark: ['#332E1B', '#332E1B', '#533F04', '#7F5F01', '#E2B203', '#CF9F02', '#B38600', '#946F00', '#F5CD47', '#F8E6A0', '#FFF7D6'],
    text: ['#E2B203', '#E2B203', '#F5CD47'],
  },
  orange: {
    light: ['#FFF8F3', '#FFF3EB', '#FEDEC8', '#FEC195', '#FEA362', '#F38A3F', '#E56910', '#C25100', '#A54800', '#702E00', '#4F2100'],
    dark: ['#38291E', '#38291E', '#702E00', '#A54800', '#FEA362', '#E56910', '#C25100', '#A54800', '#FEC195', '#FEDEC8', '#FFF3EB'],
    text: ['#FEA362', '#FEA362', '#FEC195'],
  },
  purple: {
    light: ['#F8F6FF', '#F3F0FF', '#DFD8FD', '#B8ACF6', '#9F8FEF', '#8F7EE7', '#8270DB', '#6E5DC6', '#5E4DB2', '#352C63', '#2B273F'],
    dark: ['#2B273F', '#2B273F', '#352C63', '#5E4DB2', '#9F8FEF', '#8270DB', '#6E5DC6', '#5E4DB2', '#B8ACF6', '#DFD8FD', '#F3F0FF'],
    text: ['#9F8FEF', '#9F8FEF', '#B8ACF6'],
  },
  teal: {
    light: ['#F2FCFF', '#E7F9FF', '#C6EDFB', '#9DD9EE', '#6CC3E0', '#42B2D7', '#2898BD', '#227D9B', '#206A83', '#164555', '#103034'],
    dark: ['#1E3137', '#1E3137', '#164555', '#206A83', '#6CC3E0', '#2898BD', '#227D9B', '#206A83', '#9DD9EE', '#C6EDFB', '#E7F9FF'],
    text: ['#6CC3E0', '#6CC3E0', '#9DD9EE'],
  },
};

// Stock Tailwind names that point at an ADS ramp
const aliases = {
  primary: 'blue',
  slate: 'gray',
  zinc: 'gray',
  neutral: 'gray',
  stone: 'gray',
  indigo: 'blue',
  sky: 'teal',
  cyan: 'teal',
  emerald: 'green',
  lime: 'green',
  rose: 'red',
  pink: 'red',
  amber: 'yellow',
  violet: 'purple',
  fuchsia: 'purple',
};

const toChannels = hex => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const varsFor = mode =>
  Object.fromEntries(
    Object.entries(palettes).flatMap(([name, ramp]) =>
      STEPS.map((step, i) => [`--c-${name}-${step}`, toChannels(ramp[mode][i])])
    )
  );

const rampColors = name =>
  Object.fromEntries(STEPS.map(step => [step, `rgb(var(--c-${name}-${step}) / <alpha-value>)`]));

const colors = Object.fromEntries([
  ...Object.keys(palettes).map(name => [name, rampColors(name)]),
  ...Object.entries(aliases).map(([alias, name]) => [alias, rampColors(name)]),
  // Semantic surfaces (ADS elevation.surface.*), defined per theme in global.css
  [
    'surface',
    {
      DEFAULT: 'var(--ds-surface)',
      sunken: 'var(--ds-surface-sunken)',
      raised: 'var(--ds-surface-raised)',
      overlay: 'var(--ds-surface-overlay)',
    },
  ],
]);

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        // ADS font stack: system UI fonts, no network dependency
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Ubuntu',
          'system-ui',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'Menlo', '"Segoe UI Mono"', '"Ubuntu Mono"', 'monospace'],
      },
      fontSize: {
        // ADS type scale: 14px body with 20px line height
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.25rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.5rem' }],
        '2xl': ['1.5rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.75rem', { lineHeight: '2rem' }],
        '4xl': ['2rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        // ADS radius scale: small 3px controls, medium 4px, large 8px containers
        sm: '3px',
        DEFAULT: '4px',
        md: '4px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        // ADS elevation tokens (defined per theme in global.css)
        sm: 'var(--ds-shadow-raised)',
        DEFAULT: 'var(--ds-shadow-raised)',
        md: 'var(--ds-shadow-overlay)',
        lg: 'var(--ds-shadow-overlay)',
        xl: 'var(--ds-shadow-overlay)',
        '2xl': 'var(--ds-shadow-overlay)',
      },
      ringColor: {
        DEFAULT: '#388BFF', // color.border.focused
      },
      height: {
        topnav: '56px',
      },
    },
  },
  plugins: [
    forms,
    plugin(({ addBase }) => {
      // Light is the default; dark applies when chosen, or when "Match system" is
      // chosen and the OS prefers dark (see the theme script in BaseLayout).
      // Dark-only overrides so text utilities on the 500–700 steps stay readable
      const textOverrides = Object.fromEntries(
        Object.entries({ ...Object.fromEntries(Object.keys(palettes).map(n => [n, n])), ...aliases })
          .filter(([, ramp]) => palettes[ramp].text)
          .flatMap(([name, ramp]) =>
            [500, 600, 700].flatMap((step, i) => {
              const color = palettes[ramp].text[i];
              return [
                [`.text-${name}-${step}`, { color }],
                [`.hover\\:text-${name}-${step}:hover`, { color }],
              ];
            })
          )
      );
      const scoped = prefix => Object.fromEntries(Object.entries(textOverrides).map(([sel, rule]) => [`${prefix} ${sel}`, rule]));

      addBase({
        ...scoped(':root[data-theme="dark"]'),
        '@media (prefers-color-scheme: dark)': scoped(':root[data-theme="system"]'),
      });

      addBase({
        ':root': varsFor('light'),
        ':root[data-theme="dark"]': varsFor('dark'),
        '@media (prefers-color-scheme: dark)': {
          ':root[data-theme="system"]': varsFor('dark'),
        },
      });
    }),
  ],
}
