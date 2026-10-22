import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_TOKENS,
  brandPaletteSchema,
  extractBrandPalette,
  hueDistance,
  isAccessiblePrimary,
  parseHex,
  rgbToHsl,
} from './index.js';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const rgb = (hex: string): Rgb => parseHex(hex);

/** Builds RGBA pixels: `[colour, count]` pairs repeated in order. */
const pixels = (parts: [string, number][], alpha = 255): Uint8Array => {
  const channels: number[] = [];
  for (const [hex, count] of parts) {
    const { r, g, b } = rgb(hex);
    for (let index = 0; index < count; index += 1) channels.push(r, g, b, alpha);
  }
  return new Uint8Array(channels);
};

const size = (pixelBytes: Uint8Array): number => pixelBytes.length / 4;

const hue = (hex: string): number => {
  const { r, g, b } = rgb(hex);
  return rgbToHsl(r, g, b).h;
};

describe('extractBrandPalette', () => {
  it('reads a single-colour logo as the primary and keeps white text readable', () => {
    const data = pixels([['#FFD54F', 64]]);

    const palette = extractBrandPalette(data, 8, size(data) / 8);

    expect(palette.fromLogo).toBe(true);
    expect(isAccessiblePrimary(palette.primary)).toBe(true);
    expect(palette.swatches[0]?.share).toBeCloseTo(1, 2);
    // Amber needs to be darkened before it can carry white text.
    expect(hue(palette.primary)).toBeCloseTo(hue('#FFD54F'), 0);
    expect(palette.accent).not.toBe(palette.primary);
  });

  it('picks the colour that covers most of the logo and the different one as accent', () => {
    const data = pixels([
      ['#1D4ED8', 60],
      ['#F97316', 20],
    ]);

    const palette = extractBrandPalette(data, 10, size(data) / 10);

    expect(palette.swatches).toHaveLength(2);
    expect(palette.swatches[0]?.share).toBeGreaterThan(palette.swatches[1]?.share ?? 1);
    expect(hue(palette.primary)).toBeCloseTo(hue('#1D4ED8'), 0);
    expect(hue(palette.accent)).toBeCloseTo(hue('#F97316'), 0);
    expect(hueDistance(hue(palette.primary), hue(palette.accent))).toBeGreaterThan(40);
  });

  it('ignores transparent and grey pixels when the logo still has a colour', () => {
    const data = pixels(
      [
        ['#000000', 40],
        ['#FFFFFF', 40],
      ],
      255,
    );
    const withColour = new Uint8Array([...pixels([['#059669', 10]]), ...data]);

    const palette = extractBrandPalette(withColour, 9, size(withColour) / 9);

    expect(palette.fromLogo).toBe(true);
    expect(hue(palette.primary)).toBeCloseTo(hue('#059669'), 0);
  });

  it('falls back to the app colours for a black-and-white logo', () => {
    const data = pixels([
      ['#111111', 32],
      ['#FAFAFA', 32],
    ]);

    const palette = extractBrandPalette(data, 8, size(data) / 8);

    expect(palette).toEqual({
      primary: DEFAULT_THEME_TOKENS.colors.primary,
      accent: DEFAULT_THEME_TOKENS.colors.accent,
      swatches: [],
      fromLogo: false,
    });
  });

  it('falls back when there are no pixels at all', () => {
    expect(extractBrandPalette(new Uint8Array(0), 0, 0).fromLogo).toBe(false);
    expect(extractBrandPalette(new Uint8Array(4), 4, 4).fromLogo).toBe(false);
  });

  it('drops colours that barely show up in the logo', () => {
    const data = pixels([
      ['#7C3AED', 100],
      ['#FACC15', 1],
    ]);

    const palette = extractBrandPalette(data, 10, size(data) / 10);

    expect(palette.swatches.map((swatch) => swatch.hex)).not.toContain('#FACC15');
  });

  it('always answers with a palette the schema accepts', () => {
    const data = pixels([['#0891B2', 30]]);
    expect(brandPaletteSchema.parse(extractBrandPalette(data, 6, 5))).toBeTruthy();
  });
});

describe('hueDistance', () => {
  it('takes the short way around the colour wheel', () => {
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(200, 200)).toBe(0);
  });
});
