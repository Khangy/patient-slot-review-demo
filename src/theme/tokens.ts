export const colors = {
  // Primary - Healthcare Teal
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  primaryDark: '#0F766E',
  primaryBg: 'rgba(13, 148, 136, 0.12)',

  // Secondary - Slate
  secondary: '#64748B',
  secondaryLight: '#94A3B8',
  secondaryDark: '#475569',

  // Backgrounds
  background: '#F8FAFC',
  paper: '#FFFFFF',
  sidebar: '#1E293B',
  sidebarHover: '#334155',
  sidebarActive: '#0D9488',

  // Text
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',

  // Status colors
  success: '#059669',
  successLight: '#D1FAE5',
  successDark: '#047857',
  successBg: 'rgba(5, 150, 105, 0.12)',

  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningDark: '#B45309',
  warningBg: 'rgba(217, 119, 6, 0.12)',

  error: '#DC2626',
  errorLight: '#FEE2E2',
  errorDark: '#B91C1C',
  errorBg: 'rgba(220, 38, 38, 0.12)',

  info: '#0284C7',
  infoLight: '#E0F2FE',
  infoDark: '#0369A1',
  infoBg: 'rgba(2, 132, 199, 0.12)',

  // Extended palette
  purple: '#7C3AED',
  purpleDark: '#6D28D9',
  purpleBg: 'rgba(124, 58, 237, 0.12)',

  indigo: '#4F46E5',
  indigoDark: '#4338CA',
  indigoBg: 'rgba(79, 70, 229, 0.12)',

  pink: '#DB2777',
  pinkDark: '#BE185D',
  pinkBg: 'rgba(219, 39, 119, 0.12)',

  cyan: '#06B6D4',
  cyanDark: '#0891B2',
  cyanBg: 'rgba(6, 182, 212, 0.12)',

  amber: '#F59E0B',
  amberDark: '#D97706',
  amberBg: 'rgba(245, 158, 11, 0.12)',

  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldBg: 'rgba(16, 185, 129, 0.12)',

  // Borders
  border: '#E2E8F0',
  divider: '#E2E8F0',

  // Grey scale
  // ── Chart series ─────────────────────────────────────────────────────────
  // Categorical palette for dashboard charts, in fixed assignment order. Verified
  // with the palette validator against this surface: adjacent pairs clear the CVD
  // and normal-vision separation floors and every step clears 3:1 contrast.
  // Never cycle these or reuse a status colour as a fourth series — fold extra
  // categories into "Other" instead.
  chartSeries: ['#DB2777', '#4F46E5', '#0D9488'] as string[],

  grey: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  } as Record<number, string>,
};

// ── Dark mode color tokens ──────────────────────────────────────────────
// Lifted from Tailwind CSS dark variants to match the light-mode Slate/Teal
// palette. These were previously hardcoded inline in theme.ts DarkTheme.

export const darkColors = {
  // Primary - Lighter teal for dark backgrounds
  primary: '#14B8A6',
  primaryLight: '#5EEAD4',
  primaryDark: '#0D9488',
  contrastText: '#000000',

  // Secondary - Lighter slate
  secondary: '#94A3B8',
  secondaryLight: '#CBD5E1',
  secondaryDark: '#64748B',

  // Status colors - Brighter variants for dark backgrounds
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#38BDF8',
  success: '#34D399',

  // Backgrounds - Slate 900/800
  background: '#0F172A',
  paper: '#1E293B',

  // Text - Inverted slate scale
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  textDisabled: '#64748B',

  // Borders
  divider: 'rgba(255, 255, 255, 0.12)',

  // Dark-mode chart series — re-validated against the dark surface rather than
  // flipped: teal and pink hold, indigo steps down to stay inside the lightness band.
  chartSeries: ['#DB2777', '#6366F1', '#0D9488'] as string[],

  // Status colors – higher-opacity backgrounds & lighter text for dark surfaces
  successBg: 'rgba(52, 211, 153, 0.20)',
  successText: '#6EE7B7',
  warningBg: 'rgba(245, 158, 11, 0.20)',
  warningText: '#FCD34D',
  errorBg: 'rgba(239, 68, 68, 0.20)',
  errorText: '#FCA5A5',
  infoBg: 'rgba(56, 189, 248, 0.20)',
  infoText: '#7DD3FC',

  purpleBg: 'rgba(139, 92, 246, 0.20)',
  purpleText: '#C4B5FD',
  purple: '#A78BFA',

  indigoBg: 'rgba(99, 102, 241, 0.20)',
  indigoText: '#A5B4FC',
  indigo: '#818CF8',

  pinkBg: 'rgba(236, 72, 153, 0.20)',
  pinkText: '#F9A8D4',
  pink: '#F472B6',

  cyanBg: 'rgba(34, 211, 238, 0.20)',
  cyanText: '#67E8F9',
  cyan: '#22D3EE',

  amberBg: 'rgba(251, 191, 36, 0.20)',
  amberText: '#FDE68A',
  amber: '#FBBF24',

  greyBg: 'rgba(148, 163, 184, 0.20)',
  greyText: '#CBD5E1',
};

