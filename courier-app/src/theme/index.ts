/**
 * Courier / Driver App Design System Theme Tokens
 * Strictly aligned with Stitch Project #8230467423897289561
 */

export const colors = {
  // Brand Charcoal Black (الأسود الفحمي)
  primary: '#181A1E',
  primaryContainer: '#262930',
  primaryFixed: '#E4E7EC',
  primaryFixedDim: '#D0D5DD',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#F4F5F7',
  onPrimaryFixed: '#181A1E',

  // Secondary Steel & Slate Charcoal (تنسيقات متنوعة متناسقة)
  secondary: '#363D47',
  secondaryContainer: '#EAECEF',
  secondaryFixed: '#DFE2E6',
  secondaryFixedDim: '#CBD0D7',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#181A1E',

  // Tertiary Graphite / Silver Accents
  tertiary: '#2C323B',
  tertiaryContainer: '#ECEEF1',
  tertiaryFixed: '#DFE2E7',
  tertiaryFixedDim: '#CBD0D6',
  onTertiary: '#FFFFFF',

  // Canvas & Surfaces - Light Silver / Gray Background (غير معتم وخفيف)
  background: '#F4F5F7',
  surface: '#F4F5F7',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EFF1F4',
  surfaceContainer: '#E8EBEF',
  surfaceContainerHigh: '#DFE3E8',
  surfaceContainerHighest: '#D4D9E0',

  // High contrast crisp Charcoal typography
  onSurface: '#111317',
  onSurfaceVariant: '#4E5564',
  outline: '#8891A0',
  outlineVariant: '#DDE1E7',

  // Feedback & Functional Statuses
  error: '#EF4444',
  errorContainer: '#FEE2E2',
  onError: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
};

export const typography = {
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    hero: 26,
    display: 32,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};

export const spacing = {
  base2xs: 4,
  baseXs: 8,
  baseSm: 12,
  baseMd: 16,
  baseLg: 20,
  baseXl: 24,
  base2xl: 32,
  screenGutter: 16,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  header: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
};
