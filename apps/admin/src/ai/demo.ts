import {
  AI_ALT_TEXT_MAX,
  AI_SEO_DESCRIPTION_MAX,
  AI_SEO_TITLE_MAX,
  aiFieldLabel,
  aiQuotaForPlan,
  aiUsageFor,
  blockCommandFromInstruction,
  collapseWhitespace,
  normalizeThemeTokens,
  planLabel,
  sentenceChunks,
  themeCommandFromInstruction,
  truncateText,
  type AiChange,
  type AiProposal,
  type AiResult,
  type AiRewriteStyle,
  type AiSiteDraft,
  type AiStatus,
} from '@lumio/shared';
import { translateNow, uiLocaleNow } from '@lumio/ui';
import { demoItems } from '../wizard/demo.js';
import type { AiApi } from './api.js';

/**
 * In-memory assistant for demo mode (no `VITE_API_URL`), so the whole flow
 * (ask, read the diff, accept) can be walked through before a backend or an AI
 * key exists. The wording is deliberately generic; the real engine reads the
 * site's own content.
 */

const DEMO_PLAN = 'pro';
const DEMO_USED_AT_START = 12;
const DEMO_SITE_NAME = 'กาแฟบ้านดอย';
/** The same tokens the demo Design screens start with, so the diff is truthful. */
const DEMO_THEME = normalizeThemeTokens(demoItems[0]?.tokens ?? {});

const STYLE_KEYS: Record<
  AiRewriteStyle,
  | 'ai.style.shorter'
  | 'ai.style.formal'
  | 'ai.style.friendly'
  | 'ai.style.expanded'
  | 'ai.style.clearer'
> = {
  shorter: 'ai.style.shorter',
  formal: 'ai.style.formal',
  friendly: 'ai.style.friendly',
  expanded: 'ai.style.expanded',
  clearer: 'ai.style.clearer',
};

const changeLabel = (index: number, total: number): string =>
  total === 1
    ? translateNow('ai.demo.changeOne')
    : translateNow('ai.demo.changeN', { index: index + 1 });

const rewrite = (text: string, style: AiRewriteStyle): string => {
  const clean = collapseWhitespace(text);
  switch (style) {
    case 'shorter':
      return truncateText(clean, 60);
    case 'formal':
      return collapseWhitespace(clean.replace(/!+/g, ''));
    case 'friendly':
      return collapseWhitespace(`${clean} ทักมาคุยกันได้เลยนะคะ`);
    case 'expanded':
      return collapseWhitespace(`${clean} เราตั้งใจทำทุกขั้นตอนเพื่อให้คุณมั่นใจ`);
    case 'clearer':
      return sentenceChunks(clean, 80).join(' ');
  }
};

const demoAltText = (context?: string): string =>
  truncateText(`ภาพ: ${context?.trim() || 'บรรยากาศร้านกาแฟ'}`, AI_ALT_TEXT_MAX);

const demoTags = (keyword?: string): { title: string; description: string } => {
  const focus = keyword?.trim();
  return {
    title: truncateText(
      focus ? `${focus} – ${DEMO_SITE_NAME}` : `${DEMO_SITE_NAME} คั่วสดทุกสัปดาห์`,
      AI_SEO_TITLE_MAX,
    ),
    description: truncateText(
      `ร้านกาแฟ${DEMO_SITE_NAME}${focus ? ` ${focus}` : ''} คั่วเมล็ดใหม่ทุกสัปดาห์ ส่งตรงถึงบ้านคุณ`,
      AI_SEO_DESCRIPTION_MAX,
    ),
  };
};

