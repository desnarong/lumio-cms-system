import { z } from 'zod';
import { localized, type ApiLocale } from './api-locale.js';
import { findPlan, quotaUsedPercent } from './billing.js';
import type { BlockNode } from './blocks.js';
import { aiSiteCommandProposalSchema } from './theme-command.js';

/**
 * AI assistant (docs/design/09-ai-assistant.md). The provider proposes text and
 * the API answers with a **proposal**: a list of before/after changes the admin
 * shows as a diff. Nothing is written until the user accepts, and every accepted
 * change goes through the normal editor/media screens, so it can be undone.
 *
 * The plan table already reserves "AI ครั้ง/เดือน" per plan, so quota lives with
 * billing (docs/design/18-deployment.md 18.6) and this module only counts actions.
 */

/** Rewrite styles the assistant understands, with the wording the admin shows. */
export const AI_REWRITE_STYLES = ['shorter', 'formal', 'friendly', 'expanded', 'clearer'] as const;
export type AiRewriteStyle = (typeof AI_REWRITE_STYLES)[number];

export const AI_REWRITE_LABELS: Record<AiRewriteStyle, string> = {
  shorter: 'ทำให้สั้นลง',
  formal: 'ทางการขึ้น',
  friendly: 'เป็นกันเองขึ้น',
  expanded: 'ขยายความ',
  clearer: 'อ่านง่ายขึ้น',
};

export const AI_REWRITE_LABELS_EN: Record<AiRewriteStyle, string> = {
  shorter: 'Shorter',
  formal: 'More formal',
  friendly: 'Friendlier',
  expanded: 'Expand',
  clearer: 'Easier to read',
};

export const aiRewriteLabel = (style: AiRewriteStyle, locale: ApiLocale = 'th'): string =>
  locale === 'en' ? AI_REWRITE_LABELS_EN[style] : AI_REWRITE_LABELS[style];

export const isAiRewriteStyle = (value: unknown): value is AiRewriteStyle =>
  typeof value === 'string' && (AI_REWRITE_STYLES as readonly string[]).includes(value);

/** Languages the assistant translates between (docs/design/17-i18n.md 17.1). */
export const AI_LOCALES = ['th', 'en'] as const;
export type AiLocale = (typeof AI_LOCALES)[number];

export const AI_LOCALE_LABELS: Record<AiLocale, string> = {
  th: 'ไทย',
  en: 'อังกฤษ',
};

export const AI_LOCALE_LABELS_EN: Record<AiLocale, string> = {
  th: 'Thai',
  en: 'English',
};

export const aiLocaleLabel = (locale: AiLocale, uiLocale: ApiLocale = 'th'): string =>
  uiLocale === 'en' ? AI_LOCALE_LABELS_EN[locale] : AI_LOCALE_LABELS[locale];

export const AI_ACTIONS = [
  'rewrite',
  'translate',
  'alt-text',
  'seo',
  'generate-site',
  'block-command',
] as const;
export type AiAction = (typeof AI_ACTIONS)[number];

/** One assistant action costs one plan credit (docs/design/09-ai-assistant.md 9.6). */
export const AI_TEXT_MAX = 2000;
export const AI_MAX_TEXTS = 5;
export const AI_ALT_TEXT_MAX = 125;
export const AI_SEO_TITLE_MAX = 60;
export const AI_SEO_DESCRIPTION_MAX = 160;

const textsField = z.array(z.string().trim().min(1).max(AI_TEXT_MAX)).min(1).max(AI_MAX_TEXTS);

export const aiRewriteInputSchema = z.object({
  texts: textsField,
  style: z.enum(AI_REWRITE_STYLES),
  /** Optional business context ("ร้านกาแฟ จังหวัดเชียงใหม่") so wording fits. */
  context: z.string().trim().max(200).optional(),
});
export type AiRewriteInput = z.infer<typeof aiRewriteInputSchema>;

export const aiTranslateInputSchema = z.object({
  texts: textsField,
  targetLocale: z.enum(AI_LOCALES),
  context: z.string().trim().max(200).optional(),
});
export type AiTranslateInput = z.infer<typeof aiTranslateInputSchema>;

