import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { SeoService } from './seo.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

interface Row {
  id: string;
  title: string;
  seo: unknown;
  blocksPublished: unknown;
}

const paragraph = (id: string) => ({
  id,
  type: 'paragraph',
  version: 1,
  props: {},
  style: {},
  children: [],
});

const hero = (id: string) => ({
  id,
  type: 'hero',
  version: 1,
  props: {},
  style: {},
  children: [],
});

const stubs = (
  options: {
    publishedCount?: number;
    rows?: Row[];
    media?: { id: string; filename: string | null }[];
  } = {},
): PrismaService => {
  const rows = options.rows ?? [];
  const tx = {
    content: {
      count: vi.fn().mockResolvedValue(options.publishedCount ?? rows.length),
      findMany: vi.fn().mockResolvedValue(rows),
    },
    media: { findMany: vi.fn().mockResolvedValue(options.media ?? []) },
  };

  return {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;
};

const goodRow = (id: string): Row => ({
  id,
  title: `หน้า ${id}`,
  seo: { title: 'ชื่อเรื่อง', description: 'คำอธิบาย' },
  blocksPublished: [hero(id)],
});

describe('SeoService', () => {
  it('gives a perfect score when every check passes', async () => {
    const service = new SeoService(stubs({ rows: [goodRow('p1'), goodRow('p2')] }));
    const health = await service.health(SITE_ID);

    expect(health.score).toBe(100);
    expect(health.grade).toBe('good');
    expect(health.publishedCount).toBe(2);
    expect(health.checks.every((check) => check.done)).toBe(true);
  });

  it('flags missing title, description and heading with counts and links', async () => {
    const service = new SeoService(
      stubs({
        rows: [
          { id: 'p1', title: 'บริการ', seo: {}, blocksPublished: [paragraph('b1')] },
          { id: 'p2', title: 'ติดต่อ', seo: {}, blocksPublished: [paragraph('b2')] },
        ],
        media: [
          { id: 'm1', filename: 'shop.jpg' },
          { id: 'm2', filename: null },
        ],
      }),
    );

    const health = await service.health(SITE_ID);
    const byKind = Object.fromEntries(health.checks.map((check) => [check.kind, check]));

    expect(byKind.missing_title?.count).toBe(2);
    expect(byKind.missing_title?.done).toBe(false);
    expect(byKind.missing_title?.href).toBe('/content/page');
    expect(byKind.missing_description?.count).toBe(2);
    expect(byKind.missing_h1?.count).toBe(2);
    expect(byKind.missing_alt?.count).toBe(2);
    expect(byKind.missing_alt?.href).toBe('/content/media');
    expect(byKind.missing_alt?.items.map((item) => item.title)).toEqual([
      'shop.jpg',
      'รูปที่ไม่มีชื่อ',
    ]);
    expect(health.score).toBeLessThan(100);
  });

  it('reports the site as unpublished when nothing is live', async () => {
    const service = new SeoService(stubs({ publishedCount: 0, rows: [] }));
    const health = await service.health(SITE_ID);
    const notPublished = health.checks.find((check) => check.kind === 'not_published');

    expect(notPublished?.done).toBe(false);
    expect(notPublished?.impact).toBe('high');
    expect(health.grade).toBe('poor');
  });

  it('lists at most five example pages per check', async () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      id: `p${index}`,
      title: `หน้า ${index}`,
      seo: {},
      blocksPublished: [paragraph(`b${index}`)],
    }));

    const service = new SeoService(stubs({ rows }));
    const health = await service.health(SITE_ID);
    const missingDescription = health.checks.find((check) => check.kind === 'missing_description');

    expect(missingDescription?.count).toBe(8);
    expect(missingDescription?.items).toHaveLength(5);
  });

  it('reports checks in English when the admin asks for it', async () => {
    const service = new SeoService(
      stubs({
        rows: [{ id: 'p1', title: 'Services', seo: {}, blocksPublished: [paragraph('b1')] }],
        media: [{ id: 'm1', filename: null }],
      }),
    );

    const health = await service.health(SITE_ID, 'en');
    const byKind = Object.fromEntries(health.checks.map((check) => [check.kind, check]));

    expect(byKind.missing_alt?.label).toBe('Images have no description');
    expect(byKind.missing_alt?.items[0]?.title).toBe('Untitled image');
  });

  it('counts pages marked noindex without failing the whole report', async () => {
    const service = new SeoService(
      stubs({
        rows: [
          {
            id: 'p1',
            title: 'หน้าแรก',
            seo: { title: 'a', description: 'b', noindex: true },
            blocksPublished: [hero('b1')],
          },
        ],
      }),
    );

    const health = await service.health(SITE_ID);
    const noindex = health.checks.find((check) => check.kind === 'noindex');
    expect(noindex?.count).toBe(1);
    expect(noindex?.impact).toBe('low');
  });
});