export const createDemoAiApi = (): AiApi => {
  let used = DEMO_USED_AT_START;
  const limit = aiQuotaForPlan(DEMO_PLAN);
  let counter = 0;

  const proposal = (
    action: AiProposal['action'],
    label: string,
    summary: string,
    changes: AiChange[],
  ): AiProposal => {
    counter += 1;
    return {
      id: `demo-ai-${counter}`,
      action,
      label,
      summary,
      changes,
      provider: 'demo',
    };
  };

  const finish = (built: AiProposal): AiResult => {
    used += 1;
    return { proposal: built, usage: aiUsageFor(used, limit) };
  };

  return {
    status: async (): Promise<AiStatus> => ({
      enabled: limit !== null,
      plan: DEMO_PLAN,
      planLabel: planLabel(DEMO_PLAN, uiLocaleNow()),
      provider: 'demo',
      usage: aiUsageFor(used, limit),
    }),

    rewrite: async ({ texts, style }) => {
      const after = texts.map((text) => rewrite(text, style));
      return finish(
        proposal(
          'rewrite',
          translateNow(STYLE_KEYS[style]),
          translateNow('ai.summary.rewrite', {
            style: translateNow(STYLE_KEYS[style]),
            count: after.length,
          }),
          after.map((value, index) => ({
            field: 'text',
            label: changeLabel(index, after.length),
            before: texts[index] ?? '',
            after: value,
          })),
        ),
      );
    },

    translate: async ({ texts, targetLocale }) => {
      const label =
        targetLocale === 'en'
          ? translateNow('ai.demo.translateEn')
          : translateNow('ai.demo.translateTh');
      const after = texts.map((text) => `(${targetLocale}) ${collapseWhitespace(text)}`);
      return finish(
        proposal(
          'translate',
          label,
          translateNow('ai.summary.translate', { count: after.length }),
          after.map((value, index) => ({
            field: 'text',
            label: changeLabel(index, after.length),
            before: texts[index] ?? '',
            after: value,
          })),
        ),
      );
    },

    altText: async ({ context }) =>
      finish(
        proposal('alt-text', translateNow('ai.demo.altLabel'), translateNow('ai.summary.altText'), [
          {
            field: 'alt',
            label: translateNow('ai.demo.altLabel'),
            before: '',
            after: demoAltText(context),
          },
        ]),
      ),

    seo: async ({ keyword }) => {
      const tags = demoTags(keyword);
      return finish(
        proposal('seo', translateNow('ai.demo.seoProposal'), translateNow('ai.summary.seo'), [
          {
            field: 'title',
            label: translateNow('ai.demo.seoTitleLabel'),
            before: '',
            after: tags.title,
          },
          {
            field: 'description',
            label: translateNow('ai.demo.seoDescriptionLabel'),
            before: '',
            after: tags.description,
          },
        ]),
      );
    },

    blockCommand: async ({ instruction, texts }) => {
      const changes = blockCommandFromInstruction(instruction, texts);
      if (!changes) {
        throw new Error(translateNow('ai.demo.blockUnclear'));
      }

      const byPath = new Map(texts.map((text) => [text.path, text]));
      return finish(
        proposal(
          'block-command',
          translateNow('ai.demo.blockLabel'),
          translateNow('ai.summary.blockCommand'),
          changes.map((change) => ({
            field: 'text' as const,
            label: byPath.get(change.path)?.label || translateNow('ai.demo.blockLabel'),
            before: byPath.get(change.path)?.value ?? '',
            after: change.after,
            path: change.path,
          })),
        ),
      );
    },

    altTextBatch: async ({ mediaIds }) => {
      // One credit per image, like the real endpoint.
      used += mediaIds.length;
      return {
        items: mediaIds.map((mediaId, index) => ({
          mediaId,
          filename: `demo-image-${index + 1}.jpg`,
          before: '',
          after: demoAltText(DEMO_SITE_NAME),
        })),
        skipped: 0,
        provider: 'demo',
      };
    },

    generateSite: async ({ prompt }): Promise<AiSiteDraft> => {
      used += 1;
      return {
        name: collapseWhitespace(prompt).slice(0, 60) || DEMO_SITE_NAME,
        tagline: collapseWhitespace(prompt).slice(0, 160),
        businessType: 'restaurant',
        styleId: 'warm',
        primaryColor: '#8B5E3C',
        accentColor: '#C98A5B',
        pages: [
          { title: 'หน้าแรก', purpose: 'แนะนำร้านและจุดเด่น' },
          { title: 'เมนู', purpose: 'รายการอาหารและเครื่องดื่ม' },
          { title: 'เกี่ยวกับเรา', purpose: 'เรื่องราวของร้าน' },
          { title: 'ติดต่อเรา', purpose: 'ที่อยู่และเวลาเปิด' },
        ],
        provider: 'demo',
      };
    },

    siteCommand: async ({ instruction }) => {
      const locale = uiLocaleNow();
      const command = themeCommandFromInstruction(instruction, DEMO_THEME, locale);
      if (!command) throw new Error(translateNow('ai.chat.unclear'));

      used += 1;
      counter += 1;
      return {
        proposal: {
          id: `demo-ai-${counter}`,
          action: 'site-command' as const,
          label: aiFieldLabel('siteCommand', locale),
          summary: aiFieldLabel('siteCommandSummary', locale),
          changes: command.changes,
          patch: command.patch,
          inversePatch: command.inversePatch,
          provider: 'demo',
        },
        usage: aiUsageFor(used, limit),
      };
    },
  };
};