export const aiAltTextInputSchema = z.object({
  mediaId: z.string().trim().min(1),
  /** Optional context from the page the image sits on. */
  context: z.string().trim().max(200).optional(),
});
export type AiAltTextInput = z.infer<typeof aiAltTextInputSchema>;

/** How many images one batch may describe; each one costs a quota item. */
export const AI_ALT_TEXT_BATCH_MAX = 20;

/**
 * "Describe every image that has none" (docs/design/09-ai-assistant.md 9.2):
 * the ids come from the media library's own filter, so the screen decides what
 * is missing a description and the assistant only writes the text.
 */
export const aiAltTextBatchInputSchema = z.object({
  mediaIds: z.array(z.string().trim().min(1)).min(1).max(AI_ALT_TEXT_BATCH_MAX),
});
export type AiAltTextBatchInput = z.infer<typeof aiAltTextBatchInputSchema>;

/** One image in a batch proposal, tied back to the row it belongs to. */
export const aiAltTextBatchItemSchema = z.object({
  mediaId: z.string(),
  filename: z.string(),
  /** Current description, empty when the image has none yet. */
  before: z.string(),
  after: z.string(),
});
export type AiAltTextBatchItem = z.infer<typeof aiAltTextBatchItemSchema>;

export const aiAltTextBatchResultSchema = z.object({
  items: z.array(aiAltTextBatchItemSchema),
  /** Images that already had a description and were left alone. */
  skipped: z.number().int().nonnegative(),
  provider: z.string(),
});
export type AiAltTextBatchResult = z.infer<typeof aiAltTextBatchResultSchema>;

/** How long the wizard prompt may be. */
export const AI_SITE_PROMPT_MAX = 400;

/**
 * "Draft my site from one sentence" (docs/design/09-ai-assistant.md 9.1). The
 * answer is a draft of the wizard's own answers, not a finished site: the
 * assistant proposes, the user confirms, and the wizard builds the pages.
 */
export const aiGenerateSiteInputSchema = z.object({
  prompt: z.string().trim().min(3, 'เล่าให้ฟังสักหน่อยว่าเว็บนี้ทำอะไร').max(AI_SITE_PROMPT_MAX),
  locale: z.enum(AI_LOCALES).default('th'),
});
export type AiGenerateSiteInput = z.infer<typeof aiGenerateSiteInputSchema>;

export const AI_SITE_BUSINESS_TYPES = ['restaurant', 'clinic', 'freelance'] as const;
export type AiSiteBusinessType = (typeof AI_SITE_BUSINESS_TYPES)[number];

export const aiSiteDraftPageSchema = z.object({
  title: z.string().trim().min(1).max(120),
  /** Short Thai explanation the wizard shows under the page name. */
  purpose: z.string().trim().max(200),
});

export const aiSiteDraftSchema = z.object({
  name: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(160),
  businessType: z.enum(AI_SITE_BUSINESS_TYPES),
  /** Id of one of the wizard's 6 style presets. */
  styleId: z.string(),
  primaryColor: z.string(),
  accentColor: z.string(),
  pages: z.array(aiSiteDraftPageSchema).min(3).max(6),
  provider: z.string(),
});
export type AiSiteDraft = z.infer<typeof aiSiteDraftSchema>;

export const aiSeoInputSchema = z.object({
  pageId: z.string().trim().min(1),
  /** Optional keyword the owner wants to rank for. */
  keyword: z.string().trim().max(80).optional(),
});
export type AiSeoInput = z.infer<typeof aiSeoInputSchema>;

/** How many text fields one block command may touch at once. */
export const AI_BLOCK_TEXTS_MAX = 6;

/** One text field of the selected block, with the path that writes it back. */
export const aiBlockTextSchema = z.object({
  path: z.string().trim().min(1).max(120),
  label: z.string().trim().max(80).default(''),
  value: z.string().max(AI_TEXT_MAX),
});
export type AiBlockText = z.infer<typeof aiBlockTextSchema>;

