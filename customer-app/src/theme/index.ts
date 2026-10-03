/**
 * BS Store Customer App Design System Theme Tokens
 * Shared visual tokens for the BS Store customer app.
 * BS Store brand palette: charcoal ink, warm gold, and calm light/dark surfaces.
 */

export const lightColors = {
  // Warm gold inspired by the BS Store emblem
  primary: '#80520A',
  primaryContainer: '#F6E9CF',
  primaryFixed: '#F1DCA9',
  primaryFixedDim: '#E7C77D',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#4F3105',
  onPrimaryFixed: '#3D2908',
  onPrimaryFixedVariant: '#60410B',

  // Charcoal ink from the logo, with warm neutral containers
  secondary: '#39332B',
  secondaryContainer: '#EEEAE3',
  secondaryFixed: '#E4DED3',
  secondaryFixedDim: '#D3CABB',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#302920',
  onSecondaryFixed: '#28231D',
  onSecondaryFixedVariant: '#51483C',

  // Copper accent for highlights and offers
  tertiary: '#A85E18',
  tertiaryContainer: '#F9EBDD',
  tertiaryFixed: '#F2D7BC',
  tertiaryFixedDim: '#E7C09A',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#65350C',
  onTertiaryFixed: '#482509',
  onTertiaryFixedVariant: '#783F10',

  // Warm, quiet neutral surfaces
  background: '#F8F6F2',
  surface: '#F8F6F2',
  surfaceBright: '#FFFFFF',
  surfaceDim: '#E8E3DA',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F2EFE9',
  surfaceContainer: '#ECE8E0',
  surfaceContainerHigh: '#E5DFD4',
  surfaceContainerHighest: '#DAD2C5',
  surfaceVariant: '#ECE8E0',

  // Readable charcoal typography
  onSurface: '#211E19',
  onSurfaceVariant: '#625B50',
  onBackground: '#211E19',
  outline: '#81786B',
  outlineVariant: '#DED8CE',

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
  // Gold remains the main action against deep charcoal surfaces
  primary: '#E8BD68',
  primaryContainer: '#594014',
  primaryFixed: '#684B1B',
  primaryFixedDim: '#805D24',
  onPrimary: '#332307',
  onPrimaryContainer: '#F8E9C8',
  onPrimaryFixed: '#FFF3D8',
  onPrimaryFixedVariant: '#E9CD91',

  // Warm neutral ink
  secondary: '#D0C6B5',
  secondaryContainer: '#39342C',
  secondaryFixed: '#474035',
  secondaryFixedDim: '#5B5142',
  onSecondary: '#28231C',
  onSecondaryContainer: '#EEE7DA',
  onSecondaryFixed: '#F4EDE0',
  onSecondaryFixedVariant: '#D4C9B8',

  // Muted copper for secondary highlights
  tertiary: '#E7AD70',
  tertiaryContainer: '#50351F',
  tertiaryFixed: '#674527',
  tertiaryFixedDim: '#805832',
  onTertiary: '#39210C',
  onTertiaryContainer: '#F8E5D2',
  onTertiaryFixed: '#FFF0E2',
  onTertiaryFixedVariant: '#F0C99F',

  // Deep charcoal surfaces with a warm undertone
  background: '#171512',
  surface: '#171512',
  surfaceBright: '#25211B',
  surfaceDim: '#100F0D',
  surfaceContainerLowest: '#211E19',
  surfaceContainerLow: '#29251F',
  surfaceContainer: '#302C25',
  surfaceContainerHigh: '#39342C',
  surfaceContainerHighest: '#443E34',
  surfaceVariant: '#302C25',

  // Calm, high-contrast typography
  onSurface: '#F4F0E8',
  onSurfaceVariant: '#C9C0B2',
  onBackground: '#F4F0E8',
  outline: '#938A7B',
  outlineVariant: '#494237',

  // Feedback & Functional Statuses
  error: '#FF8B8F',
  errorContainer: '#54282A',
  onError: '#FFFFFF',
  onErrorContainer: '#FFDADC',
  success: '#78D2A7',
  warning: '#E8BD68',
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
