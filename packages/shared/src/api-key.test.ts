import { describe, expect, it } from 'vitest';
import {
  apiKeyHint,
  generateApiKeySecret,
  isApiKeyFormat,
  parseApiKeySecret,
} from './api-key.js';

const SITE_ID = 'a1b2c3d4-1111-4222-8333-444455556666';

describe('api key format', () => {
  it('carries the site so the lookup can run inside its RLS scope', () => {
    const secret = generateApiKeySecret(SITE_ID);
    const parsed = parseApiKeySecret(secret);

    expect(isApiKeyFormat(secret)).toBe(true);
    expect(parsed?.siteId).toBe(SITE_ID);
    expect(secret.startsWith('lum_')).toBe(true);
  });

  it('shows only a short hint of the key', () => {
    const secret = generateApiKeySecret(SITE_ID);

    expect(apiKeyHint(secret)).toHaveLength(11);
    expect(secret.startsWith(apiKeyHint(secret))).toBe(true);
  });

  it('rejects text that cannot be one of our keys', () => {
    expect(isApiKeyFormat('')).toBe(false);
    expect(isApiKeyFormat('sk_live_123')).toBe(false);
    expect(isApiKeyFormat(`lum_${'z'.repeat(32)}.short`)).toBe(false);
  });
});