/**
 * แก้ข้อความที่เลือกให้เป็นทางการขึ้น: the assistant edits the block the owner
 * has selected in the editor (docs/design/09-ai-assistant.md 9.3). It answers with
 * a diff per field; nothing is saved until the owner accepts.
 */
export const aiBlockCommandInputSchema = z.object({
  pageId: z.string().trim().min(1),
  instruction: z.string().trim().min(3).max(300),
  texts: z.array(aiBlockTextSchema).min(1).max(AI_BLOCK_TEXTS_MAX),
});
export type AiBlockCommandInput = z.infer<typeof aiBlockCommandInputSchema>;

/** Which field of a change the admin applies; each maps to a real screen. */
export const AI_CHANGE_FIELDS = ['text', 'alt', 'title', 'description'] as const;
export type AiChangeField = (typeof AI_CHANGE_FIELDS)[number];

export const aiChangeSchema = z.object({
  field: z.enum(AI_CHANGE_FIELDS),
  /** Row label in the diff panel ("ข้อความหลัก", "คำอธิบายรูป"). */
  label: z.string(),
  before: z.string(),
  after: z.string(),
  /** Where to write the change (only block commands have one). */
  path: z.string().max(120).optional(),
});
export type AiChange = z.infer<typeof aiChangeSchema>;

export const aiProposalSchema = z.object({
  id: z.string(),
  action: z.enum(AI_ACTIONS),
  /** What the user asked for, in business wording. */
  label: z.string(),
  /** One-line summary shown above the diff. */
  summary: z.string(),
  changes: z.array(aiChangeSchema).min(1),
  /** Which engine answered, so the screen can say "โหมดตัวอย่าง". */
  provider: z.string(),
});
export type AiProposal = z.infer<typeof aiProposalSchema>;

/** Monthly usage of AI actions for the site. `null` limit means unlimited. */
export const aiUsageSchema = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative().nullable(),
  remaining: z.number().int().nonnegative().nullable(),
});
export type AiUsage = z.infer<typeof aiUsageSchema>;

export const aiResultSchema = z.object({
  proposal: aiProposalSchema,
  usage: aiUsageSchema,
});
export type AiResult = z.infer<typeof aiResultSchema>;

/** A whole-site instruction ("make every button orange") and its token patch. */
export const aiSiteCommandResultSchema = z.object({
  proposal: aiSiteCommandProposalSchema,
  usage: aiUsageSchema,
});
export type AiSiteCommandResult = z.infer<typeof aiSiteCommandResultSchema>;

/** Whether this site can use the assistant at all, and how much is left. */
export const aiStatusSchema = z.object({
  enabled: z.boolean(),
  plan: z.string(),
  planLabel: z.string(),
  provider: z.string(),
  usage: aiUsageSchema,
});
export type AiStatus = z.infer<typeof aiStatusSchema>;

/** AI actions per month from the plan table, or `null` when the plan has none. */
export const aiQuotaForPlan = (plan: string): number | null => findPlan(plan).quota.aiPerMonth;

export const aiUsageFor = (used: number, limit: number | null): AiUsage => ({
  used,
  limit,
  remaining: limit === null ? null : Math.max(0, limit - used),
});

export const aiQuotaPercent = (usage: AiUsage): number => quotaUsedPercent(usage.used, usage.limit);

export const isAiQuotaExhausted = (usage: AiUsage): boolean =>
  usage.limit !== null && usage.used >= usage.limit;

/** True with 20% or less left, so the screen can nudge before it runs out. */
export const isAiQuotaLow = (usage: AiUsage): boolean =>
  usage.remaining !== null &&
  usage.remaining > 0 &&
  usage.remaining <= Math.max(1, Math.ceil((usage.limit ?? 0) * 0.2));

export const aiQuotaMessage = (usage: AiUsage, locale: ApiLocale = 'th'): string => {
  if (usage.limit === null) return locale === 'en' ? 'Unlimited AI' : 'ใช้ AI ได้ไม่จำกัด';
  return locale === 'en'
    ? `Used ${usage.used} of ${usage.limit} this month`
    : `เดือนนี้ใช้ไป ${usage.used} จาก ${usage.limit} ครั้ง`;
};

