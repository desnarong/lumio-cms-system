import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { readStoredPublishSettings, type PublishSettingsInput } from '@lumio/shared';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { PublishSettingsService } from './publish-settings.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

interface Stubs {
  db: PrismaService;
  auditLog: Mock;
  settings: () => Record<string, unknown>;
}

const stubs = (initial: Record<string, unknown> = {}): Stubs => {
  let settings = initial;
  const auditLog = vi.fn().mockResolvedValue(undefined);

  const tx = {
    site: {
      findUnique: async () => ({ settings }),
      update: async ({ data }: { data: { settings: Record<string, unknown> } }) => {
        settings = data.settings;
        return { settings };
      },
    },
  };

  const db = {
    forSite: async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx),
  } as unknown as PrismaService;

  return { db, auditLog, settings: () => settings };
};

const service = (all: Stubs): PublishSettingsService =>
  new PublishSettingsService(all.db, { log: all.auditLog } as unknown as AuditService);

const input = (overrides: Partial<PublishSettingsInput> = {}): PublishSettingsInput => ({
  rendererUrl: 'https://renderer.example.com',
  staticPublishUrl: 'https://cdn.example.com/upload',
  staticPublishSecret: 'upload-key',
  cdnPurgeUrl: 'https://cdn.example.com/purge',
  cdnPurgeSecret: 'purge-key',
  purgeOnPublish: true,
  ...overrides,
});

describe('PublishSettingsService', () => {
  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY = 'test-key-for-publish-settings';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('reports an empty setup without leaking anything', async () => {
    const view = await service(stubs()).view(SITE_ID);

    expect(view).toMatchObject({
      rendererUrl: '',
      staticPublishUrl: '',
      hasStaticPublishSecret: false,
      cdnPurgeUrl: '',
      hasCdnPurgeSecret: false,
      purgeOnPublish: true,
      staticReady: false,
      purgeReady: false,
      lastRun: null,
      updatedAt: null,
    });
  });

  it('encrypts both keys at rest and only returns flags', async () => {
    const all = stubs();
    const view = await service(all).update(SITE_ID, input(), USER_ID);

    const stored = readStoredPublishSettings(all.settings());
    expect(stored?.staticPublishSecret?.startsWith('enc:v1:')).toBe(true);
    expect(stored?.cdnPurgeSecret?.startsWith('enc:v1:')).toBe(true);
    expect(stored?.staticPublishSecret).not.toContain('upload-key');
    expect(view.hasStaticPublishSecret).toBe(true);
    expect(view.hasCdnPurgeSecret).toBe(true);
    expect(view.staticReady).toBe(true);
    expect(JSON.stringify(view)).not.toContain('enc:v1:');
    expect(all.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'publish.settings.update' }),
    );
  });

  it('keeps a saved key when the field is left blank', async () => {
    const all = stubs();
    await service(all).update(SITE_ID, input(), USER_ID);
    const first = readStoredPublishSettings(all.settings())?.staticPublishSecret;

    await service(all).update(
      SITE_ID,
      input({ staticPublishSecret: undefined, cdnPurgeSecret: undefined }),
      USER_ID,
    );

    expect(readStoredPublishSettings(all.settings())?.staticPublishSecret).toBe(first);
  });

  it('forgets a key when the owner asks to clear it', async () => {
    const all = stubs();
    await service(all).update(SITE_ID, input(), USER_ID);

    const view = await service(all).update(
      SITE_ID,
      input({ clearStaticPublishSecret: true, clearCdnPurgeSecret: true }),
      USER_ID,
    );

    expect(view.hasStaticPublishSecret).toBe(false);
    expect(view.hasCdnPurgeSecret).toBe(false);
  });

  it('decrypts the configuration the pipeline uses', async () => {
    const all = stubs();
    await service(all).update(SITE_ID, input(), USER_ID);

    const config = await service(all).config(SITE_ID);

    expect(config).toEqual({
      rendererUrl: 'https://renderer.example.com',
      staticPublishUrl: 'https://cdn.example.com/upload',
      staticPublishSecret: 'upload-key',
      cdnPurgeUrl: 'https://cdn.example.com/purge',
      cdnPurgeSecret: 'purge-key',
      purgeOnPublish: true,
    });
  });

  it('records the last run so the owner can see the 10-second target', async () => {
    const all = stubs();
    await service(all).update(SITE_ID, input(), USER_ID);

    await service(all).recordRun(SITE_ID, {
      durationMs: 2_450,
      delivered: true,
      failures: [],
    });

    const view = await service(all).view(SITE_ID);
    expect(view.lastRun).toMatchObject({ durationMs: 2_450, delivered: true, failures: [] });
  });

  it('refuses an internal address in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(
      service(stubs()).update(
        SITE_ID,
        input({ staticPublishUrl: 'http://169.254.169.254/upload' }),
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });
});
