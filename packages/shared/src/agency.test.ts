import { describe, expect, it } from 'vitest';
import { DEFAULT_AGENCY_BRANDING, brandNameOf, mergeAgencyBranding } from './agency.js';

describe('agency branding', () => {
  it('uses the default brand when nothing is stored', () => {
    expect(mergeAgencyBranding(null)).toEqual(DEFAULT_AGENCY_BRANDING);
  });

  it('keeps stored values and ignores a blank brand name', () => {
    const merged = mergeAgencyBranding({ brandName: '   ', hideBranding: true });

    expect(merged.brandName).toBe(DEFAULT_AGENCY_BRANDING.brandName);
    expect(merged.hideBranding).toBe(true);
  });

  it('never renders an empty browser title', () => {
    expect(brandNameOf({ brandName: '  ' })).toBe('Lumio');
    expect(brandNameOf({ brandName: 'เอเจนซี' })).toBe('เอเจนซี');
  });
});