// ── Typography tokens ────────────────────────────────────────────────────
// Monospace stack for code, IDs, and technical data display.
// IBM Plex Mono pairs with IBM Plex Sans for visual cohesion.
export const monoFontStack = [
  '"IBM Plex Mono"',
  'ui-monospace',
  'SFMono-Regular',
  '"SF Mono"',
  'Menlo',
  'Consolas',
  '"Liberation Mono"',
  'monospace',
].join(',');

// Overlays and scrims
export const overlays = {
  scrim: 'rgba(0, 0, 0, 0.3)',
  heavy: 'rgba(0, 0, 0, 0.5)',
  light: 'rgba(0, 0, 0, 0.12)',
  inverseHigh: 'rgba(255, 255, 255, 0.9)',
  inverseMedium: 'rgba(255, 255, 255, 0.8)',
  inverseMutedHigh: 'rgba(255, 255, 255, 0.7)',
  inverseMutedMedium: 'rgba(255, 255, 255, 0.6)',
  inverseMuted: 'rgba(255, 255, 255, 0.5)',
  inverseLow: 'rgba(255, 255, 255, 0.2)',
  inverseFrostedBorder: 'rgba(255, 255, 255, 0.15)',
  inverseFrosted: 'rgba(255, 255, 255, 0.1)',
  inverseHover: 'rgba(255, 255, 255, 0.08)',
  inverseBorder: 'rgba(255, 255, 255, 0.12)',
  inverseSubtle: 'rgba(255, 255, 255, 0.05)',
  inverseFaint: 'rgba(255, 255, 255, 0.04)',
  inverseVerySubtle: 'rgba(255, 255, 255, 0.03)',
} as const;

// Patient pipeline status colors used in the visual progress indicator on the
// Patient Snapshot. Kept separate from chip status colors because the stepper
// uses these as accent colors, not chip backgrounds.
export const pipelineColors = {
  needStudy: '#78909C', // Material BlueGrey 500
  preScreening: '#0288D1', // Material LightBlue 700
  screening: '#ED6C02', // Material Orange 700
  enrolled: '#2E7D32', // Material Green 800
  slotsHealthy: '#66BB6A', // Material Green 400
  slotsLow: '#FFA726', // Material Orange 400
} as const;

// Material Design elevation levels (dp → shadow)
export const elevation = {
  0: 'none',
  1: '0px 1px 1px rgba(0,0,0,0.14), 0px 2px 1px rgba(0,0,0,0.12), 0px 1px 3px rgba(0,0,0,0.20)',
  2: '0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px rgba(0,0,0,0.12), 0px 1px 5px rgba(0,0,0,0.20)',
  4: '0px 4px 5px rgba(0,0,0,0.14), 0px 1px 10px rgba(0,0,0,0.12), 0px 2px 4px rgba(0,0,0,0.20)',
  8: '0px 8px 10px rgba(0,0,0,0.14), 0px 3px 14px rgba(0,0,0,0.12), 0px 5px 5px rgba(0,0,0,0.20)',
  12: '0px 12px 17px rgba(0,0,0,0.14), 0px 5px 22px rgba(0,0,0,0.12), 0px 7px 8px rgba(0,0,0,0.20)',
  16: '0px 16px 24px rgba(0,0,0,0.14), 0px 6px 30px rgba(0,0,0,0.12), 0px 8px 10px rgba(0,0,0,0.20)',
  24: '0px 24px 38px rgba(0,0,0,0.14), 0px 9px 46px rgba(0,0,0,0.12), 0px 11px 15px rgba(0,0,0,0.20)',
} as const;

// Material Design transitions
export const transitions = {
  standard: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  emphasized: 'all 250ms cubic-bezier(0.0, 0, 0.2, 1)',
  decelerated: 'all 225ms cubic-bezier(0.0, 0, 0.2, 1)',
  accelerated: 'all 195ms cubic-bezier(0.4, 0, 1, 1)',
  duration: {
    short: 200,
    standard: 300,
    enter: 225,
    exit: 195,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    emphasized: 'cubic-bezier(0.0, 0, 0.2, 1)',
    decelerated: 'cubic-bezier(0.0, 0, 0.2, 1)',
    accelerated: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;
