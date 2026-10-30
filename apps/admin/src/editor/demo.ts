import { translateNow } from '@lumio/ui';
import { cloneTreeWithNewIds, createBlockNode, registerBuiltinBlocks } from '@lumio/blocks';
import {
  collectBlockTexts,
  mapBlockTexts,
  type BlockTree,
  type ContentDetail,
  type ContentListQuery,
  type ContentSummary,
  type ContentTranslations,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type CreateContentInput,
  type CreateContentVersionInput,
  type CreateTranslationInput,
  type SaveContentBlocksResult,
  type TranslateContentInput,
  type TranslateContentResult,
} from '@lumio/shared';
import { ApiError, type ContentApi, type PublishContentResult } from './api.js';

registerBuiltinBlocks();

export const DEMO_CONTENT_ID = 'demo-home';

/** Languages the demo site offers, so the language switcher has something to show. */
export const DEMO_LOCALES = ['th', 'en'] as const;

const demoBlocks = (): BlockTree => [
  createBlockNode('hero'),
  createBlockNode('features'),
  createBlockNode('paragraph'),
];

export const createDemoContent = (): ContentDetail => {
  const blocks = demoBlocks();
  const now = new Date().toISOString();
  return {
    id: DEMO_CONTENT_ID,
    type: 'page',
    access: 'public',
    title: 'หน้าแรก',
    slug: 'home',
    status: 'draft',
    locale: 'th',
    translationGroupId: DEMO_CONTENT_ID,
    excerpt: 'กาแฟคั่วสดใหม่ทุกเช้า ใจกลางเมืองเชียงใหม่',
    revision: 1,
    updatedAt: now,
    publishedAt: null,
    archivedAt: null,
    blocks,
    publishedBlocks: null,
    seo: { title: 'กาแฟบ้านดอย', description: 'กาแฟคั่วเอง ชงมือ', noindex: false },
    createdAt: now,
  };
};

const summaryOf = (detail: ContentDetail): ContentSummary => ({
  id: detail.id,
  type: detail.type,
  title: detail.title,
  slug: detail.slug,
  status: detail.status,
  locale: detail.locale,
  translationGroupId: detail.translationGroupId,
  access: detail.access,
  excerpt: detail.excerpt,
  revision: detail.revision,
  updatedAt: detail.updatedAt,
  publishedAt: detail.publishedAt,
  archivedAt: detail.archivedAt,
});

/**
 * In-memory stand-in for the contents API so the editor and the content lists run
 * before the backend is configured. It keeps the same optimistic-lock contract as
 * the real API.
 */
