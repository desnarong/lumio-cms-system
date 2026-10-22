import { describe, expect, it } from 'vitest';
import {
  FEATURE_FLAG_KEYS,
  isFeatureOn,
  normalizeFeatureFlags,
  parseDisabledFeatures,
  siteFeatureFlagsFromSettings,
  updateFeatureFlagsInputSchema,
} from './flags.js';

describe('normalizeFeatureFlags', () => {
  it('keeps known booleans and drops everything else', () => {
    expect(normalizeFeatureFlags({ commerce: false, ai: 'yes', madeUp: false })).toEqual({
      commerce: false,
    });
  });

  it('answers an empty object for a missing or broken blob', () => {
    expect(normalizeFeatureFlags(null)).toEqual({});
    expect(normalizeFeatureFlags(['commerce'])).toEqual({});
  });
});

describe('parseDisabledFeatures', () => {
  it('reads a comma or space separated list and ignores unknown names', () => {
    expect(parseDisabledFeatures('commerce, booking\nai')).toEqual(['commerce', 'ai']);
  });

  it('answers nothing when the switch is empty', () => {
    expect(parseDisabledFeatures('')).toEqual([]);
    expect(parseDisabledFeatures(undefined)).toEqual([]);
  });
});

describe('isFeatureOn', () => {
  it('starts free capabilities on and paid ones off', () => {
    for (const key of FEATURE_FLAG_KEYS) {
      if (key === 'membership' || key === 'marketplace') continue;
      expect(isFeatureOn(key)).toBe(true);
    }
    expect(isFeatureOn('membership')).toBe(false);
    expect(isFeatureOn('marketplace')).toBe(false);
  });

  it('follows the site choice', () => {
    expect(isFeatureOn('commerce', { flags: { commerce: false } })).toBe(false);
  });

  it('lets the platform override a site that switched the flag on', () => {
    expect(isFeatureOn('ai', { flags: { ai: true }, disabled: ['ai'] })).toBe(false);
  });
});

describe('siteFeatureFlagsFromSettings', () => {
  it('reads the flags object out of the stored settings', () => {
    expect(siteFeatureFlagsFromSettings({ flags: { apps: false } })).toEqual({ apps: false });
  });

  it('answers nothing when settings are missing', () => {
    expect(siteFeatureFlagsFromSettings(undefined)).toEqual({});
  });
});

describe('updateFeatureFlagsInputSchema', () => {
  it('accepts a partial set of known flags', () => {
    expect(updateFeatureFlagsInputSchema.safeParse({ flags: { commerce: false } }).success).toBe(
      true,
    );
  });

  it('rejects a flag that does not exist', () => {
    expect(updateFeatureFlagsInputSchema.safeParse({ flags: { madeUp: true } }).success).toBe(
      false,
    );
  });

  it('rejects a value that is not a boolean', () => {
    expect(updateFeatureFlagsInputSchema.safeParse({ flags: { ai: 'on' } }).success).toBe(false);
  });
});
