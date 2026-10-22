import { describe, expect, it } from 'vitest';
import {
  BRAND_RAMP_STEPS,
  COLOR_PALETTES,
  DEFAULT_THEME_TOKENS,
  THEME_STYLE_IDS,
  THEME_STYLE_PRESETS,
  applyThemeStylePreset,
  applyThemeTokensPatch,
  buildBrandRamp,
  contrastRatio,
  findThemeStylePreset,
  hexToRgba,
  isAccessiblePrimary,
  normalizeThemeTokens,
  readableInk,
  relativeLuminance,
  themeCssVariables,
  themeDataAttributes,
  themeTokensPatchSchema,
} from './theme.js';

describe('normalizeThemeTokens', () => {
  it('reads the structured shape', () => {
    const tokens = normalizeThemeTokens({
      colors: { primary: '#8B5E3C', accent: '#D9A05B', neutral: 'stone' },
      fonts: { heading: 'Kanit', body: 'Noto Sans Thai' },
      radius: 'lg',
      button: 'soft',
      density: 'spacious',
      colorMode: 'dark',
      animation: 'bold',
    });

    expect(tokens.colors.primary).toBe('#8B5E3C');
    expect(tokens.fonts.heading).toBe('Kanit');
    expect(tokens.radius).toBe('lg');
    expect(tokens.density).toBe('spacious');
  });

  it('upgrades the flat tokens older sites stored', () => {
    const tokens = normalizeThemeTokens({
      colorBrand: '#0e7490',
      colorAccent: '#22d3ee',
      fontHeading: 'Prompt',
    });

    expect(tokens.colors.primary).toBe('#0E7490');
    expect(tokens.colors.accent).toBe('#22D3EE');
    expect(tokens.fonts.heading).toBe('Prompt');
    expect(tokens.radius).toBe(DEFAULT_THEME_TOKENS.radius);
  });

  it('never returns broken colours or enums', () => {
    const tokens = normalizeThemeTokens({ colors: { primary: 'red' }, radius: 'huge' });

    expect(tokens.colors.primary).toBe(DEFAULT_THEME_TOKENS.colors.primary);
    expect(tokens.radius).toBe(DEFAULT_THEME_TOKENS.radius);
  });
});

describe('applyThemeTokensPatch', () => {
  it('merges a partial patch over the stored tokens', () => {
    const tokens = applyThemeTokensPatch(
      { colors: { primary: '#8B5E3C' }, fonts: { heading: 'Kanit' } },
      { colors: { accent: '#D9A05B' }, button: 'outline' },
    );

    expect(tokens.colors.primary).toBe('#8B5E3C');
    expect(tokens.colors.accent).toBe('#D9A05B');
    expect(tokens.fonts.heading).toBe('Kanit');
    expect(tokens.button).toBe('outline');
  });

  it('accepts the flat aliases the Design Panel used to send', () => {
    const patch = themeTokensPatchSchema.parse({ colorBrand: '#123456', fontBody: 'Prompt' });
    const tokens = applyThemeTokensPatch({}, patch);

    expect(tokens.colors.primary).toBe('#123456');
    expect(tokens.fonts.body).toBe('Prompt');
  });

  it('rejects invalid colours and unknown enum values', () => {
    expect(themeTokensPatchSchema.safeParse({ colors: { primary: 'teal' } }).success).toBe(false);
    expect(themeTokensPatchSchema.safeParse({ density: 'huge' }).success).toBe(false);
  });
});

describe('brand ramp', () => {
  it('keeps the picked colour at step 500 and fills the whole ramp', () => {
    const ramp = buildBrandRamp('#8B5E3C');

    expect(Object.keys(ramp).map(Number)).toEqual([...BRAND_RAMP_STEPS]);
    expect(ramp[500]).toBe('#8B5E3C');
    expect(ramp[50]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('gets lighter towards 50 and darker towards 900', () => {
    const ramp = buildBrandRamp('#0E7490');

    expect(relativeLuminance(ramp[50])).toBeGreaterThan(relativeLuminance(ramp[500]));
    expect(relativeLuminance(ramp[900])).toBeLessThan(relativeLuminance(ramp[500]));
    expect(relativeLuminance(ramp[600])).toBeLessThan(relativeLuminance(ramp[400]));
  });
});

describe('contrast helpers', () => {
  it('measures the WCAG ratio between black and white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('picks ink that stays readable on the surface', () => {
    expect(readableInk('#0F172A')).toBe('#FFFFFF');
    expect(readableInk('#FDE68A')).toBe('#0F172A');
    expect(contrastRatio('#0E7490', readableInk('#0E7490'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('theme CSS variables', () => {
  it('emits the semantic colours, fonts, corners and block spacing', () => {
    const vars = themeCssVariables({
      colors: { primary: '#0E7490', accent: '#22D3EE' },
      fonts: { heading: 'Prompt', body: 'Noto Sans Thai' },
      radius: 'lg',
      density: 'compact',
      animation: 'none',
    });

    expect(vars['--color-primary']).toBe('#0E7490');
    expect(vars['--color-primary-hover']).not.toBe(vars['--color-primary']);
    expect(vars['--color-accent']).toBe('#22D3EE');
    expect(vars['--font-display']).toContain('Prompt');
    expect(vars['--radius-lg']).toBe('28px');
    expect(vars['--density-scale']).toBe('0.75');
    expect(vars['--motion-duration-slow']).toBe('1ms');
    expect(vars['--color-on-accent']).toBe(readableInk('#22D3EE'));
  });

  it('keeps the focus ring readable on the brand colour', () => {
    const vars = themeCssVariables({ colors: { primary: '#6366F1' } });
    expect(vars['--color-focus-ring']).toBe(hexToRgba('#6366F1', 0.45));
  });

  it('exposes the attribute hooks used by the block stylesheet', () => {
    expect(themeDataAttributes({ button: 'gradient', animation: 'bold' })).toEqual({
      'data-color-mode': 'auto',
      'data-button-style': 'gradient',
      'data-density': 'comfortable',
      'data-animation': 'bold',
    });
  });
});

describe('wizard options', () => {
  it('has a preset for every selectable style id', () => {
    for (const id of THEME_STYLE_IDS) {
      expect(findThemeStylePreset(id)).not.toBeNull();
    }
    expect(THEME_STYLE_PRESETS).toHaveLength(THEME_STYLE_IDS.length);
  });

  it('applies a style card on top of the template tokens', () => {
    const tokens = applyThemeStylePreset({ colors: { primary: '#8B5E3C' } }, 'elegant');

    expect(tokens.colors.primary).toBe('#8B5E3C');
    expect(tokens.fonts.heading).toBe('Playfair Display');
    expect(tokens.button).toBe('gradient');
  });

  it('ships ready-made palettes that pass the contrast check', () => {
    expect(COLOR_PALETTES).toHaveLength(24);
    expect(new Set(COLOR_PALETTES.map((palette) => palette.id)).size).toBe(24);

    for (const palette of COLOR_PALETTES) {
      expect(palette.primary).toMatch(/^#[0-9A-F]{6}$/);
      expect(isAccessiblePrimary(palette.primary)).toBe(true);
    }
  });
});