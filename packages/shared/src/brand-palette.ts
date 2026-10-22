import { z } from 'zod';
import {
  DEFAULT_THEME_TOKENS,
  ensureAccessiblePrimary,
  hslToHex,
  parseHex,
  rgbToHsl,
} from './theme.js';

/**
 * The brand colours read from the logo (docs/design/04-ux.md 4.1 step 4). The
 * wizard offers them next to the ready-made palettes, so a site matches the
 * artwork the owner already has. Pure maths on RGBA pixels: the API decodes the
 * image, this file only decides which colours matter.
 */

const HUE_BUCKETS = 12;
const MAX_SWATCHES = 4;
const MIN_ALPHA = 128;
/** Greys carry no brand, so they are ignored unless the logo has nothing else. */
const MIN_SATURATION = 0.2;
const MIN_LIGHTNESS = 0.06;
const MAX_LIGHTNESS = 0.96;
/** A colour has to cover this share of the logo's coloured pixels to be named. */
const MIN_SHARE = 0.04;
/** How far the accent has to sit from the primary on the colour wheel. */
const MIN_ACCENT_DISTANCE = 40;

const HEX = /^#[0-9A-F]{6}$/;

export const brandSwatchSchema = z.object({
  hex: z.string().regex(HEX),
  /** How much of the logo this colour covers, 0-1. */
  share: z.number().min(0).max(1),
});
export type BrandSwatch = z.infer<typeof brandSwatchSchema>;

export const brandPaletteSchema = z.object({
  primary: z.string().regex(HEX),
  accent: z.string().regex(HEX),
  swatches: z.array(brandSwatchSchema),
  /** False when the logo had no usable colour, so the app defaults were used. */
  fromLogo: z.boolean(),
});
export type BrandPalette = z.infer<typeof brandPaletteSchema>;

/** The colours every site starts with, so callers always have an answer. */
export const defaultBrandPalette = (): BrandPalette => ({
  primary: DEFAULT_THEME_TOKENS.colors.primary,
  accent: DEFAULT_THEME_TOKENS.colors.accent,
  swatches: [],
  fromLogo: false,
});

const hexFrom = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

const hueOf = (hex: string): number => {
  const { r, g, b } = parseHex(hex);
  return rgbToHsl(r, g, b).h;
};

/** Shortest distance between two hues, 0-180 degrees. */
export const hueDistance = (a: number, b: number): number => {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
};

interface Bucket {
  weight: number;
  red: number;
  green: number;
  blue: number;
}

/**
 * Picks the brand colours out of raw RGBA pixels. The primary is the colour that
 * covers most of the logo (darkened if needed so white text on it stays
 * readable), and the accent is the most different colour left, or a
 * complementary hue when the logo only has one.
 */
export const extractBrandPalette = (
  pixels: Uint8Array | readonly number[],
  width: number,
  height: number,
): BrandPalette => {
  const pixelCount = Math.floor(width) * Math.floor(height);
  if (pixelCount <= 0 || pixels.length < pixelCount * 4) return defaultBrandPalette();

  const buckets: Bucket[] = Array.from({ length: HUE_BUCKETS }, () => ({
    weight: 0,
    red: 0,
    green: 0,
    blue: 0,
  }));
  let totalWeight = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const alpha = pixels[offset + 3] ?? 0;
    if (alpha < MIN_ALPHA) continue;

    const red = pixels[offset] ?? 0;
    const green = pixels[offset + 1] ?? 0;
    const blue = pixels[offset + 2] ?? 0;
    const { h, s, l } = rgbToHsl(red, green, blue);
    if (s < MIN_SATURATION || l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue;

    // Saturation is the weight: vivid pixels say more about the brand than pale ones.
    const weight = s * (alpha / 255);
    const bucket = buckets[Math.min(HUE_BUCKETS - 1, Math.floor((h / 360) * HUE_BUCKETS))];
    if (!bucket) continue;

    bucket.weight += weight;
    bucket.red += red * weight;
    bucket.green += green * weight;
    bucket.blue += blue * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return defaultBrandPalette();

  const swatches = buckets
    .filter((bucket) => bucket.weight > 0)
    .map((bucket) => ({
      hex: hexFrom(bucket.red / bucket.weight, bucket.green / bucket.weight, bucket.blue / bucket.weight),
      share: bucket.weight / totalWeight,
    }))
    .filter((swatch) => swatch.share >= MIN_SHARE)
    .sort((a, b) => b.share - a.share)
    .slice(0, MAX_SWATCHES);

  const strongest = swatches[0];
  if (!strongest) return defaultBrandPalette();

  const primary = ensureAccessiblePrimary(strongest.hex);
  const primaryHue = hueOf(primary);
  const accentSwatch = swatches.find(
    (swatch) => hueDistance(hueOf(swatch.hex), primaryHue) >= MIN_ACCENT_DISTANCE,
  );
  const accent = accentSwatch
    ? accentSwatch.hex
    : hslToHex({ h: (primaryHue + 150) % 360, s: 0.7, l: 0.62 });

  return { primary, accent, swatches, fromLogo: true };
};