export const collapseWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * Shortens text to `max` characters on a word boundary where one exists, so the
 * result never ends mid-word in languages that use spaces. Thai has no spaces,
 * so a long Thai run is cut at the limit with an ellipsis.
 */
export const truncateText = (text: string, max: number): string => {
  const clean = collapseWhitespace(text);
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max);
  const boundary = clipped.lastIndexOf(' ');
  const head = boundary >= Math.floor(max * 0.6) ? clipped.slice(0, boundary) : clipped;
  return `${head.trimEnd()}…`;
};

/** Thai text uses no sentence-ending spaces, so this trims politely by length. */
export const sentenceChunks = (text: string, maxChars: number): string[] => {
  const clean = collapseWhitespace(text);
  if (clean.length <= maxChars) return clean.length > 0 ? [clean] : [];
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    const boundary = window.lastIndexOf(' ');
    const cut = boundary >= Math.floor(maxChars * 0.6) ? boundary : maxChars;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length > 0) chunks.push(rest);
  return chunks;
};

/** One-line summary for a proposal, in the wording the diff panel shows. */
export const aiProposalSummary = (
  action: AiAction,
  changeCount: number,
  styleLabel: string | null = null,
  locale: ApiLocale = 'th',
): string => {
  const en = locale === 'en';
  switch (action) {
    case 'rewrite':
      return styleLabel
        ? en
          ? `${styleLabel} · ${changeCount} texts`
          : `${styleLabel} ${changeCount} ข้อความ`
        : en
          ? `${changeCount} texts rewritten`
          : `ปรับข้อความ ${changeCount} จุด`;
    case 'translate':
      return en ? `${changeCount} texts ready to translate` : `เตรียมคำแปล ${changeCount} ข้อความ`;
    case 'alt-text':
      return en ? 'Image description from the assistant' : 'คำอธิบายรูปที่ผู้ช่วยคิดให้';
    case 'seo':
      return en
        ? 'Search title and page description from the assistant'
        : 'ชื่อเรื่องและคำอธิบายหน้าที่ผู้ช่วยคิดให้';
    case 'generate-site':
      return en ? 'Site outline from the assistant' : 'โครงเว็บที่ผู้ช่วยร่างให้';
    case 'block-command':
      return en ? 'Selected text edited by the assistant' : 'ข้อความที่เลือกซึ่งผู้ช่วยปรับให้';
  }
};

export const AI_FIELD_LABELS = {
  altText: { th: 'คำอธิบายรูป', en: 'Image description' },
  seoTitle: { th: 'ชื่อเรื่องสำหรับค้นหา', en: 'Search title' },
  seoDescription: { th: 'คำอธิบายหน้า', en: 'Page description' },
  seoProposal: { th: 'แนะนำชื่อเรื่องสำหรับค้นหา', en: 'Search title suggestion' },
  siteCommand: { th: 'สั่งงานทั้งเว็บ', en: 'Whole-site command' },
  siteCommandSummary: {
    th: 'ปรับสีและสไตล์ให้ทุกส่วนของเว็บพร้อมกัน',
    en: 'Restyles every part of the site at once',
  },
  blockCommand: { th: 'แก้ข้อความในบล็อก', en: 'Edit the selected text' },
  blockCommandSummary: {
    th: 'ปรับข้อความที่เลือกตามที่คุณสั่ง',
    en: 'Changes the selected text as you asked',
  },
} as const;

export type AiFieldLabelKey = keyof typeof AI_FIELD_LABELS;

export const aiFieldLabel = (key: AiFieldLabelKey, locale: ApiLocale = 'th'): string =>
  localized(AI_FIELD_LABELS[key], locale);

/** Row label for one rewritten text; the number matches the text's position. */
export const aiTextChangeLabel = (
  index: number,
  count: number,
  locale: ApiLocale = 'th',
): string => {
  if (count === 1) return locale === 'en' ? 'Selected text' : 'ข้อความที่เลือก';
  return locale === 'en' ? `Text ${index + 1}` : `ข้อความที่ ${index + 1}`;
};

