import { describe, expect, it } from 'vitest';
import {
  emptyPublishSettings,
  publishSettingsInputSchema,
  readStoredPublishSettings,
} from './publish.js';

const valid = {
  rendererUrl: 'https://renderer.example.com',
  staticPublishUrl: 'https://cdn.example.com/upload',
  cdnPurgeUrl: 'https://cdn.example.com/purge',
  purgeOnPublish: true,
};

describe('publishSettingsInputSchema', () => {
  it('accepts a complete publishing setup', () => {
    expect(publishSettingsInputSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an empty setup: ISR only, no CDN', () => {
    const parsed = publishSettingsInputSchema.parse({});
    expect(parsed).toMatchObject(emptyPublishSettings());
  });

  it('rejects an address without a scheme', () => {
    expect(
      publishSettingsInputSchema.safeParse({ ...valid, staticPublishUrl: 'cdn.example.com/upload' })
        .success,
    ).toBe(false);
  });

  it('rejects a non-web scheme', () => {
    expect(
      publishSettingsInputSchema.safeParse({ ...valid, cdnPurgeUrl: 'ftp://cdn.example.com/purge' })
        .success,
    ).toBe(false);
  });

  it('allows keeping a saved secret by omitting it', () => {
    const parsed = publishSettingsInputSchema.parse({ ...valid });
    expect(parsed.staticPublishSecret).toBeUndefined();
  });
});

describe('readStoredPublishSettings', () => {
  it('reads the stored blob with its run record', () => {
    const stored = {
      rendererUrl: 'https://renderer.example.com',
      staticPublishUrl: 'https://cdn.example.com/upload',
      staticPublishSecret: 'enc:v1:x.y.z',
      cdnPurgeUrl: '',
      purgeOnPublish: true,
      lastRun: {
        at: '2026-10-22T00:00:00.000Z',
        durationMs: 2400,
        delivered: true,
        failures: [],
      },
      updatedAt: '2026-10-22T00:00:00.000Z',
    };
    expect(readStoredPublishSettings({ publish: stored })?.lastRun?.durationMs).toBe(2400);
    expect(readStoredPublishSettings({ publish: { ...stored, purgeOnPublish: 'yes' } })).toBeNull();
    expect(readStoredPublishSettings({})).toBeNull();
    expect(readStoredPublishSettings(null)).toBeNull();
  });
});
