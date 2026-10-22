import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { InMemoryMediaQueue } from './media.queue';
import { MediaProcessor, SharpImagePipeline } from './media.processor';
import { QuotaService } from '../billing/quota.service';
import { MediaService } from './media.service';
import { LocalMediaStorage } from './media.storage';

const SITE_A = '40000000-0000-4000-8000-0000000000c1';
const SITE_B = '40000000-0000-4000-8000-0000000000c2';
const USER_ID = '40000000-0000-4000-8000-0000000000d1';

const TEST_ROLE = 'lumio_media_test';
const TEST_PASSWORD = 'lumio_media_test';

const adminUrl = process.env.DATABASE_URL;

function toAppUrl(url: string): string {
  const parsed = new URL(url);
  parsed.username = TEST_ROLE;
  parsed.password = TEST_PASSWORD;
  return parsed.toString();
}

const pngFixture = (): Promise<Buffer> =>
  sharp({ create: { width: 1200, height: 800, channels: 3, background: '#1f7a4d' } })
    .png()
    .toBuffer();

/**
 * End-to-end media flow against a real database, running as a non-owner role so
 * the RLS policy is in force: presign → upload → confirm → render, plus the
 * cross-site checks the security checklist asks for. Skipped without
 * DATABASE_URL (CI provides Postgres; locally use docker compose).
 */
