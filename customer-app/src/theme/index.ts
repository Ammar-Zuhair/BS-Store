/**
 * BS Store Customer App Design System Theme Tokens
 * Shared visual tokens for the BS Store customer app.
 * Fresh market greens, warm amber accents, and calm light/dark surfaces.
 */

export const lightColors = {
  // Market green
  primary: '#176B56',
  primaryContainer: '#E3F1EB',
  primaryFixed: '#D2EAE0',
  primaryFixedDim: '#B8DDCE',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#17483B',
  onPrimaryFixed: '#153D32',
  onPrimaryFixedVariant: '#235D4C',

  // Supporting evergreen and slate
  secondary: '#40564C',
  secondaryContainer: '#E9EFEB',
  secondaryFixed: '#DDE7E1',
  secondaryFixedDim: '#C8D8CF',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#24392F',
  onSecondaryFixed: '#1D332A',
  onSecondaryFixedVariant: '#40564C',

  // Warm amber for deals and small highlights
  tertiary: '#A85C0A',
  tertiaryContainer: '#FFF1D8',
  tertiaryFixed: '#F9DFAF',
  tertiaryFixedDim: '#F3CD8A',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#693709',
  onTertiaryFixed: '#4A2707',
  onTertiaryFixedVariant: '#81450A',

  // Warm, quiet neutral surfaces
  background: '#F6F8F5',
  surface: '#F6F8F5',
  surfaceBright: '#FFFFFF',
  surfaceDim: '#E5EAE6',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F0F4F0',
  surfaceContainer: '#E9EFEB',
  surfaceContainerHigh: '#DFE7E1',
  surfaceContainerHighest: '#D4DED7',
  surfaceVariant: '#E9EFEB',

  // Readable forest-charcoal typography
  onSurface: '#17231D',
  onSurfaceVariant: '#536259',
  onBackground: '#17231D',
  outline: '#78877D',
  outlineVariant: '#D9E2DC',

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
  // Bright green stays legible as the main action in dark mode
  primary: '#75D0AD',
  primaryContainer: '#1B4C3B',
  primaryFixed: '#235B47',
  primaryFixedDim: '#2D7058',
  onPrimary: '#12372B',
  onPrimaryContainer: '#D7F2E5',
  onPrimaryFixed: '#E3F6EC',
  onPrimaryFixedVariant: '#B4E6D0',

  // Supporting sage and slate
  secondary: '#B8C8BE',
  secondaryContainer: '#26352E',
  secondaryFixed: '#304238',
  secondaryFixedDim: '#3B5045',
  onSecondary: '#152019',
  onSecondaryContainer: '#E1ECE5',
  onSecondaryFixed: '#E7F0EA',
  onSecondaryFixedVariant: '#C9D9CF',

  // Amber remains a small highlight, not a second primary
  tertiary: '#F1B45D',
  tertiaryContainer: '#4E3518',
  tertiaryFixed: '#68471D',
  tertiaryFixedDim: '#805923',
  onTertiary: '#34220B',
  onTertiaryContainer: '#FBE6C3',
  onTertiaryFixed: '#FFF0D8',
  onTertiaryFixedVariant: '#F3D09A',

  // Deep evergreen-charcoal surfaces
  background: '#111914',
  surface: '#111914',
  surfaceBright: '#1B261F',
  surfaceDim: '#0B100D',
  surfaceContainerLowest: '#18221C',
  surfaceContainerLow: '#1E2A23',
  surfaceContainer: '#24322A',
  surfaceContainerHigh: '#2B3A31',
  surfaceContainerHighest: '#34443A',
  surfaceVariant: '#24322A',

  // Calm, high-contrast typography
  onSurface: '#F0F5F1',
  onSurfaceVariant: '#BCC9C0',
  onBackground: '#F0F5F1',
  outline: '#84958A',
  outlineVariant: '#34443A',

  // Feedback & Functional Statuses
  error: '#FF8B8F',
  errorContainer: '#54282A',
  onError: '#FFFFFF',
  onErrorContainer: '#FFDADC',
  success: '#78D2A7',
  warning: '#F1B45D',
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
