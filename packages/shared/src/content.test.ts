import { describe, expect, it } from 'vitest';
import {
  CONTENT_TRASH_RETENTION_DAYS,
  contentListQuerySchema,
  createContentInputSchema,
  createContentVersionInputSchema,
  isContentStatus,
  isContentType,
  isTrashExpired,
  saveContentBlocksInputSchema,
  seoPatchSchema,
  slugify,
  trashDaysLeft,
  trashPurgeAt,
} from './content.js';

describe('slugify', () => {
  it('lowercases and joins words with a hyphen', () => {
    expect(slugify('About Our Coffee')).toBe('about-our-coffee');
  });

  it('strips accents and punctuation', () => {
    expect(slugify('Café   Déjà-vu!')).toBe('cafe-deja-vu');
  });

  it('falls back when the title has no latin characters', () => {
    expect(slugify('หน้าแรกของเรา', 'page-1')).toBe('page-1');
  });

  it('keeps the fallback for an empty title', () => {
    expect(slugify('   ')).toBe('page');
  });
});

describe('content schemas', () => {
  it('accepts a page with defaults', () => {
    const parsed = createContentInputSchema.parse({
      type: 'page',
      title: 'หน้าแรก',
      slug: 'home',
    });
    expect(parsed.locale).toBe('th');
    expect(parsed.blocks).toEqual([]);
    expect(parsed.seo.noindex).toBe(false);
  });

  it('rejects a slug with uppercase or spaces', () => {
    expect(() =>
      createContentInputSchema.parse({ type: 'page', title: 'x', slug: 'หน้า แรก' }),
    ).toThrow();
  });

  it('parses list filters from query strings', () => {
    const parsed = contentListQuerySchema.parse({ type: 'post', status: 'draft', limit: '5' });
    expect(parsed).toMatchObject({ type: 'post', status: 'draft', limit: 5 });
  });

  it('requires a positive base revision for autosave', () => {
    expect(() =>
      saveContentBlocksInputSchema.parse({ blocks: [], baseRevision: 0 }),
    ).toThrow();
    expect(saveContentBlocksInputSchema.parse({ blocks: [], baseRevision: 7 }).baseRevision).toBe(7);
  });

  it('guards content type and status values', () => {
    expect(isContentType('page')).toBe(true);
    expect(isContentType('widget')).toBe(false);
    expect(isContentStatus('published')).toBe(true);
    expect(isContentStatus('live')).toBe(false);
  });
});

describe('content trash', () => {
  const archivedAt = '2026-10-01T00:00:00.000Z';

  it('purges a page one retention window after it was archived', () => {
    const purgeAt = trashPurgeAt(archivedAt);
    expect(purgeAt).not.toBeNull();
    const days = (new Date(purgeAt as string).getTime() - new Date(archivedAt).getTime()) / 86_400_000;
    expect(days).toBe(CONTENT_TRASH_RETENTION_DAYS);
  });

  it('has nothing to purge when the page is not in the trash', () => {
    expect(trashPurgeAt(null)).toBeNull();
    expect(isTrashExpired(null)).toBe(false);
    expect(trashDaysLeft(null)).toBe(0);
  });

  it('counts the days left and clamps at zero once due', () => {
    const day5 = new Date('2026-10-06T00:00:00.000Z');
    expect(trashDaysLeft(archivedAt, day5)).toBe(CONTENT_TRASH_RETENTION_DAYS - 5);

    const overdue = new Date('2026-12-01T00:00:00.000Z');
    expect(trashDaysLeft(archivedAt, overdue)).toBe(0);
    expect(isTrashExpired(archivedAt, overdue)).toBe(true);
    expect(isTrashExpired(archivedAt, day5)).toBe(false);
  });

  it('accepts an optional note when saving a version', () => {
    expect(createContentVersionInputSchema.parse({}).note).toBeUndefined();
    expect(createContentVersionInputSchema.parse({ note: '  ก่อนแก้ราคา  ' }).note).toBe(
      'ก่อนแก้ราคา',
    );
    expect(() => createContentVersionInputSchema.parse({ note: 'x'.repeat(121) })).toThrow();
  });
});

describe('seoPatchSchema', () => {
  it('keeps every field optional so one screen can fix one field', () => {
    expect(seoPatchSchema.parse({ title: 'กาแฟบ้านดอย' })).toEqual({ title: 'กาแฟบ้านดอย' });
    expect(seoPatchSchema.parse({})).toEqual({});
  });

  it('never fills noindex with a default, so the flag is not cleared by accident', () => {
    expect(seoPatchSchema.parse({ description: 'คำอธิบายใหม่' }).noindex).toBeUndefined();
  });

  it('applies the same length limits as the stored meta text', () => {
    expect(() => seoPatchSchema.parse({ title: 'x'.repeat(71) })).toThrow();
    expect(() => seoPatchSchema.parse({ description: 'x'.repeat(161) })).toThrow();
  });
});
