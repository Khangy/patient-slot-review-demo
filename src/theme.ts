import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { colors, darkColors } from '@/theme/tokens';

// ── Typography ──────────────────────────────────────────────────────────

const fontStack = [
  '"IBM Plex Sans"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'sans-serif',
].join(',');

const typography: ThemeOptions['typography'] = {
  fontFamily: fontStack,
  fontSize: 14,
  h1: {
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    fontSize: '2.5rem',
  },
  h2: {
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
    fontSize: '2rem',
  },
  h3: {
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.4,
    fontSize: '1.5rem',
  },
  h4: {
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.4,
    fontSize: '1.25rem',
  },
  h5: {
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: '1.125rem',
  },
  h6: {
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: '1rem',
  },
  subtitle1: { fontWeight: 500, lineHeight: 1.6 },
  subtitle2: { fontWeight: 500, lineHeight: 1.6, fontSize: '0.875rem' },
  body1: { lineHeight: 1.7, fontSize: '1rem' },
  body2: { lineHeight: 1.7, fontSize: '0.875rem' },
  button: { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem' },
  caption: { letterSpacing: '0.02em', fontSize: '0.75rem', lineHeight: 1.5 },
  overline: { letterSpacing: '0.08em', fontWeight: 500, fontSize: '0.75rem', lineHeight: 1.5 },
};

// ── Material Design elevation shadows (3-layer: umbra + penumbra + ambient) ─

const shadows: ThemeOptions['shadows'] = [
  'none',
  '0px 1px 1px rgba(0,0,0,0.14), 0px 2px 1px rgba(0,0,0,0.12), 0px 1px 3px rgba(0,0,0,0.20)',
  '0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px rgba(0,0,0,0.12), 0px 1px 5px rgba(0,0,0,0.20)',
  '0px 3px 4px rgba(0,0,0,0.14), 0px 3px 3px rgba(0,0,0,0.12), 0px 1px 8px rgba(0,0,0,0.20)',
  '0px 4px 5px rgba(0,0,0,0.14), 0px 1px 10px rgba(0,0,0,0.12), 0px 2px 4px rgba(0,0,0,0.20)',
  '0px 5px 8px rgba(0,0,0,0.14), 0px 3px 5px rgba(0,0,0,0.12), 0px 1px 14px rgba(0,0,0,0.20)',
  '0px 6px 10px rgba(0,0,0,0.14), 0px 1px 18px rgba(0,0,0,0.12), 0px 3px 5px rgba(0,0,0,0.20)',
  '0px 7px 10px rgba(0,0,0,0.14), 0px 2px 16px rgba(0,0,0,0.12), 0px 4px 5px rgba(0,0,0,0.20)',
  '0px 8px 10px rgba(0,0,0,0.14), 0px 3px 14px rgba(0,0,0,0.12), 0px 5px 5px rgba(0,0,0,0.20)',
  '0px 9px 12px rgba(0,0,0,0.14), 0px 3px 16px rgba(0,0,0,0.12), 0px 5px 6px rgba(0,0,0,0.20)',
  '0px 10px 14px rgba(0,0,0,0.14), 0px 4px 18px rgba(0,0,0,0.12), 0px 6px 6px rgba(0,0,0,0.20)',
  '0px 11px 15px rgba(0,0,0,0.14), 0px 4px 20px rgba(0,0,0,0.12), 0px 6px 7px rgba(0,0,0,0.20)',
  '0px 12px 17px rgba(0,0,0,0.14), 0px 5px 22px rgba(0,0,0,0.12), 0px 7px 8px rgba(0,0,0,0.20)',
  '0px 13px 19px rgba(0,0,0,0.14), 0px 5px 24px rgba(0,0,0,0.12), 0px 7px 8px rgba(0,0,0,0.20)',
  '0px 14px 21px rgba(0,0,0,0.14), 0px 5px 26px rgba(0,0,0,0.12), 0px 7px 9px rgba(0,0,0,0.20)',
  '0px 15px 22px rgba(0,0,0,0.14), 0px 6px 28px rgba(0,0,0,0.12), 0px 8px 9px rgba(0,0,0,0.20)',
  '0px 16px 24px rgba(0,0,0,0.14), 0px 6px 30px rgba(0,0,0,0.12), 0px 8px 10px rgba(0,0,0,0.20)',
  '0px 17px 26px rgba(0,0,0,0.14), 0px 6px 32px rgba(0,0,0,0.12), 0px 8px 11px rgba(0,0,0,0.20)',
  '0px 18px 28px rgba(0,0,0,0.14), 0px 7px 34px rgba(0,0,0,0.12), 0px 9px 11px rgba(0,0,0,0.20)',
  '0px 19px 29px rgba(0,0,0,0.14), 0px 7px 36px rgba(0,0,0,0.12), 0px 9px 12px rgba(0,0,0,0.20)',
  '0px 20px 31px rgba(0,0,0,0.14), 0px 8px 38px rgba(0,0,0,0.12), 0px 10px 13px rgba(0,0,0,0.20)',
  '0px 21px 33px rgba(0,0,0,0.14), 0px 8px 40px rgba(0,0,0,0.12), 0px 10px 13px rgba(0,0,0,0.20)',
  '0px 22px 35px rgba(0,0,0,0.14), 0px 8px 42px rgba(0,0,0,0.12), 0px 10px 14px rgba(0,0,0,0.20)',
  '0px 23px 36px rgba(0,0,0,0.14), 0px 9px 44px rgba(0,0,0,0.12), 0px 11px 14px rgba(0,0,0,0.20)',
  '0px 24px 38px rgba(0,0,0,0.14), 0px 9px 46px rgba(0,0,0,0.12), 0px 11px 15px rgba(0,0,0,0.20)',
];

// ── Shared component overrides (Material Design compliance) ─────────────

const componentOverrides: ThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: {
      '@media (prefers-reduced-motion: reduce)': {
        '*, *::before, *::after': {
          animationDuration: '0.01ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.01ms !important',
        },
      },
    },
  },
  MuiButtonBase: {
    defaultProps: {
      disableRipple: false,
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 6,
        minHeight: 36,
        transition:
          'background-color 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out, transform 200ms ease-out',
        '&:hover': {
          transform: 'translateY(-1px)',
        },
      },
      sizeLarge: {
        minHeight: 48,
        paddingLeft: 28,
        paddingRight: 28,
      },
      sizeMedium: {
        minHeight: 40,
        paddingLeft: 20,
        paddingRight: 20,
      },
      sizeSmall: {
        minHeight: 32,
        paddingLeft: 16,
        paddingRight: 16,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        transition: 'background-color 150ms ease-out, transform 150ms ease-out',
        '&:hover': {
          transform: 'scale(1.05)',
        },
      },
      sizeMedium: {
        padding: 8,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        transition: 'all 200ms ease-out',
      },
    },
  },
  MuiPaper: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        borderRadius: 12,
        transition: 'box-shadow 200ms ease-out',
      },
    },
  },
  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
        transition: 'box-shadow 200ms ease-out',
      },
    },
  },
  MuiAppBar: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        borderRadius: 0,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: 0,
      },
    },
  },
  MuiDialog: {
    defaultProps: {
      PaperProps: {
        elevation: 0,
      },
    },
    styleOverrides: {
      paper: {
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        minHeight: 48,
        transition: 'color 200ms ease-out, background-color 200ms ease-out',
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        minHeight: 48,
      },
      indicator: {
        height: 3,
        borderRadius: '3px 3px 0 0',
        transition: 'all 200ms ease-out',
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-head': {
          fontWeight: 600,
          letterSpacing: 0.25,
        },
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: 'background-color 200ms ease-out',
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        padding: '16px 20px',
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 4,
      },
      bar: {
        borderRadius: 4,
        transition: 'transform 300ms ease-out',
      },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        transition: 'background-color 200ms ease-out, color 200ms ease-out',
      },
    },
  },
  MuiMenu: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      paper: {
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.1)',
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 6,
        fontSize: '0.75rem',
      },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: {
        transition: 'box-shadow 200ms ease-out',
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
};

