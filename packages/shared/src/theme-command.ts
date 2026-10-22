import { z } from 'zod';
import { localized, type ApiLocale } from './api-locale.js';
import {
  applyThemeTokensPatch,
  ensureAccessiblePrimary,
  normalizeThemeTokens,
  themeTokensPatchSchema,
  type ThemeTokens,
  type ThemeButtonStyle,
  type ThemeColorMode,
  type ThemeDensity,
  type ThemeRadiusScale,
  type ThemeTokensPatch,
} from './theme.js';

/**
 * "เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม" (docs/design/09-ai-assistant.md 9.1 and 9.3).
 *
 * A whole-site command changes design tokens, never page copy: tokens already
 * drive every button, heading and corner, so one accepted suggestion restyles
 * the site without touching a single block. The assistant still only proposes:
 * the answer carries the patch to apply and the inverse patch to undo it.
 */

export const aiSiteCommandInputSchema = z.object({
  instruction: z.string().trim().min(3, 'บอกผู้ช่วยสักหน่อยว่าอยากปรับอะไร').max(200),
});
export type AiSiteCommandInput = z.infer<typeof aiSiteCommandInputSchema>;

export interface ThemeCommandChange {
  /** Token path, e.g. `colors.primary`. */
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface ThemeCommand {
  patch: ThemeTokensPatch;
  /** Puts every changed token back, so accepting is always undoable. */
  inversePatch: ThemeTokensPatch;
  changes: ThemeCommandChange[];
}

interface ColorWord {
  words: string[];
  hex: string;
}

/** Brand-colour words the assistant understands, Thai and English. */
const COLOR_WORDS: ColorWord[] = [
  { words: ['ส้ม', 'orange'], hex: '#EA580C' },
  { words: ['แดง', 'red'], hex: '#DC2626' },
  { words: ['ชมพู', 'pink', 'rose'], hex: '#DB2777' },
  { words: ['ม่วง', 'purple', 'violet'], hex: '#7C3AED' },
  { words: ['น้ำเงิน', 'กรมท่า', 'navy', 'blue'], hex: '#2563EB' },
  { words: ['ฟ้า', 'sky'], hex: '#0284C7' },
  { words: ['เขียว', 'green'], hex: '#16A34A' },
  { words: ['เหลือง', 'ทอง', 'yellow', 'gold'], hex: '#CA8A04' },
  { words: ['เทา', 'gray', 'grey'], hex: '#475569' },
  { words: ['ดำ', 'black'], hex: '#0F172A' },
];

const FIELD_LABELS = {
  'colors.primary': { th: 'สีหลัก (ปุ่มและลิงก์)', en: 'Main color (buttons and links)' },
  'colors.accent': { th: 'สีเน้น', en: 'Accent color' },
  radius: { th: 'ความโค้งของมุม', en: 'Corner roundness' },
  button: { th: 'สไตล์ปุ่ม', en: 'Button style' },
  density: { th: 'ความโปร่งของหน้า', en: 'Page spacing' },
  colorMode: { th: 'โหมดสี', en: 'Color mode' },
} as const;

type FieldKey = keyof typeof FIELD_LABELS;

const FIELD_ORDER: FieldKey[] = [
  'colors.primary',
  'colors.accent',
  'radius',
  'button',
  'density',
  'colorMode',
];

const fieldLabel = (field: FieldKey, locale: ApiLocale): string =>
  localized(FIELD_LABELS[field], locale);

const includesAny = (text: string, words: readonly string[]): boolean =>
  words.some((word) => text.includes(word));

const colorWordFor = (text: string): ColorWord | undefined =>
  COLOR_WORDS.find((entry) => includesAny(text, entry.words));

/** Token fields a patch actually touches, including the legacy flat aliases. */
const touchedFields = (patch: ThemeTokensPatch): FieldKey[] => {
  const touched = new Set<FieldKey>();
  if (patch.colors?.primary !== undefined || patch.colorBrand !== undefined) {
    touched.add('colors.primary');
  }
  if (patch.colors?.accent !== undefined || patch.colorAccent !== undefined) {
    touched.add('colors.accent');
  }
  if (patch.radius !== undefined) touched.add('radius');
  if (patch.button !== undefined) touched.add('button');
  if (patch.density !== undefined) touched.add('density');
  if (patch.colorMode !== undefined) touched.add('colorMode');
  return FIELD_ORDER.filter((field) => touched.has(field));
};

const valueFor = (field: FieldKey, tokens: ThemeTokens): string => {
  switch (field) {
    case 'colors.primary':
      return tokens.colors.primary;
    case 'colors.accent':
      return tokens.colors.accent;
    case 'radius':
      return tokens.radius;
    case 'button':
      return tokens.button;
    case 'density':
      return tokens.density;
    case 'colorMode':
      return tokens.colorMode;
  }
};

const inverseFor = (field: FieldKey, current: ThemeTokens): ThemeTokensPatch => {
  switch (field) {
    case 'colors.primary':
      return { colors: { primary: current.colors.primary } };
    case 'colors.accent':
      return { colors: { accent: current.colors.accent } };
    case 'radius':
      return { radius: current.radius };
    case 'button':
      return { button: current.button };
    case 'density':
      return { density: current.density };
    case 'colorMode':
      return { colorMode: current.colorMode };
  }
};

const mergePatch = (left: ThemeTokensPatch, right: ThemeTokensPatch): ThemeTokensPatch => ({
  ...left,
  ...right,
  ...(left.colors || right.colors ? { colors: { ...left.colors, ...right.colors } } : {}),
});

/** Folds the legacy flat alias keys into the structured colours/fonts shape. */
const normalizePatch = (patch: ThemeTokensPatch): ThemeTokensPatch => {
  const { colorBrand, colorAccent, fontHeading, fontBody, ...rest } = patch;
  const colors = {
    ...patch.colors,
    ...(colorBrand ? { primary: colorBrand } : {}),
    ...(colorAccent ? { accent: colorAccent } : {}),
  };
  const fonts = {
    ...patch.fonts,
    ...(fontHeading ? { heading: fontHeading } : {}),
    ...(fontBody ? { body: fontBody } : {}),
  };

  return {
    ...rest,
    ...(Object.keys(colors).length > 0 ? { colors } : {}),
    ...(Object.keys(fonts).length > 0 ? { fonts } : {}),
  };
};

/**
 * Turns an already-parsed patch into the diff the admin shows. Returns `null`
 * when the patch changes nothing, so the screen never opens an empty dialog.
 */
export const themeCommandFromPatch = (
  rawPatch: ThemeTokensPatch,
  tokens: unknown,
  locale: ApiLocale = 'th',
): ThemeCommand | null => {
  const parsed = themeTokensPatchSchema.safeParse(rawPatch);
  if (!parsed.success) return null;

  const patch = normalizePatch(parsed.data);
  const fields = touchedFields(patch);
  if (fields.length === 0) return null;

  const current = normalizeThemeTokens(tokens);
  const next = applyThemeTokensPatch(current, patch);

  const changes: ThemeCommandChange[] = [];
  let inversePatch: ThemeTokensPatch = {};

  for (const field of fields) {
    const before = valueFor(field, current);
    const after = valueFor(field, next);
    if (before === after) continue;
    changes.push({ field, label: fieldLabel(field, locale), before, after });
    inversePatch = mergePatch(inversePatch, inverseFor(field, current));
  }

  if (changes.length === 0) return null;
  return { patch, inversePatch, changes };
};

/**
 * Reads one sentence into a token patch. Returns `null` when the sentence asks
 * for nothing this engine understands, so the screen can say so instead of
 * proposing an empty diff.
 */
export const themeCommandFromInstruction = (
  instruction: string,
  tokens: unknown,
  locale: ApiLocale = 'th',
): ThemeCommand | null => {
  const text = instruction.trim().toLowerCase();
  if (text.length === 0) return null;

  const patch: ThemeTokensPatch = {};

  const color = colorWordFor(text);
  if (color) {
    // "accent"/"ไฮไลต์" targets the secondary colour; everything else, including
    // "ปุ่มทั้งหมด", means the main brand colour that buttons already use.
    const accent = includesAny(text, ['accent', 'ไฮไลต์', 'เน้น']);
    const value = accent ? color.hex.toUpperCase() : ensureAccessiblePrimary(color.hex);
    patch.colors = accent ? { accent: value } : { primary: value };
  }

  const radius = themeRadiusFrom(text);
  if (radius) patch.radius = radius;

  const buttonStyle = themeButtonFrom(text);
  if (buttonStyle) patch.button = buttonStyle;

  const density = themeDensityFrom(text);
  if (density) patch.density = density;

  const colorMode = themeColorModeFrom(text);
  if (colorMode) patch.colorMode = colorMode;

  if (Object.keys(patch).length === 0) return null;
  return themeCommandFromPatch(patch, tokens, locale);
};

const themeRadiusFrom = (text: string): ThemeRadiusScale | undefined => {
  if (includesAny(text, ['เหลี่ยม', 'square'])) return 'none';
  if (includesAny(text, ['โค้งมาก', 'กลม', 'fully round'])) return 'full';
  if (includesAny(text, ['โค้ง', 'มน', 'round'])) return 'lg';
  return undefined;
};

const themeButtonFrom = (text: string): ThemeButtonStyle | undefined => {
  if (includesAny(text, ['ไล่สี', 'gradient'])) return 'gradient';
  if (includesAny(text, ['ขอบ', 'outline'])) return 'outline';
  if (includesAny(text, ['นุ่ม', 'soft'])) return 'soft';
  if (includesAny(text, ['ทึบ', 'solid'])) return 'solid';
  return undefined;
};

const themeDensityFrom = (text: string): ThemeDensity | undefined => {
  if (includesAny(text, ['แน่น', 'compact'])) return 'compact';
  if (includesAny(text, ['โปร่ง', 'spacious'])) return 'spacious';
  return undefined;
};

const themeColorModeFrom = (text: string): ThemeColorMode | undefined => {
  if (includesAny(text, ['โหมดมืด', 'dark mode'])) return 'dark';
  if (includesAny(text, ['โหมดสว่าง', 'light mode'])) return 'light';
  return undefined;
};

export const aiSiteCommandChangeSchema = z.object({
  field: z.string(),
  label: z.string(),
  before: z.string(),
  after: z.string(),
});
export type AiSiteCommandChange = z.infer<typeof aiSiteCommandChangeSchema>;

export const aiSiteCommandProposalSchema = z.object({
  id: z.string(),
  action: z.literal('site-command'),
  label: z.string(),
  summary: z.string(),
  changes: z.array(aiSiteCommandChangeSchema).min(1),
  patch: themeTokensPatchSchema,
  inversePatch: themeTokensPatchSchema,
  provider: z.string(),
});
export type AiSiteCommandProposal = z.infer<typeof aiSiteCommandProposalSchema>;
