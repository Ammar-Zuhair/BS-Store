/**
 * BS Store Customer App Design System Theme Tokens
 * Supports Dynamic Light & Dark Mode with Persian/Charcoal Grey Palette
 */

export const lightColors = {
  // Brand Charcoal Black
  primary: '#181A1E',
  primaryContainer: '#262930',
  primaryFixed: '#E4E7EC',
  primaryFixedDim: '#D0D5DD',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#F4F5F7',
  onPrimaryFixed: '#181A1E',
  onPrimaryFixedVariant: '#262930',

  // Secondary Steel & Slate Charcoal
  secondary: '#363D47',
  secondaryContainer: '#EAECEF',
  secondaryFixed: '#DFE2E6',
  secondaryFixedDim: '#CBD0D7',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#181A1E',
  onSecondaryFixed: '#181A1E',
  onSecondaryFixedVariant: '#363D47',

  // Tertiary Amber / Warm Orange
  tertiary: '#D97706',
  tertiaryContainer: '#FEF3C7',
  tertiaryFixed: '#FDE68A',
  tertiaryFixedDim: '#FCD34D',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#92400E',
  onTertiaryFixed: '#78350F',
  onTertiaryFixedVariant: '#B45309',

  // Canvas & Surfaces - Light Silver / Gray Background
  background: '#F4F5F7',
  surface: '#F4F5F7',
  surfaceBright: '#FFFFFF',
  surfaceDim: '#E5E7EB',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EFF1F4',
  surfaceContainer: '#E8EBEF',
  surfaceContainerHigh: '#DFE3E8',
  surfaceContainerHighest: '#D4D9E0',
  surfaceVariant: '#E8EBEF',

  // High contrast crisp Charcoal typography
  onSurface: '#111317',
  onSurfaceVariant: '#4E5564',
  onBackground: '#111317',
  outline: '#8891A0',
  outlineVariant: '#DDE1E7',

  // Feedback & Functional Statuses
  error: '#EF4444',
  errorContainer: '#FEE2E2',
  onError: '#FFFFFF',
  onErrorContainer: '#991B1B',
  success: '#10B981',
  warning: '#F59E0B',
};

export const darkColors = {
  // Brand Charcoal & Amber Accent
  primary: '#F59E0B',
  primaryContainer: '#262A32',
  primaryFixed: '#2E333F',
  primaryFixedDim: '#3D4454',
  onPrimary: '#111317',
  onPrimaryContainer: '#F9FAFB',
  onPrimaryFixed: '#F9FAFB',
  onPrimaryFixedVariant: '#E5E7EB',

  // Secondary Slate
  secondary: '#9CA3AF',
  secondaryContainer: '#1F232B',
  secondaryFixed: '#282D37',
  secondaryFixedDim: '#323946',
  onSecondary: '#111317',
  onSecondaryContainer: '#F3F4F6',
  onSecondaryFixed: '#F9FAFB',
  onSecondaryFixedVariant: '#D1D5DB',

  // Tertiary Amber / Warm Orange
  tertiary: '#F59E0B',
  tertiaryContainer: '#451A03',
  tertiaryFixed: '#78350F',
  tertiaryFixedDim: '#92400E',
  onTertiary: '#111317',
  onTertiaryContainer: '#FEF3C7',
  onTertiaryFixed: '#FEF3C7',
  onTertiaryFixedVariant: '#FDE68A',

  // Canvas & Surfaces - Deep Charcoal Dark
  background: '#0D0E11',
  surface: '#0D0E11',
  surfaceBright: '#181A1E',
  surfaceDim: '#08090B',
  surfaceContainerLowest: '#181A1E',
  surfaceContainerLow: '#1F232B',
  surfaceContainer: '#252932',
  surfaceContainerHigh: '#2C313C',
  surfaceContainerHighest: '#343A47',
  surfaceVariant: '#1F232B',

  // Typography - High Contrast Crisp White / Silver
  onSurface: '#F9FAFB',
  onSurfaceVariant: '#9CA3AF',
  onBackground: '#F9FAFB',
  outline: '#6B7280',
  outlineVariant: '#262A32',

  // Feedback & Functional Statuses
  error: '#EF4444',
  errorContainer: '#450A0A',
  onError: '#FFFFFF',
  onErrorContainer: '#FCA5A5',
  success: '#10B981',
  warning: '#F59E0B',
};

export type ThemeColors = typeof lightColors;

// Mutating in-place so all direct static imports immediately reflect the active theme
export const colors: ThemeColors = { ...lightColors };

let currentMode: 'light' | 'dark' = 'light';

export const setGlobalThemeMode = (mode: 'light' | 'dark') => {
  currentMode = mode;
  Object.assign(colors, mode === 'dark' ? darkColors : lightColors);
};

export const getThemeColors = (isDark: boolean): ThemeColors => (isDark ? darkColors : lightColors);

export const typography = {
  fontFamily: {
    regular: 'Tajawal_400Regular',
    medium: 'Tajawal_500Medium',
    bold: 'Tajawal_700Bold',
    extraBold: 'Tajawal_800ExtraBold',
    black: 'Tajawal_900Black',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 28,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
    black: '900' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    lg: 24,
  },
};

export const spacing = {
  baseXs: 4,
  baseSm: 8,
  baseMd: 16,
  baseLg: 24,
  baseXl: 32,
  screenGutter: 16,
};

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  header: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
};