const readString = (value: unknown, key: string): string => {
  if (value === null || typeof value !== 'object') return '';
  const found = (value as Record<string, unknown>)[key];
  return typeof found === 'string' ? collapseWhitespace(found) : '';
};

/**
 * Headings found in a block tree, in reading order. The SEO assistant needs the
 * page's own words to suggest a title and description (docs/design/09-ai-assistant.md
 * 9.1 "SEO Assistant"), and both the API and the renderer read them here.
 */
export const collectHeadingTexts = (blocks: BlockNode[], limit = 5): string[] => {
  const found: string[] = [];
  const walk = (nodes: BlockNode[]): void => {
    for (const block of nodes) {
      if (found.length >= limit) return;
      if (block.type === 'heading') {
        const text = readString(block.props, 'text');
        if (text.length > 0) found.push(text);
      } else if (block.type === 'hero') {
        const heading = readString(block.props, 'heading');
        if (heading.length > 0) found.push(heading);
      } else if (block.type === 'features') {
        const heading = readString(block.props, 'heading');
        if (heading.length > 0) found.push(heading);
      }
      walk(block.children);
    }
  };
  walk(blocks);
  return found.slice(0, limit);
};

/** Body copy found in a block tree, used to draft a page description. */
export const collectBodyTexts = (blocks: BlockNode[], limit = 3): string[] => {
  const found: string[] = [];
  const walk = (nodes: BlockNode[]): void => {
    for (const block of nodes) {
      if (found.length >= limit) return;
      if (block.type === 'paragraph') {
        const text = readString(block.props, 'text');
        if (text.length > 0) found.push(text);
      } else if (block.type === 'hero') {
        const subheading = readString(block.props, 'subheading');
        if (subheading.length > 0) found.push(subheading);
      }
      walk(block.children);
    }
  };
  walk(blocks);
  return found.slice(0, limit);
};

/** One field the offline engine changed, in the shape both providers return. */
export interface AiBlockTextChange {
  path: string;
  after: string;
}

const QUOTED_TEXT = /["“”']([^"“”']{1,300})["“”']/;

/** Picks the field the instruction talks about, else the first one. */
const pickField = (
  instruction: string,
  texts: readonly { path: string; label?: string; value: string }[],
): { path: string; value: string } | null => {
  const mentioned = texts.find(
    (text) =>
      (text.label && instruction.includes(text.label)) ||
      (text.value.length > 2 && instruction.includes(text.value)),
  );
  return mentioned ?? texts[0] ?? null;
};

/**
 * The offline engine's parser for chat commands that edit the selected block
 * (docs/design/09-ai-assistant.md 9.3). It understands the everyday asks: make it
 * shorter, formal, friendlier, or replace it with a quoted sentence. Anything
 * else answers `null`, so the screen can say the command was not understood.
 */
export const blockCommandFromInstruction = (
  instruction: string,
  texts: readonly { path: string; label?: string; value: string }[],
): AiBlockTextChange[] | null => {
  const clean = collapseWhitespace(instruction);
  const field = pickField(clean, texts);
  if (!field) return null;
  const current = collapseWhitespace(field.value);

  const shorter = /สั้นลง|กระชับ|shorten|concise/i.test(clean);
  const formal = /ทางการ|สุภาพ|formal/i.test(clean);
  const friendly = /กันเอง|เป็นมิตร|friendly|อบอุ่น/i.test(clean);
  const quoted = QUOTED_TEXT.exec(clean)?.[1]?.trim();

  let after = '';
  if (shorter) after = truncateText(current, 60);
  else if (formal) after = collapseWhitespace(current.replace(/[!]+/g, ''));
  else if (friendly) after = collapseWhitespace(`${current} ทักมาคุยกันได้เลยนะ`);
  else if (quoted && quoted.length > 0) after = truncateText(quoted, AI_TEXT_MAX);

  if (after.length === 0 || after.trim() === current.trim()) return null;
  return [{ path: field.path, after }];
};