describe.skipIf(!adminUrl)('Media library against a real database', () => {
  let admin: PrismaClient;
  let db: PrismaService;
  let mediaDir: string;
  let service: MediaService;
  let queue: InMemoryMediaQueue;
  let processor: MediaProcessor;
  let storage: LocalMediaStorage;

  const dropTestRole = async (): Promise<void> => {
    await admin.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TEST_ROLE}') THEN
          EXECUTE 'DROP OWNED BY "${TEST_ROLE}"';
          EXECUTE 'DROP ROLE "${TEST_ROLE}"';
        END IF;
      END
      $$;
    `);
  };

  beforeAll(async () => {
    admin = new PrismaClient();
    await admin.site.deleteMany({ where: { id: { in: [SITE_A, SITE_B] } } });
    await admin.user.deleteMany({ where: { id: USER_ID } });
    await dropTestRole();

    await admin.$executeRawUnsafe(
      `CREATE ROLE "${TEST_ROLE}" LOGIN PASSWORD '${TEST_PASSWORD}' NOSUPERUSER NOBYPASSRLS`,
    );
    await admin.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${TEST_ROLE}"`);
    await admin.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${TEST_ROLE}"`,
    );
    await admin.$executeRawUnsafe(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${TEST_ROLE}"`,
    );

    await admin.site.createMany({
      data: [
        { id: SITE_A, name: 'เว็บสื่อ ก', subdomain: 'media-a' },
        { id: SITE_B, name: 'เว็บสื่อ ข', subdomain: 'media-b' },
      ],
    });
    await admin.user.create({
      data: { id: USER_ID, email: 'media-owner@lumio.test', name: 'เจ้าของเว็บ' },
    });

    db = new PrismaService({ datasources: { db: { url: toAppUrl(adminUrl ?? '') } } });
    mediaDir = await mkdtemp(join(tmpdir(), 'lumio-media-int-'));
    storage = new LocalMediaStorage(mediaDir, 'integration-secret', 'http://localhost:49100', 60_000);
    queue = new InMemoryMediaQueue();
    service = new MediaService(db, new AuditService(db), storage, queue, new QuotaService(db));
    processor = new MediaProcessor(queue, new SharpImagePipeline(storage), storage, db);
  });

  afterAll(async () => {
    await admin.site.deleteMany({ where: { id: { in: [SITE_A, SITE_B] } } });
    await admin.user.deleteMany({ where: { id: USER_ID } });
    await dropTestRole();
    await rm(mediaDir, { recursive: true, force: true });
    await db.$disconnect();
    await admin.$disconnect();
  });

  it('stores an uploaded image and renders the responsive ladder', async () => {
    const presigned = await service.presign(
      SITE_A,
      { filename: 'hero.png', mime: 'image/png', size: 1024 * 1024, folder: 'hero' },
      USER_ID,
    );

    const token = presigned.uploadUrl.split('/').pop() ?? '';
    await service.acceptUpload(token, await pngFixture());

    const confirmed = await service.confirm(
      SITE_A,
      presigned.mediaId,
      { width: 1200, height: 800, alt: 'หน้าร้านกาแฟ' },
      USER_ID,
    );
    expect(confirmed).toMatchObject({ status: 'processing', alt: 'หน้าร้านกาแฟ', folder: 'hero' });

    const summary = await processor.drain();
    expect(summary).toMatchObject({ processed: 1, failed: 0 });

    const item = await service.get(SITE_A, presigned.mediaId);
    expect(item.status).toBe('ready');
    expect(item).toMatchObject({ width: 1200, height: 800 });
    expect(item.srcSet).toContain('480w');
    expect(item.srcSet).toContain('1200w');
    expect(item.url).toContain('http://localhost:49100/media/');
    expect(item.variants.some((variant) => variant.format === 'avif')).toBe(true);
  });

  it('keeps media of one site invisible to another', async () => {
    const presigned = await service.presign(
      SITE_A,
      { filename: 'secret.png', mime: 'image/png', size: 4096 },
      USER_ID,
    );

    const list = await service.list(SITE_B, { limit: 20 }, {});
    expect(list.items.some((item) => item.id === presigned.mediaId)).toBe(false);

    await expect(service.get(SITE_B, presigned.mediaId)).rejects.toThrow(/ไม่พบรูปนี้/);
    await expect(service.remove(SITE_B, presigned.mediaId, USER_ID)).rejects.toThrow(/ไม่พบรูปนี้/);
    expect(queue.failures).toHaveLength(0);
  });

  it('writes every storage key inside the site prefix', async () => {
    const presigned = await service.presign(
      SITE_A,
      { filename: 'แบนเนอร์ร้าน.png', mime: 'image/png', size: 4096, folder: 'banner' },
      USER_ID,
    );

    const rows = await db.forSite(SITE_A, (tx) =>
      tx.media.findMany({ where: { id: presigned.mediaId } }),
    );
    expect(rows[0]?.storageKey.startsWith(`${SITE_A}/`)).toBe(true);
  });

  it('soft deletes and restores without losing the files', async () => {
    const presigned = await service.presign(
      SITE_A,
      { filename: 'undo.png', mime: 'image/png', size: 1024 * 1024 },
      USER_ID,
    );
    const token = presigned.uploadUrl.split('/').pop() ?? '';
    await service.acceptUpload(token, await pngFixture());
    await service.confirm(SITE_A, presigned.mediaId, {}, USER_ID);
    await processor.drain();

    await service.remove(SITE_A, presigned.mediaId, USER_ID);
    const afterDelete = await service.list(SITE_A, { limit: 50 }, {});
    expect(afterDelete.items.some((item) => item.id === presigned.mediaId)).toBe(false);

    const restored = await service.restore(SITE_A, presigned.mediaId, USER_ID);
    expect(restored.status).toBe('ready');

    await service.purge(SITE_A, presigned.mediaId);
    expect(await storage.size(restored.variants[0]?.url ?? 'missing')).toBeNull();
  });

  it('records every step in the audit log', async () => {
    const rows = await db.forSite(SITE_A, (tx) =>
      tx.auditLog.findMany({ where: { action: { startsWith: 'media.' } } }),
    );
    const actions = new Set(rows.map((row) => row.action));
    expect(actions).toContain('media.presign');
    expect(actions).toContain('media.confirm');
    expect(actions).toContain('media.delete');
    expect(actions).toContain('media.restore');
  });
});