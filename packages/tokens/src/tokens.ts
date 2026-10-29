/** Design tokens from docs/design/06-design-system.md. Components must never hard-code values. */

export const colors = {
  brand: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  accent: {
    500: '#F472B6',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  },
  statusSoft: {
    success: '#ECFDF5',
    warning: '#FFFBEB',
    danger: '#FEF2F2',
    info: '#EFF6FF',
  },
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
  },
  dark: {
    bg: '#0B1020',
    surface: '#131A2E',
    surfaceHover: '#1B2440',
    border: '#243049',
    text: '#E8ECF6',
    textMuted: '#94A3B8',
  },
} as const;

/** Text colour that stays readable on top of each solid brand surface. */
export const onColors = {
  primary: '#FFFFFF',
  danger: '#FFFFFF',
  accent: '#0F172A',
} as const;

export const overlays = {
  scrim: 'rgba(15, 23, 42, 0.5)',
  focusRing: 'rgba(99, 102, 241, 0.45)',
} as const;

export const gradients = {
  ai: 'linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #F472B6 100%)',
} as const;

export const spacing = {
  none: '0px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const;

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '20px',
  full: '999px',
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
  md: '0 8px 24px rgba(15, 23, 42, 0.08)',
  lg: '0 20px 48px rgba(15, 23, 42, 0.14)',
} as const;

export const typography = {
  xs: { size: '12px', lineHeight: '1.5' },
  sm: { size: '14px', lineHeight: '1.6' },
  base: { size: '16px', lineHeight: '1.6' },
  lg: { size: '20px', lineHeight: '1.6' },
  xl: { size: '24px', lineHeight: '1.5' },
  '2xl': { size: '32px', lineHeight: '1.4' },
  '3xl': { size: '40px', lineHeight: '1.3' },
  '4xl': { size: '56px', lineHeight: '1.15' },
  '5xl': { size: '72px', lineHeight: '1.1' },
} as const;

export const fonts = {
  ui: "'Noto Sans Thai', 'IBM Plex Sans Thai', Inter, system-ui, sans-serif",
  display: "'Plus Jakarta Sans', 'Prompt', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const motion = {
  ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  durationFast: '150ms',
  durationBase: '200ms',
  durationSlow: '250ms',
} as const;

export const zIndex = {
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  toast: 1400,
  tooltip: 1500,
} as const;

export const layout = {
  sidebarWidth: '240px',
  sidebarCollapsedWidth: '72px',
  contentMaxWidth: '1200px',
  wideMaxWidth: '1728px',
  /** Back office: desktop-only floor and the width its content column grows to. */
  adminMinWidth: '1024px',
  adminMaxWidth: '1440px',
  topbarHeight: '64px',
  /** Smallest comfortable touch target on the public site (WCAG 2.5.5). */
  tapTarget: '44px',
  controlHeightSm: '32px',
  controlHeightMd: '40px',
  controlHeightLg: '48px',
} as const;

export type ColorTokens = typeof colors;
export type SpacingTokens = typeof spacing;
export type TypographyTokens = typeof typography;
export type ZIndexTokens = typeof zIndex;
