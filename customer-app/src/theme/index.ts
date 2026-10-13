/**
 * BS Store Customer App Design System Theme Tokens
 * Shared visual tokens for the BS Store customer app.
 * BS Store customer palette: monochrome black, gray, and white surfaces.
 */

export const lightColors = {
  // Monochrome primary actions and soft gray containers
  primary: '#111827',
  primaryContainer: '#E2E8F0',
  primaryFixed: '#E0E0E0',
  primaryFixedDim: '#CECECE',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#111827',
  onPrimaryFixed: '#111827',
  onPrimaryFixedVariant: '#334155',

  // Supporting neutral grays and silver
  secondary: '#475569',
  secondaryContainer: '#F1F5F9',
  secondaryFixed: '#E2E8F0',
  secondaryFixedDim: '#CBD5E1',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#1E293B',
  onSecondaryFixed: '#1E293B',
  onSecondaryFixedVariant: '#475569',

  // Quiet gray for secondary emphasis
  tertiary: '#64748B',
  tertiaryContainer: '#F8FAFC',
  tertiaryFixed: '#E2E8F0',
  tertiaryFixedDim: '#CBD5E1',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#1E293B',
  onTertiaryFixed: '#1E293B',
  onTertiaryFixedVariant: '#475569',

  // Clean silver-platinum and cool translucent surfaces
  background: 'transparent',
  surface: 'rgba(255, 255, 255, 0.85)',
  surfaceBright: '#FFFFFF',
  surfaceDim: '#E2E8F0',
  surfaceContainerLowest: 'rgba(255, 255, 255, 0.92)',
  surfaceContainerLow: 'rgba(248, 250, 252, 0.88)',
  surfaceContainer: 'rgba(241, 245, 249, 0.92)',
  surfaceContainerHigh: 'rgba(226, 232, 240, 0.95)',
  surfaceContainerHighest: '#CBD5E1',
  surfaceVariant: 'rgba(241, 245, 249, 0.90)',

  // Black typography with accessible gray secondary text
  onSurface: '#0F172A',
  onSurfaceVariant: '#475569',
  onBackground: '#0F172A',
  outline: '#64748B',
  outlineVariant: '#CBD5E1',

  // Luxury Silver & Black Accents
  silver: '#94A3B8',
  silverGlow: 'rgba(148, 163, 184, 0.20)',
  silverMuted: '#64748B',
  accentGlow: '#0F172A',
  cardGlass: 'rgba(255, 255, 255, 0.92)',

  // Solid & Modal Surfaces (Opaque non-transparent)
  sheetBackground: '#FFFFFF',
  modalWindowBg: '#F8FAFC',
  surfaceSolid: '#FFFFFF',
  surfaceSolidLow: '#F8FAFC',
  surfaceSolidHigh: '#F1F5F9',
  cardBorder: 'rgba(203, 213, 225, 0.60)',
  tileBackground: 'rgba(241, 245, 249, 0.85)',
  tileBorder: 'rgba(203, 213, 225, 0.50)',
  iconBadgeBg: 'rgba(17, 24, 39, 0.06)',

  // Feedback & Functional Statuses
  error: '#DC2626',
  errorContainer: '#FEE2E2',
  onError: '#FFFFFF',
  onErrorContainer: '#991B1B',
  success: '#10B981',
  warning: '#D97706',
  info: '#2563EB',
};

export const darkColors = {
  // Invert the neutral action for contrast on dark surfaces
  primary: '#F1F5F9',
  primaryContainer: '#1E293B',
  primaryFixed: '#334155',
  primaryFixedDim: '#475569',
  onPrimary: '#0A0D12',
  onPrimaryContainer: '#F1F5F9',
  onPrimaryFixed: '#FFFFFF',
  onPrimaryFixedVariant: '#E2E8F0',

  // Neutral gray & metallic silver support colors
  secondary: '#CBD5E1',
  secondaryContainer: '#1E293B',
  secondaryFixed: '#334155',
  secondaryFixedDim: '#475569',
  onSecondary: '#0A0D12',
  onSecondaryContainer: '#F8FAFC',
  onSecondaryFixed: '#FFFFFF',
  onSecondaryFixedVariant: '#E2E8F0',

  // Quiet light silver emphasis
  tertiary: '#94A3B8',
  tertiaryContainer: '#1E293B',
  tertiaryFixed: '#334155',
  tertiaryFixedDim: '#475569',
  onTertiary: '#0A0D12',
  onTertiaryContainer: '#F1F5F9',
  onTertiaryFixed: '#FFFFFF',
  onTertiaryFixedVariant: '#E2E8F0',

  // Deep obsidian & silver glass surfaces
  background: 'transparent',
  surface: 'rgba(13, 17, 23, 0.78)',
  surfaceBright: '#1E293B',
  surfaceDim: '#080A0E',
  surfaceContainerLowest: 'rgba(18, 24, 34, 0.82)',
  surfaceContainerLow: 'rgba(24, 31, 44, 0.78)',
  surfaceContainer: 'rgba(30, 39, 54, 0.85)',
  surfaceContainerHigh: 'rgba(40, 51, 70, 0.88)',
  surfaceContainerHighest: '#475569',
  surfaceVariant: 'rgba(24, 31, 44, 0.80)',

  // High contrast light typography on dark surfaces
  onSurface: '#F8FAFC',
  onSurfaceVariant: '#94A3B8',
  onBackground: '#F8FAFC',
  outline: '#94A3B8',
  outlineVariant: '#334155',

  // Luxury Silver & Black Accents
  silver: '#CBD5E1',
  silverGlow: 'rgba(203, 213, 225, 0.22)',
  silverMuted: '#64748B',
  accentGlow: '#FFFFFF',
  cardGlass: 'rgba(18, 24, 34, 0.82)',

  // Solid & Modal Surfaces (Opaque non-transparent)
  sheetBackground: '#0F141E',
  modalWindowBg: '#080A0E',
  surfaceSolid: '#0F141E',
  surfaceSolidLow: '#0B0E17',
  surfaceSolidHigh: '#1A2234',
  cardBorder: 'rgba(203, 213, 225, 0.15)',
  tileBackground: 'rgba(24, 32, 47, 0.75)',
  tileBorder: 'rgba(203, 213, 225, 0.15)',
  iconBadgeBg: 'rgba(203, 213, 225, 0.12)',

  // Feedback & Functional Statuses
  error: '#EF4444',
  errorContainer: '#451A1A',
  onError: '#FFFFFF',
  onErrorContainer: '#FECACA',
  success: '#34D399',
  warning: '#FBBF24',
  info: '#60A5FA',
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
    display: 32,
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
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  section: 28,
};

export const borderRadius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 9999,
};

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
};

export const motion = {
  press: 120,
  fast: 160,
  standard: 220,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.055,
    shadowRadius: 6,
    elevation: 1,
  },
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
};
