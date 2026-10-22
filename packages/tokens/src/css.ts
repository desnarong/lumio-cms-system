import {
  colors,
  fonts,
  layout,
  motion,
  onColors,
  overlays,
  radius,
  shadow,
  spacing,
  typography,
  zIndex,
} from './tokens.js';

const toKebab = (value: string): string =>
  value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Flattens a nested token object into `--prefix-key: value` pairs. */
export const flattenTokens = (
  input: Record<string, unknown>,
  prefix = '',
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    const name = prefix ? `${prefix}-${toKebab(key)}` : toKebab(key);
    if (value !== null && typeof value === 'object') {
      Object.assign(out, flattenTokens(value as Record<string, unknown>, name));
    } else {
      out[name] = String(value);
    }
  }
  return out;
};

/** Semantic layer: components reference these, never the raw brand ramp. */
export const semanticColorVars: Record<string, string> = {
  'color-primary': colors.brand[500],
  'color-primary-hover': colors.brand[600],
  'color-primary-active': colors.brand[700],
  'color-accent': colors.accent[500],
  'color-bg': colors.light.bg,
  'color-surface': colors.light.surface,
  'color-surface-hover': colors.light.surfaceHover,
  'color-border': colors.light.border,
  'color-text': colors.light.text,
  'color-text-muted': colors.light.textMuted,
  'color-success': colors.status.success,
  'color-warning': colors.status.warning,
  'color-danger': colors.status.danger,
  'color-info': colors.status.info,
  'color-success-soft': colors.statusSoft.success,
  'color-warning-soft': colors.statusSoft.warning,
  'color-danger-soft': colors.statusSoft.danger,
  'color-info-soft': colors.statusSoft.info,
  'color-on-primary': onColors.primary,
  'color-on-danger': onColors.danger,
  'color-on-accent': onColors.accent,
  'color-overlay': overlays.scrim,
  'color-focus-ring': overlays.focusRing,
};

export const darkColorVars: Record<string, string> = {
  'color-bg': colors.dark.bg,
  'color-surface': colors.dark.surface,
  'color-surface-hover': colors.dark.surfaceHover,
  'color-border': colors.dark.border,
  'color-text': colors.dark.text,
  'color-text-muted': colors.dark.textMuted,
};

/** Emits `--text-<key>` (font-size) and `--text-<key>-line-height` pairs. */
export const typographyVars: Record<string, string> = Object.entries(typography).reduce<
  Record<string, string>
>((out, [key, value]) => {
  out[`text-${key}`] = value.size;
  out[`text-${key}-line-height`] = value.lineHeight;
  return out;
}, {});

export const zIndexVars: Record<string, string> = flattenTokens(zIndex, 'z');

const renderVars = (vars: Record<string, string>, indent = '  '): string =>
  Object.entries(vars)
    .map(([name, value]) => `${indent}--${name}: ${value};`)
    .join('\n');

/** Single source of truth for `theme.css` (kept in sync by a test). */
export const buildThemeCss = (): string => {
  const structural: Record<string, string> = {
    ...flattenTokens(spacing, 'space'),
    ...flattenTokens(radius, 'radius'),
    ...flattenTokens(shadow, 'shadow'),
    ...flattenTokens(motion, 'motion'),
    ...typographyVars,
    ...flattenTokens(fonts, 'font'),
    ...zIndexVars,
    ...flattenTokens(layout, 'layout'),
    ...semanticColorVars,
  };

  return [
    ':root {',
    renderVars(structural),
    '}',
    '',
    '[data-theme="dark"] {',
    renderVars(darkColorVars),
    '}',
    '',
    '/* Sites that follow the visitor: `colorMode: "auto"` in their theme tokens. */',
    '@media (prefers-color-scheme: dark) {',
    '  [data-color-mode="auto"] {',
    renderVars(darkColorVars, '    '),
    '  }',
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  *,',
    '  *::before,',
    '  *::after {',
    '    animation-duration: 0.01ms !important;',
    '    transition-duration: 0.01ms !important;',
    '  }',
    '}',
    '',
  ].join('\n');
};
