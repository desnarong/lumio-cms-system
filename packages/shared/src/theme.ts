import { z } from 'zod';

/**
 * Design tokens a site owner can change from the Design Panel
 * (docs/design/08-theme-design-panel.md 8.1). Blocks only ever read tokens, so
 * swapping a template or a brand colour never requires touching content.
 */

export const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'สีต้องอยู่ในรูป #RRGGBB');

export const THEME_RADIUS_SCALES = ['none', 'sm', 'md', 'lg', 'xl', 'full'] as const;
export type ThemeRadiusScale = (typeof THEME_RADIUS_SCALES)[number];

export const THEME_BUTTON_STYLES = ['solid', 'outline', 'soft', 'gradient'] as const;
export type ThemeButtonStyle = (typeof THEME_BUTTON_STYLES)[number];

export const THEME_DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
export type ThemeDensity = (typeof THEME_DENSITIES)[number];

export const THEME_COLOR_MODES = ['light', 'dark', 'auto'] as const;
export type ThemeColorMode = (typeof THEME_COLOR_MODES)[number];

export const THEME_ANIMATIONS = ['none', 'soft', 'bold'] as const;
export type ThemeAnimation = (typeof THEME_ANIMATIONS)[number];

export interface ThemeTokens {
  colors: { primary: string; accent: string; neutral: string };
  fonts: { heading: string; body: string };
  radius: ThemeRadiusScale;
  button: ThemeButtonStyle;
  density: ThemeDensity;
  colorMode: ThemeColorMode;
  animation: ThemeAnimation;
}

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  // Indigo 600: white text on it passes WCAG AA out of the box.
  colors: { primary: '#4F46E5', accent: '#F472B6', neutral: 'slate' },
  fonts: { heading: 'Plus Jakarta Sans', body: 'Noto Sans Thai' },
  radius: 'md',
  button: 'solid',
  density: 'comfortable',
  colorMode: 'auto',
  animation: 'soft',
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const pickEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const pickText = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

/**
 * Stored tokens used to contain whole stacks such as
 * `"'Noto Sans Thai', 'Inter', sans-serif"`. Keep only the chosen family so the
 * panel can match it and `fontStack` does not wrap the whole stack in quotes.
 */
const pickFont = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const first = value.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  return first.length > 0 ? first : fallback;
};

const pickColor = (value: unknown, fallback: string): string => {
  const parsed = hexColorSchema.safeParse(value);
  return parsed.success ? parsed.data.toUpperCase() : fallback;
};

/**
 * Reads stored tokens. Sites created before the structured shape stored flat
 * keys (`colorBrand`, `colorAccent`, `fontHeading`); those still work and are
 * normalised into the structured shape rather than dropped.
 */
export const normalizeThemeTokens = (raw: unknown): ThemeTokens => {
  const record = asRecord(raw);
  const colors = asRecord(record.colors);
  const fonts = asRecord(record.fonts);

  return {
    colors: {
      primary: pickColor(colors.primary ?? record.colorBrand, DEFAULT_THEME_TOKENS.colors.primary),
      accent: pickColor(colors.accent ?? record.colorAccent, DEFAULT_THEME_TOKENS.colors.accent),
      neutral: pickText(colors.neutral ?? record.colorNeutral, DEFAULT_THEME_TOKENS.colors.neutral),
    },
    fonts: {
      heading: pickFont(fonts.heading ?? record.fontHeading, DEFAULT_THEME_TOKENS.fonts.heading),
      body: pickFont(fonts.body ?? record.fontBody, DEFAULT_THEME_TOKENS.fonts.body),
    },
    radius: pickEnum(record.radius, THEME_RADIUS_SCALES, DEFAULT_THEME_TOKENS.radius),
    button: pickEnum(record.button, THEME_BUTTON_STYLES, DEFAULT_THEME_TOKENS.button),
    density: pickEnum(record.density, THEME_DENSITIES, DEFAULT_THEME_TOKENS.density),
    colorMode: pickEnum(record.colorMode, THEME_COLOR_MODES, DEFAULT_THEME_TOKENS.colorMode),
    animation: pickEnum(record.animation, THEME_ANIMATIONS, DEFAULT_THEME_TOKENS.animation),
  };
};