// ── Light Theme ─────────────────────────────────────────────────────────

export const LightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colors.secondary,
      light: colors.secondaryLight,
      dark: colors.secondaryDark,
      contrastText: '#FFFFFF',
    },
    error: {
      main: colors.error,
      light: colors.errorLight,
      dark: colors.errorDark,
    },
    warning: {
      main: colors.warning,
      light: colors.warningLight,
      dark: colors.warningDark,
    },
    info: {
      main: colors.info,
      light: colors.infoLight,
      dark: colors.infoDark,
    },
    success: {
      main: colors.success,
      light: colors.successLight,
      dark: colors.successDark,
    },
    background: {
      default: colors.background,
      paper: colors.paper,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
      disabled: colors.textDisabled,
    },
    divider: colors.divider,
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
      focus: 'rgba(0, 0, 0, 0.12)',
    },
  },
  typography,
  shadows,
  shape: {
    borderRadius: 4,
  },
  spacing: 8,
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  components: componentOverrides,
});

// ── Dark Theme ──────────────────────────────────────────────────────────

export const DarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: darkColors.primary,
      light: darkColors.primaryLight,
      dark: darkColors.primaryDark,
      contrastText: darkColors.contrastText,
    },
    secondary: {
      main: darkColors.secondary,
      light: darkColors.secondaryLight,
      dark: darkColors.secondaryDark,
      contrastText: darkColors.contrastText,
    },
    error: {
      main: darkColors.error,
      light: colors.errorLight,
      dark: colors.error,
    },
    warning: {
      main: darkColors.warning,
      light: colors.warningLight,
      dark: colors.warning,
    },
    info: {
      main: darkColors.info,
      light: colors.infoLight,
      dark: colors.info,
    },
    success: {
      main: darkColors.success,
      light: colors.successLight,
      dark: colors.success,
    },
    background: {
      default: darkColors.background,
      paper: darkColors.paper,
    },
    text: {
      primary: darkColors.textPrimary,
      secondary: darkColors.textSecondary,
      disabled: darkColors.textDisabled,
    },
    divider: darkColors.divider,
    action: {
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
      focus: 'rgba(255, 255, 255, 0.12)',
    },
  },
  typography,
  shadows,
  shape: {
    borderRadius: 4,
  },
  spacing: 8,
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  components: {
    ...componentOverrides,
    MuiPaper: {
      ...componentOverrides.MuiPaper,
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
          transition: 'box-shadow 200ms ease-out, background-color 200ms ease-out',
        },
      },
    },
    MuiCard: {
      ...componentOverrides.MuiCard,
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: 'none',
          transition: 'box-shadow 200ms ease-out',
        },
      },
    },
    MuiAppBar: {
      ...componentOverrides.MuiAppBar,
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        },
      },
    },
  },
});