export const createDemoContentApi = (): ContentApi => {
  const store = new Map<string, ContentDetail>();
  const home = createDemoContent();
  store.set(home.id, home);

  const snapshots = new Map<string, BlockTree>();
  const versions = new Map<string, ContentVersionSummary[]>();
  let counter = 0;

  const require = (contentId: string): ContentDetail => {
    const found = store.get(contentId);
    if (!found) throw new ApiError('not_found', translateNow('demo.pageNotFound'), 404);
    return found;
  };

  return {
    listPages: async () =>
      [...store.values()].filter((item) => item.type === 'page').map(summaryOf),

    list: async (query: Partial<ContentListQuery>) => {
      const search = query.q?.trim().toLowerCase() ?? '';
      const items = [...store.values()]
        .filter((item) => !query.type || item.type === query.type)
        .filter((item) => !query.status || item.status === query.status)
        .filter((item) => !query.locale || item.locale === query.locale)
        .filter((item) => search.length === 0 || item.title.toLowerCase().includes(search))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(summaryOf);

      return { items: items.slice(0, query.limit ?? 20), cursor: null };
    },

    create: async (input: CreateContentInput) => {
      counter += 1;
      const now = new Date().toISOString();
      const id = `demo-content-${counter}`;
      const detail: ContentDetail = {
        id,
        type: input.type,
        access: input.access ?? 'public',
        title: input.title,
        slug: input.slug,
        status: 'draft',
        locale: input.locale,
        translationGroupId: id,
        excerpt: input.excerpt ?? null,
        revision: 1,
        updatedAt: now,
        publishedAt: null,
        archivedAt: null,
        blocks: input.blocks,
        publishedBlocks: null,
        seo: input.seo,
        createdAt: now,
      };
      store.set(detail.id, detail);
      return summaryOf(detail);
    },

    remove: async (contentId) => {
      require(contentId);
      store.delete(contentId);
      versions.delete(contentId);
    },

    update: async (contentId, input) => {
      const current = require(contentId);
      const nextStatus = input.status ?? current.status;
      const updated: ContentDetail = {
        ...current,
        title: input.title ?? current.title,
        slug: input.slug ?? current.slug,
        excerpt: input.excerpt ?? current.excerpt,
        status: nextStatus,
        seo: input.seo ?? current.seo,
        archivedAt: nextStatus === 'archived' ? (current.archivedAt ?? new Date().toISOString()) : null,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      store.set(contentId, updated);
      return summaryOf(updated);
    },

    getContent: async (contentId) => require(contentId),

    updateSeo: async (contentId, patch) => {
      const current = require(contentId);
      const updated: ContentDetail = {
        ...current,
        seo: { ...current.seo, ...patch },
        updatedAt: new Date().toISOString(),
      };
      store.set(contentId, updated);
      return updated;
    },

    saveBlocks: async (contentId, input): Promise<SaveContentBlocksResult> => {
      const current = require(contentId);
      if (input.baseRevision !== current.revision) {
        throw new ApiError('conflict', translateNow('demo.conflictOther'), 409);
      }
      const savedAt = new Date().toISOString();
      store.set(contentId, {
        ...current,
        blocks: input.blocks,
        revision: current.revision + 1,
        updatedAt: savedAt,
      });
      return { revision: current.revision + 1, savedAt };
    },

    publish: async (contentId): Promise<PublishContentResult> => {
      const current = require(contentId);
      const versionId = `demo-version-${(versions.get(contentId)?.length ?? 0) + 1}`;
      snapshots.set(versionId, current.blocks);
      const publishedAt = new Date().toISOString();
      versions.set(contentId, [
        {
          id: versionId,
          note: 'เผยแพร่',
          createdAt: publishedAt,
          authorId: null,
          authorName: 'คุณสมชาย',
          blockCount: current.blocks.length,
        },
        ...(versions.get(contentId) ?? []),
      ]);
      store.set(contentId, {
        ...current,
        status: 'published',
        publishedBlocks: current.blocks,
        publishedAt,
      });
      return { revision: current.revision, publishedAt };
    },

    createPreviewLink: async (contentId) => {
      require(contentId);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      return { url: `https://demo.example.com/preview/demo-${contentId}`, expiresAt };
    },

    listVersions: async (contentId) => versions.get(contentId) ?? [],

    getVersion: async (contentId, versionId): Promise<ContentVersionDetail> => {
      const summary = (versions.get(contentId) ?? []).find((item) => item.id === versionId);
      if (!summary) throw new ApiError('not_found', translateNow('demo.versionNotFound'), 404);
      return { ...summary, blocks: snapshots.get(versionId) ?? [] };
    },

    createVersion: async (contentId, input: CreateContentVersionInput) => {
      const current = require(contentId);
      const versionId = `demo-version-${(versions.get(contentId)?.length ?? 0) + 1}`;
      snapshots.set(versionId, current.blocks);
      const summary: ContentVersionSummary = {
        id: versionId,
        note: input.note && input.note.length > 0 ? input.note : 'บันทึกไว้เอง',
        createdAt: new Date().toISOString(),
        authorId: null,
        authorName: 'คุณสมชาย',
        blockCount: current.blocks.length,
      };
      versions.set(contentId, [summary, ...(versions.get(contentId) ?? [])]);
      return summary;
    },

    restoreVersion: async (contentId, versionId): Promise<SaveContentBlocksResult> => {
      const blocks = snapshots.get(versionId);
      if (!blocks) throw new ApiError('not_found', translateNow('demo.versionNotFound'), 404);
      const current = require(contentId);
      const savedAt = new Date().toISOString();
      store.set(contentId, {
        ...current,
        blocks,
        revision: current.revision + 1,
        updatedAt: savedAt,
      });
      return { revision: current.revision + 1, savedAt };
    },

    restore: async (contentId) => {
      const current = require(contentId);
      if (current.status !== 'archived') {
        throw new ApiError('conflict', translateNow('demo.notInTrash'), 409);
      }
      const restored: ContentDetail = {
        ...current,
        status: 'draft',
        archivedAt: null,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      store.set(contentId, restored);
      return restored;
    },

    translations: async (contentId): Promise<ContentTranslations> => {
      const current = require(contentId);
      const groupId = current.translationGroupId;
      const items = DEMO_LOCALES.map((locale) => {
        const match = [...store.values()].find(
          (item) =>
            item.type === current.type &&
            item.translationGroupId === groupId &&
            item.locale === locale,
        );
        return {
          locale,
          contentId: match?.id ?? null,
          title: match?.title ?? null,
          slug: match?.slug ?? null,
          status: match?.status ?? null,
          exists: Boolean(match),
        };
      });

      return { groupId, defaultLocale: 'th', items };
    },

    createTranslation: async (contentId, input: CreateTranslationInput): Promise<ContentDetail> => {
      const current = require(contentId);
      if (current.locale === input.locale) {
        throw new ApiError('conflict', translateNow('demo.alreadyThatLocale'), 409);
      }

      counter += 1;
      const id = `demo-content-${counter}`;
      const now = new Date().toISOString();
      const detail: ContentDetail = {
        ...current,
        id,
        title: input.title ?? current.title,
        slug: input.slug ?? current.slug,
        locale: input.locale,
        status: 'draft',
        blocks: cloneTreeWithNewIds(current.blocks),
        publishedBlocks: null,
        revision: 1,
        publishedAt: null,
        archivedAt: null,
        updatedAt: now,
        createdAt: now,
      };
      store.set(id, detail);
      return detail;
    },

    /** Demo stand-in: marks text as English with an `(en)` tag instead of calling AI. */
    translateContent: async (
      contentId,
      input: TranslateContentInput,
    ): Promise<TranslateContentResult> => {
      const current = require(contentId);
      const total = collectBlockTexts(current.blocks).length;
      let translatedCount = 0;
      const blocks = mapBlockTexts(current.blocks, (text) => {
        if (text.startsWith('(en) ')) {
          if (input.onlyMissing) return text;
          translatedCount += 1;
          return text;
        }
        translatedCount += 1;
        return `(en) ${text.trim()}`;
      });
      return { translatedCount, totalCount: total, blocks };
    },
  };
};