/** Partial update coming from the Design Panel; unknown keys are ignored. */
export const themeTokensPatchSchema = z.object({
  colors: z
    .object({
      primary: hexColorSchema.optional(),
      accent: hexColorSchema.optional(),
      neutral: z.string().trim().min(1).max(40).optional(),
    })
    .optional(),
  fonts: z
    .object({
      heading: z.string().trim().min(1).max(80).optional(),
      body: z.string().trim().min(1).max(80).optional(),
    })
    .optional(),
  radius: z.enum(THEME_RADIUS_SCALES).optional(),
  button: z.enum(THEME_BUTTON_STYLES).optional(),
  density: z.enum(THEME_DENSITIES).optional(),
  colorMode: z.enum(THEME_COLOR_MODES).optional(),
  animation: z.enum(THEME_ANIMATIONS).optional(),
  /** Flat aliases kept for older clients. */
  colorBrand: hexColorSchema.optional(),
  colorAccent: hexColorSchema.optional(),
  fontHeading: z.string().trim().min(1).max(80).optional(),
  fontBody: z.string().trim().min(1).max(80).optional(),
});
export type ThemeTokensPatch = z.infer<typeof themeTokensPatchSchema>;

/** Merges a patch over whatever the site currently stores. */
export const applyThemeTokensPatch = (current: unknown, patch: ThemeTokensPatch): ThemeTokens => {
  const base = normalizeThemeTokens(current);
  return normalizeThemeTokens({
    ...base,
    ...patch,
    colors: { ...base.colors, ...(patch.colors ?? {}), ...flatColorAliases(patch) },
    fonts: { ...base.fonts, ...(patch.fonts ?? {}), ...flatFontAliases(patch) },
  });
};

const flatColorAliases = (patch: ThemeTokensPatch): Record<string, string> => ({
  ...(patch.colorBrand ? { primary: patch.colorBrand } : {}),
  ...(patch.colorAccent ? { accent: patch.colorAccent } : {}),
});

const flatFontAliases = (patch: ThemeTokensPatch): Record<string, string> => ({
  ...(patch.fontHeading ? { heading: patch.fontHeading } : {}),
  ...(patch.fontBody ? { body: patch.fontBody } : {}),
});

/*
 * Colour maths. A site owner picks one brand colour; the ramp, the hover states
 * and the readable ink on top of it are derived so nothing is ever unreadable
 * (docs/design/08-theme-design-panel.md 8.1).
 */

export const BRAND_RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type BrandRampStep = (typeof BRAND_RAMP_STEPS)[number];
export type BrandRamp = Record<BrandRampStep, string>;

const RAMP_LIGHTNESS: Record<BrandRampStep, number> = {
  50: 96,
  100: 92,
  200: 84,
  300: 73,
  400: 61,
  500: 52,
  600: 44,
  700: 37,
  800: 29,
  900: 22,
};

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export const parseHex = (color: string): { r: number; g: number; b: number } => {
  const value = color.trim().replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : value;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
};

const toHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

export const rgbToHsl = (r: number, g: number, b: number): Hsl => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l: lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return { h: (hue * 60 + 360) % 360, s: saturation, l: lightness };
};

export const hslToHex = ({ h, s, l }: Hsl): string => {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hue = h / 60;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const offset = l - chroma / 2;

  const [r, g, b] =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];

  return toHex((r + offset) * 255, (g + offset) * 255, (b + offset) * 255);
};

