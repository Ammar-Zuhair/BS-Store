/**
 * BS Store Customer App Design System Theme Tokens
 * Shared visual tokens for the BS Store customer app.
 * BS Store customer palette: monochrome black, gray, and white surfaces.
 */

export const lightColors = {
  // Monochrome primary actions and soft gray containers
  primary: '#202020',
  primaryContainer: '#E8E8E8',
  primaryFixed: '#E0E0E0',
  primaryFixedDim: '#CECECE',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#202020',
  onPrimaryFixed: '#202020',
  onPrimaryFixedVariant: '#404040',

  // Supporting neutral grays
  secondary: '#555555',
  secondaryContainer: '#EEEEEE',
  secondaryFixed: '#E3E3E3',
  secondaryFixedDim: '#D2D2D2',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#242424',
  onSecondaryFixed: '#242424',
  onSecondaryFixedVariant: '#4A4A4A',

  // Quiet gray for secondary emphasis
  tertiary: '#666666',
  tertiaryContainer: '#EFEFEF',
  tertiaryFixed: '#E4E4E4',
  tertiaryFixedDim: '#D5D5D5',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#292929',
  onTertiaryFixed: '#292929',
  onTertiaryFixedVariant: '#4E4E4E',

  // Clean white and cool gray surfaces
  background: '#F7F7F7',
  surface: '#F7F7F7',
  surfaceBright: '#FFFFFF',
  surfaceDim: '#E5E5E5',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F0F0F0',
  surfaceContainer: '#EAEAEA',
  surfaceContainerHigh: '#E1E1E1',
  surfaceContainerHighest: '#D6D6D6',
  surfaceVariant: '#EAEAEA',

  // Black typography with accessible gray secondary text
  onSurface: '#171717',
  onSurfaceVariant: '#555555',
  onBackground: '#171717',
  outline: '#777777',
  outlineVariant: '#D7D7D7',

  // Feedback & Functional Statuses
  error: '#B9383E',
  errorContainer: '#FCE7E7',
  onError: '#FFFFFF',
  onErrorContainer: '#7F252A',
  success: '#18764F',
  warning: '#98540C',
  info: '#346B8B',
};

export const darkColors = {
  // Invert the neutral action for contrast on dark surfaces
  primary: '#F0F0F0',
  primaryContainer: '#3B3B3B',
  primaryFixed: '#4A4A4A',
  primaryFixedDim: '#5C5C5C',
  onPrimary: '#171717',
  onPrimaryContainer: '#F0F0F0',
  onPrimaryFixed: '#FFFFFF',
  onPrimaryFixedVariant: '#D8D8D8',

  // Neutral gray support colors
  secondary: '#C7C7C7',
  secondaryContainer: '#383838',
  secondaryFixed: '#484848',
  secondaryFixedDim: '#595959',
  onSecondary: '#1D1D1D',
  onSecondaryContainer: '#EEEEEE',
  onSecondaryFixed: '#FFFFFF',
  onSecondaryFixedVariant: '#D0D0D0',

  // Quiet light gray emphasis
  tertiary: '#D0D0D0',
  tertiaryContainer: '#3A3A3A',
  tertiaryFixed: '#4A4A4A',
  tertiaryFixedDim: '#5A5A5A',
  onTertiary: '#1D1D1D',
  onTertiaryContainer: '#F0F0F0',
  onTertiaryFixed: '#FFFFFF',
  onTertiaryFixedVariant: '#D6D6D6',

  // Deep neutral surfaces
  background: '#151515',
  surface: '#151515',
  surfaceBright: '#242424',
  surfaceDim: '#101010',
  surfaceContainerLowest: '#202020',
  surfaceContainerLow: '#282828',
  surfaceContainer: '#303030',
  surfaceContainerHigh: '#393939',
  surfaceContainerHighest: '#444444',
  surfaceVariant: '#303030',

  // High contrast light typography on dark surfaces
  onSurface: '#F3F3F3',
  onSurfaceVariant: '#C4C4C4',
  onBackground: '#F3F3F3',
  outline: '#929292',
  outlineVariant: '#484848',

  // Feedback & Functional Statuses
  error: '#FF8B8F',
  errorContainer: '#54282A',
  onError: '#FFFFFF',
  onErrorContainer: '#FFDADC',
  success: '#78D2A7',
  warning: '#D0D0D0',
  info: '#91C9E4',
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
