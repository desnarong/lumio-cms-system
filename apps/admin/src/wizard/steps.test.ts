import { describe, expect, it } from 'vitest';
import { COLOR_PALETTES, isAccessiblePrimary } from '@lumio/shared';
import {
  WIZARD_STEPS,
  buildCreateInput,
  checkStep,
  initialDraft,
  previewTokens,
  stepIndex,
  subdomainFromName,
  templateForBusinessType,
  withBrandPalette,
} from './steps.js';
import { demoItems } from './demo.js';

describe('wizard steps', () => {
  it('has the five steps from the design doc', () => {
    expect(WIZARD_STEPS).toHaveLength(5);
    expect(WIZARD_STEPS.map((step) => step.id)).toEqual([
      'business',
      'name',
      'style',
      'color',
      'create',
    ]);
    expect(stepIndex('create')).toBe(4);
  });

  it('blocks step 2 until the site has a name and an address', () => {
    expect(checkStep('name', initialDraft())).toMatchObject({ ok: false });
    expect(checkStep('name', { ...initialDraft(), name: 'ร้านกาแฟของฉัน' }).ok).toBe(false);
    expect(
      checkStep('name', { ...initialDraft(), name: 'ร้านกาแฟของฉัน', subdomain: 'my-cafe' }).ok,
    ).toBe(true);
  });

  it('derives an address from a Latin name and leaves Thai names to the user', () => {
    expect(subdomainFromName('My New Cafe')).toBe('my-new-cafe');
    expect(subdomainFromName('กาแฟบ้านดอย')).toBe('');
  });

  it('picks the template that matches the business type', () => {
    expect(templateForBusinessType(demoItems, 'clinic')?.businessType).toBe('clinic');
    expect(templateForBusinessType([], 'clinic')).toBeNull();
  });
});

describe('wizard preview', () => {
  it('previews the chosen style and colour without saving anything', () => {
    const clinic = templateForBusinessType(demoItems, 'clinic');
    const tokens = previewTokens(clinic, {
      ...initialDraft(),
      businessType: 'clinic',
      styleId: 'elegant',
      primaryColor: '#123456',
    });

    expect(tokens.colors.primary).toBe('#123456');
    expect(tokens.fonts.heading).toBe('Playfair Display');
    expect(tokens.button).toBe('gradient');
  });

  it('keeps the preview readable when a palette colour is chosen', () => {
    const restaurant = templateForBusinessType(demoItems, 'restaurant');
    const palette = COLOR_PALETTES[0]!;
    const tokens = previewTokens(restaurant, {
      ...initialDraft(),
      primaryColor: palette.primary,
      accentColor: palette.accent,
    });

    expect(tokens.colors.primary).toBe(palette.primary);
    expect(isAccessiblePrimary(tokens.colors.primary)).toBe(true);
  });

  it('starts from a brand colour that already passes the contrast check', () => {
    expect(isAccessiblePrimary(initialDraft().primaryColor)).toBe(true);
  });
});

describe('buildCreateInput', () => {
  it('sends the four answers plus publish-now', () => {
    const input = buildCreateInput({
      ...initialDraft(),
      businessType: 'freelance',
      name: '  สตูดิโอแสนดี  ',
      subdomain: 'studio',
      styleId: 'bold',
      primaryColor: '#4338CA',
      accentColor: '#F472B6',
      logoMediaId: '00000000-0000-4000-8000-0000000000b1',
    });

    expect(input).toMatchObject({
      businessType: 'freelance',
      name: 'สตูดิโอแสนดี',
      subdomain: 'studio',
      localeDefault: 'th',
      styleId: 'bold',
      primaryColor: '#4338CA',
      accentColor: '#F472B6',
      logoMediaId: '00000000-0000-4000-8000-0000000000b1',
      publishNow: true,
    });
  });

  it('asks the server to build the extra languages in the background', () => {
    const input = buildCreateInput({
      ...initialDraft(),
      name: 'ร้าน',
      subdomain: 'shop',
      extraLocales: ['en'],
    });

    expect(input.locales).toEqual(['en']);
  });

  it('omits the logo and accent when the user skipped them', () => {
    const input = buildCreateInput({ ...initialDraft(), name: 'ร้าน', subdomain: 'shop' });

    expect(input.logoMediaId).toBeUndefined();
    expect(input.accentColor).toBeUndefined();
  });
});

describe('withBrandPalette', () => {
  it('moves only the two colour answers', () => {
    const draft = {
      ...initialDraft(),
      businessType: 'restaurant' as const,
      name: 'ร้านกาแฟ',
      subdomain: 'cafe',
      logoMediaId: 'media-1',
    };

    const next = withBrandPalette(draft, {
      primary: '#1D4ED8',
      accent: '#F97316',
      swatches: [],
      fromLogo: true,
    });

    expect(next.primaryColor).toBe('#1D4ED8');
    expect(next.accentColor).toBe('#F97316');
    expect(next.businessType).toBe(draft.businessType);
    expect(next.name).toBe(draft.name);
    expect(next.logoMediaId).toBe('media-1');
  });
});