/** 50-900 ramp for one brand colour, keeping the picked colour at step 500. */
export const buildBrandRamp = (color: string): BrandRamp => {
  const { r, g, b } = parseHex(color);
  const base = rgbToHsl(r, g, b);
  const ramp = {} as BrandRamp;

  for (const step of BRAND_RAMP_STEPS) {
    const lightness = RAMP_LIGHTNESS[step] / 100;
    // Very light and very dark steps need more saturation to stay visible.
    const saturation =
      step === 500 ? base.s : Math.max(0.12, Math.min(0.95, base.s + (0.5 - lightness) * 0.35));
    ramp[step] = step === 500 ? color.toUpperCase() : hslToHex({ h: base.h, s: saturation, l: lightness });
  }

  return ramp;
};

export const hexToRgba = (color: string, alpha: number): string => {
  const { r, g, b } = parseHex(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const relativeLuminance = (color: string): number => {
  const { r, g, b } = parseHex(color);
  const channel = (value: number): number => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export const contrastRatio = (a: string, b: string): number => {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

const INK_LIGHT = '#FFFFFF';
const INK_DARK = '#0F172A';

/** Dark or light ink, whichever is readable on top of `background`. */
export const readableInk = (background: string): string =>
  contrastRatio(background, INK_LIGHT) >= contrastRatio(background, INK_DARK) ? INK_LIGHT : INK_DARK;

/** True when text on `primary` passes WCAG AA (4.5:1). */
export const isAccessiblePrimary = (primary: string): boolean =>
  contrastRatio(primary, readableInk(primary)) >= 4.5;

/** Darkens a colour until text on it passes WCAG AA (4.5:1). */
export const ensureAccessiblePrimary = (color: string): string => {
  const { r, g, b } = parseHex(color);
  const base = rgbToHsl(r, g, b);

  for (let lightness = base.l; lightness >= 0.12; lightness -= 0.02) {
    const candidate = hslToHex({ h: base.h, s: base.s, l: lightness });
    if (isAccessiblePrimary(candidate)) return candidate;
  }

  return hslToHex({ h: base.h, s: base.s, l: 0.12 });
};

const FALLBACK_DISPLAY = "'Plus Jakarta Sans', 'Prompt', system-ui, sans-serif";
const FALLBACK_UI = "'Noto Sans Thai', 'IBM Plex Sans Thai', Inter, system-ui, sans-serif";

const GENERIC_FAMILIES = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'ui-monospace']);

/** Font stack for a user-chosen family, keeping a Thai-capable fallback. */
export const fontStack = (family: string, role: 'display' | 'ui'): string => {
  const fallback = role === 'display' ? FALLBACK_DISPLAY : FALLBACK_UI;
  const name = family.trim();
  if (name.length === 0) return fallback;

  // A family that already appears in the fallback chain must not be listed twice.
  const existing = fallback.split(',').map((part) => part.trim().replace(/^'|'$/g, ''));
  const families = [...new Set([name, ...existing])];

  return families
    .map((part) => (GENERIC_FAMILIES.has(part) ? part : `'${part}'`))
    .join(', ');
};

const RADIUS_BY_SCALE: Record<ThemeRadiusScale, { sm: string; md: string; lg: string }> = {
  none: { sm: '0px', md: '0px', lg: '0px' },
  sm: { sm: '4px', md: '8px', lg: '12px' },
  md: { sm: '8px', md: '12px', lg: '20px' },
  lg: { sm: '12px', md: '18px', lg: '28px' },
  xl: { sm: '16px', md: '24px', lg: '36px' },
  full: { sm: '999px', md: '999px', lg: '999px' },
};

const DENSITY_SCALE: Record<ThemeDensity, string> = {
  compact: '0.75',
  comfortable: '1',
  spacious: '1.35',
};

const MOTION_BY_ANIMATION: Record<ThemeAnimation, { duration: string; ease: string }> = {
  none: { duration: '1ms', ease: 'linear' },
  soft: { duration: '250ms', ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  bold: { duration: '420ms', ease: 'cubic-bezier(0.34, 1.4, 0.64, 1)' },
};

export const themeCssVariables = (raw: unknown): Record<string, string> => {
  const tokens = normalizeThemeTokens(raw);
  const ramp = buildBrandRamp(tokens.colors.primary);
  const radius = RADIUS_BY_SCALE[tokens.radius];
  const motion = MOTION_BY_ANIMATION[tokens.animation];

  return {
    '--color-primary': ramp[500],
    '--color-primary-hover': ramp[600],
    '--color-primary-active': ramp[700],
    '--color-primary-soft': hexToRgba(tokens.colors.primary, 0.12),
    '--color-accent': tokens.colors.accent,
    '--color-on-primary': readableInk(ramp[500]),
    '--color-on-accent': readableInk(tokens.colors.accent),
    '--color-focus-ring': hexToRgba(tokens.colors.primary, 0.45),
    '--font-display': fontStack(tokens.fonts.heading, 'display'),
    '--font-ui': fontStack(tokens.fonts.body, 'ui'),
    '--radius-sm': radius.sm,
    '--radius-md': radius.md,
    '--radius-lg': radius.lg,
    // Blocks multiply their own padding by this, so one density choice moves
    // the whole site without editing a single block (docs/design/08 8.1).
    '--density-scale': DENSITY_SCALE[tokens.density],
    '--motion-duration-slow': motion.duration,
    '--motion-ease': motion.ease,
  };
};

/** Attributes the public wrapper carries so CSS can react to the site's tokens. */
export const themeDataAttributes = (raw: unknown): Record<string, string> => {
  const tokens = normalizeThemeTokens(raw);
  return {
    'data-color-mode': tokens.colorMode,
    'data-button-style': tokens.button,
    'data-density': tokens.density,
    'data-animation': tokens.animation,
  };
};

/*
 * Wizard step options (docs/design/04-ux.md 4.1 steps 3 and 4).
 */

export const THEME_STYLE_IDS = ['minimal', 'soft', 'bold', 'elegant', 'friendly', 'local'] as const;
export type ThemeStyleId = (typeof THEME_STYLE_IDS)[number];

export const themeStylePresetSchema = z.enum(THEME_STYLE_IDS);

export interface ThemeStylePreset {
  id: ThemeStyleId;
  label: string;
  description: string;
  tokens: ThemeTokensPatch;
}

/** Style cards shown in the wizard: one tap changes fonts, corners and motion. */
export const THEME_STYLE_PRESETS: readonly ThemeStylePreset[] = [
  {
    id: 'minimal',
    label: 'มินิมอล',
    description: 'เรียบ โล่ง อ่านสบาย',
    tokens: {
      fonts: { heading: 'Inter', body: 'Noto Sans Thai' },
      radius: 'sm',
      button: 'outline',
      density: 'spacious',
      animation: 'none',
      colorMode: 'light',
    },
  },
  {
    id: 'soft',
    label: 'นุ่มนวล',
    description: 'มุมโค้ง อบอุ่น เป็นกันเอง',
    tokens: {
      fonts: { heading: 'Prompt', body: 'Noto Sans Thai' },
      radius: 'lg',
      button: 'soft',
      density: 'comfortable',
      animation: 'soft',
      colorMode: 'auto',
    },
  },
  {
    id: 'bold',
    label: 'จัดจ้าน',
    description: 'ตัวหนา ตัดกันชัด เต็มจอ',
    tokens: {
      fonts: { heading: 'Kanit', body: 'IBM Plex Sans Thai' },
      radius: 'sm',
      button: 'solid',
      density: 'compact',
      animation: 'bold',
      colorMode: 'light',
    },
  },
  {
    id: 'elegant',
    label: 'สง่างาม',
    description: 'พรีเมียม ตัวอักษรโปร่ง',
    tokens: {
      fonts: { heading: 'Playfair Display', body: 'Noto Serif Thai' },
      radius: 'md',
      button: 'gradient',
      density: 'spacious',
      animation: 'soft',
      colorMode: 'light',
    },
  },
  {
    id: 'friendly',
    label: 'สดใส',
    description: 'กลม ใหญ่ ดูมีชีวิต',
    tokens: {
      fonts: { heading: 'Prompt', body: 'Noto Sans Thai' },
      radius: 'xl',
      button: 'soft',
      density: 'comfortable',
      animation: 'bold',
      colorMode: 'auto',
    },
  },
  {
    id: 'local',
    label: 'ไทยโมเดิร์น',
    description: 'ฟอนต์ไทยเด่น อ่านง่ายทุกวัย',
    tokens: {
      fonts: { heading: 'IBM Plex Sans Thai', body: 'Noto Sans Thai' },
      radius: 'md',
      button: 'solid',
      density: 'comfortable',
      animation: 'soft',
      colorMode: 'light',
    },
  },
] as const;

export const findThemeStylePreset = (styleId: string): ThemeStylePreset | null =>
  THEME_STYLE_PRESETS.find((preset) => preset.id === styleId) ?? null;

/** Applies a wizard style card on top of a template's own tokens. */
export const applyThemeStylePreset = (tokens: unknown, styleId: string): ThemeTokens => {
  const preset = findThemeStylePreset(styleId);
  if (!preset) return normalizeThemeTokens(tokens);
  const base = normalizeThemeTokens(tokens);
  return normalizeThemeTokens({
    ...base,
    ...preset.tokens,
    colors: { ...base.colors, ...(preset.tokens.colors ?? {}) },
    fonts: { ...base.fonts, ...(preset.tokens.fonts ?? {}) },
  });
};

export interface ColorPalette {
  id: string;
  label: string;
  primary: string;
  accent: string;
}

const PALETTE_HUES = [
  { id: 'rose', label: 'กุหลาบ', hue: 352, accentHue: 190 },
  { id: 'coral', label: 'ปะการัง', hue: 12, accentHue: 205 },
  { id: 'orange', label: 'ส้มแสด', hue: 28, accentHue: 213 },
  { id: 'gold', label: 'ทองคำ', hue: 45, accentHue: 222 },
  { id: 'olive', label: 'มะกอก', hue: 84, accentHue: 320 },
  { id: 'emerald', label: 'มรกต', hue: 140, accentHue: 25 },
  { id: 'jade', label: 'หยก', hue: 165, accentHue: 340 },
  { id: 'teal', label: 'ทะเลลึก', hue: 190, accentHue: 30 },
  { id: 'sky', label: 'ฟ้าใส', hue: 205, accentHue: 20 },
  { id: 'navy', label: 'กรมท่า', hue: 224, accentHue: 40 },
  { id: 'violet', label: 'ม่วงลาเวนเดอร์', hue: 258, accentHue: 160 },
  { id: 'plum', label: 'พลัม', hue: 292, accentHue: 150 },
] as const;

const PALETTE_VARIANTS = [
  { id: 'vivid', label: 'สด', saturation: 0.68, lightness: 0.5 },
  { id: 'calm', label: 'นุ่ม', saturation: 0.42, lightness: 0.44 },
] as const;

/** Ready-made palettes for wizard step 4, built from hue + saturation pairs. */
export const COLOR_PALETTES: readonly ColorPalette[] = PALETTE_HUES.flatMap((hue) =>
  PALETTE_VARIANTS.map((variant) => ({
    id: `${hue.id}-${variant.id}`,
    label: `${hue.label} · ${variant.label}`,
    primary: ensureAccessiblePrimary(
      hslToHex({ h: hue.hue, s: variant.saturation, l: variant.lightness }),
    ),
    accent: hslToHex({
      h: hue.accentHue,
      s: Math.min(0.8, variant.saturation + 0.1),
      l: Math.min(0.7, variant.lightness + 0.14),
    }),
  })),
);