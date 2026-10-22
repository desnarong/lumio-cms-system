import {
  AI_ALT_TEXT_MAX,
  AI_REWRITE_LABELS,
  AI_SEO_DESCRIPTION_MAX,
  AI_SEO_TITLE_MAX,
  AI_LOCALE_LABELS,
  AI_SITE_BUSINESS_TYPES,
  AI_TEXT_MAX,
  blockCommandFromInstruction,
  COLOR_PALETTES,
  collapseWhitespace,
  sentenceChunks,
  themeCommandFromInstruction,
  themeCommandFromPatch,
  themeTokensPatchSchema,
  truncateText,
  type AiLocale,
  type AiRewriteStyle,
  type AiSiteBusinessType,
  type AiSiteDraft,
  type ApiLocale,
  type ThemeCommand,
} from '@lumio/shared';
import { aiApiKey, aiBaseUrl, aiModel, aiProviderName, aiTimeoutMs } from './ai.config.js';

/** Injection token so tests can answer with a stub engine (no network, no key). */
export const AI_PROVIDER = 'LUMIO_AI_PROVIDER';

export interface AiRewriteRequest {
  texts: string[];
  style: AiRewriteStyle;
  context?: string;
}

export interface AiTranslateRequest {
  texts: string[];
  targetLocale: AiLocale;
  context?: string;
}

export interface AiAltTextRequest {
  filename: string;
  folder?: string | null;
  context?: string;
}

export interface AiSeoRequest {
  /** The page's own title, always available. */
  title: string;
  headings: string[];
  body: string[];
  keyword?: string;
}

export interface AiSeoResult {
  title: string;
  description: string;
}

export interface AiSiteRequest {
  /** What the owner typed in the wizard, e.g. "ร้านกาแฟเล็ก ๆ ในเชียงใหม่". */
  prompt: string;
  locale: AiLocale;
}

export interface AiBlockCommandRequest {
  instruction: string;
  /** The selected block's texts, with the paths the editor writes back. */
  texts: { path: string; label: string; value: string }[];
  locale: ApiLocale;
}

export interface AiBlockCommandResult {
  changes: { path: string; after: string }[];
}

export interface AiSiteCommandRequest {
  /** One sentence from the assistant's chat, e.g. "เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม". */
  instruction: string;
  /** The site's current tokens, so the diff shows real before/after values. */
  tokens: unknown;
  /** Language of the diff labels. */
  locale: ApiLocale;
}

export type AiProviderAction =
  | 'rewrite'
  | 'translate'
  | 'alt-text'
  | 'seo'
  | 'generate-site'
  | 'site-command'
  | 'block-command';

/**
 * The engine behind the assistant. Every action returns text only: the service
 * turns it into a proposal and the admin decides whether to apply it, so a wrong
 * answer can never touch the site by itself (docs/design/09-ai-assistant.md 9.2).
 */
export interface AiProvider {
  readonly name: string;
  readonly model: string;
  /** False for actions this engine cannot do, so the screen can say why. */
  supports(action: AiProviderAction): boolean;
  rewrite(request: AiRewriteRequest): Promise<string[]>;
  translate(request: AiTranslateRequest): Promise<string[]>;
  altText(request: AiAltTextRequest): Promise<string>;
  seo(request: AiSeoRequest): Promise<AiSeoResult>;
  /** Drafts the wizard's answers from one sentence (docs/design/09-ai-assistant.md 9.1). */
  generateSite(request: AiSiteRequest): Promise<AiSiteDraft>;
  /** Turns a whole-site instruction into a design-token patch (9.1 "ผู้ช่วยในแชท"). */
  siteCommand(request: AiSiteCommandRequest): Promise<ThemeCommand>;
  /** Edits the text of the block the owner has selected (9.3). */
  blockCommand(request: AiBlockCommandRequest): Promise<AiBlockCommandResult>;
}

/** Raised when the engine cannot answer; the service turns it into Thai copy. */
export class AiProviderError extends Error {}

/**
 * Drops emoji, their variation selectors and the zero-width joiner; polite copy
 * does not need them. Written without a character class so no combining mark is
 * matched on its own.
 */
const EMOJI = /\p{Extended_Pictographic}\u{FE0F}?|\u{200D}/gu;

/** Removes emoji and their joiners, so formal copy reads as plain text. */
export const stripEmoji = (text: string): string => text.replace(EMOJI, '');

export const formalizeText = (text: string): string =>
  collapseWhitespace(stripEmoji(text).replace(/!+/g, ''));

export const friendlyText = (text: string, context?: string): string =>
  collapseWhitespace(
    `${stripEmoji(text)} ${context ? `สนใจ${context} ทักมาคุยกันได้เลยนะคะ` : 'ทักมาคุยกันได้เลยนะคะ'}`,
  );

export const expandText = (text: string, context?: string): string =>
  collapseWhitespace(
    `${text} ${context ? `เราดูแล${context}อย่างใส่ใจในทุกขั้นตอน` : 'เราตั้งใจทำทุกขั้นตอนเพื่อให้คุณมั่นใจ'}`,
  );

/** Re-flows long text into short sentences, the way a careful editor would. */
export const clearText = (text: string): string => sentenceChunks(text, 80).join(' ');

/** Keeps roughly 60% of the text, on a word boundary where the language has one. */
export const shortenText = (text: string): string => {
  const clean = collapseWhitespace(text);
  const target = Math.max(24, Math.floor(clean.length * 0.6));
  return truncateText(clean, target);
};

const STOP_WORDS = new Set([
  'img',
  'image',
  'images',
  'photo',
  'photos',
  'pic',
  'picture',
  'final',
  'copy',
  'dsc',
  'screenshot',
  'untitled',
  'resized',
]);

/** Filenames rarely read well as alt text, so this keeps only useful words. */
export const wordsFromFilename = (filename: string): string[] =>
  filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_+\-.]+/g, ' ')
    .replace(/[0-9]+/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word.toLowerCase()));

export const altTextFrom = ({ filename, folder, context }: AiAltTextRequest): string => {
  const words = wordsFromFilename(filename).join(' ');
  const subject = words.length > 0 ? words : (folder ?? '').trim() || 'ภาพประกอบ';
  const detail = context ? `${subject} (${collapseWhitespace(context)})` : subject;
  return truncateText(`ภาพ: ${detail}`, AI_ALT_TEXT_MAX);
};

export const seoFrom = ({ title, headings, body, keyword }: AiSeoRequest): AiSeoResult => {
  const heading = headings[0] ?? '';
  const keyworded =
    keyword && heading.length > 0 && !heading.includes(keyword) ? `${heading} ${keyword}` : heading;
  const seoTitle = truncateText(keyworded || title, AI_SEO_TITLE_MAX);
  const source = body[0] || headings[1] || keyworded || title;
  return {
    title: seoTitle.length > 0 ? seoTitle : truncateText(title, AI_SEO_TITLE_MAX),
    description: truncateText(source, AI_SEO_DESCRIPTION_MAX),
  };
};

/** Words that point at a business type, checked in order. */
const BUSINESS_KEYWORDS: ReadonlyArray<{ type: AiSiteBusinessType; words: readonly string[] }> = [
  {
    type: 'clinic',
    words: ['คลินิก', 'ทันตกรรม', 'หมอ', 'แพทย์', 'สุขภาพ', 'รักษา', 'ความงาม', 'ผิว', 'โรงพยาบาล'],
  },
  {
    type: 'restaurant',
    words: [
      'ร้านอาหาร',
      'ร้านกาแฟ',
      'คาเฟ่',
      'กาแฟ',
      'อาหาร',
      'เบเกอรี่',
      'ของหวาน',
      'หมูกระทะ',
      'ร้าน',
    ],
  },
  {
    type: 'freelance',
    words: [
      'ฟรีแลนซ์',
      'ออกแบบ',
      'กราฟิก',
      'ที่ปรึกษา',
      'ถ่ายรูป',
      'โปรแกรมเมอร์',
      'พอร์ต',
      'portfolio',
    ],
  },
];

/** Page plans per business type, so the draft always has 4 sensible pages. */
const PAGE_PLANS: Record<AiSiteBusinessType, ReadonlyArray<{ title: string; purpose: string }>> = {
  restaurant: [
    { title: 'หน้าแรก', purpose: 'แนะนำร้านและจุดเด่น' },
    { title: 'เมนู', purpose: 'รายการอาหารและเครื่องดื่มพร้อมราคา' },
    { title: 'เกี่ยวกับเรา', purpose: 'เรื่องราวของร้านและทีมงาน' },
    { title: 'ติดต่อเรา', purpose: 'ที่อยู่ เวลาเปิด และแผนที่' },
  ],
  clinic: [
    { title: 'หน้าแรก', purpose: 'แนะนำคลินิกและบริการเด่น' },
    { title: 'บริการ', purpose: 'รายการบริการและขั้นตอน' },
    { title: 'ทีมแพทย์', purpose: 'ประวัติและความเชี่ยวชาญของทีม' },
    { title: 'ติดต่อเรา', purpose: 'นัดหมาย ที่อยู่ และเบอร์โทร' },
  ],
  freelance: [
    { title: 'หน้าแรก', purpose: 'แนะนำตัวและผลงานเด่น' },
    { title: 'ผลงาน', purpose: 'ตัวอย่างงานที่ผ่านมา' },
    { title: 'บริการและราคา', purpose: 'ขอบเขตงานและอัตราค่าบริการ' },
    { title: 'ติดต่อเรา', purpose: 'ช่องทางคุยงานและฟอร์มติดต่อ' },
  ],
};

const DEFAULT_NAMES: Record<AiSiteBusinessType, string> = {
  restaurant: 'ร้านกาแฟของฉัน',
  clinic: 'คลินิกของฉัน',
  freelance: 'สตูดิโอของฉัน',
};

/** Style preset each business type starts from (docs/design/08 8.2). */
const STYLE_BY_TYPE: Record<AiSiteBusinessType, string> = {
  restaurant: 'warm',
  clinic: 'soft',
  freelance: 'minimal',
};

/** Palette id each business type starts from, chosen from the wizard's set. */
const PALETTE_BY_TYPE: Record<AiSiteBusinessType, string> = {
  restaurant: 'amber-calm',
  clinic: 'sky-calm',
  freelance: 'slate-calm',
};

/** The type a sentence describes; anything unknown becomes a service business. */
export const businessTypeFrom = (prompt: string): AiSiteBusinessType => {
  const text = prompt.toLowerCase();
  for (const entry of BUSINESS_KEYWORDS) {
    if (entry.words.some((word) => text.includes(word))) return entry.type;
  }
  return 'freelance';
};

/** Trims the sentence down to something a Thai site name can be. */
export const siteNameFrom = (prompt: string, type: AiSiteBusinessType): string => {
  const cleaned = collapseWhitespace(
    prompt
      .replace(
        /(อยากได้|ต้องการ|ช่วย|ทำ|สร้าง)?\s*เว็บ(ไซต์)?(ใหม่)?(ให้)?(ที|หน่อย|ครับ|ค่ะ|คะ)?/g,
        ' ',
      )
      .replace(/^(ขอ|ช่วย)\s*/, ' '),
  );
  const name = truncateText(cleaned, 60);
  return name.length >= 3 ? name : DEFAULT_NAMES[type];
};

const paletteFor = (type: AiSiteBusinessType): { primary: string; accent: string } => {
  const wanted = PALETTE_BY_TYPE[type];
  const palette = COLOR_PALETTES.find((entry) => entry.id === wanted) ?? COLOR_PALETTES[0];
  return palette
    ? { primary: palette.primary, accent: palette.accent }
    : { primary: '#8B5E3C', accent: '#C98A5B' };
};

/**
 * The key-free draft: a rule-based reading of the sentence that still produces a
 * usable starting point (name, business type, palette, four pages). It never
 * invents page copy, because the wizard's template fills the blocks.
 */
export const siteDraftFrom = ({ prompt }: AiSiteRequest): AiSiteDraft => {
  const businessType = businessTypeFrom(prompt);
  const palette = paletteFor(businessType);

  return {
    name: siteNameFrom(prompt, businessType),
    tagline: truncateText(collapseWhitespace(prompt), 160),
    businessType,
    styleId: STYLE_BY_TYPE[businessType],
    primaryColor: palette.primary,
    accentColor: palette.accent,
    pages: PAGE_PLANS[businessType].map((page) => ({ ...page })),
    provider: 'local',
  };
};

const rewriteOne = (text: string, style: AiRewriteStyle, context?: string): string => {
  switch (style) {
    case 'shorter':
      return shortenText(text);
    case 'formal':
      return formalizeText(text);
    case 'friendly':
      return friendlyText(text, context);
    case 'expanded':
      return expandText(text, context);
    case 'clearer':
      return clearText(text);
  }
};

/**
 * The built-in engine: text tools with no key and no network, so the whole flow
 * (proposal, diff, accept) can be used before an AI provider is configured. It
 * genuinely rewrites, writes alt text and drafts meta tags; translation and
 * site generation need a real model and report that instead of inventing text.
 */
export class LocalAiProvider implements AiProvider {
  readonly name = 'local';
  readonly model = 'lumio-local';

  supports(action: AiProviderAction): boolean {
    // The local engine drafts a structure from keywords; it cannot translate.
    return action !== 'translate';
  }

  async rewrite({ texts, style, context }: AiRewriteRequest): Promise<string[]> {
    return texts.map((text) => rewriteOne(text, style, context));
  }

  async translate({ targetLocale }: AiTranslateRequest): Promise<string[]> {
    throw new AiProviderError(
      `การแปลเป็น${AI_LOCALE_LABELS[targetLocale]}ต้องใช้ผู้ให้บริการ AI กรุณาตั้งค่า AI_PROVIDER=openai และ AI_API_KEY ก่อน`,
    );
  }

  async altText(request: AiAltTextRequest): Promise<string> {
    return altTextFrom(request);
  }

  async seo(request: AiSeoRequest): Promise<AiSeoResult> {
    return seoFrom(request);
  }

  async generateSite(request: AiSiteRequest): Promise<AiSiteDraft> {
    return siteDraftFrom(request);
  }

  async blockCommand({
    instruction,
    texts,
    locale,
  }: AiBlockCommandRequest): Promise<AiBlockCommandResult> {
    const changes = blockCommandFromInstruction(instruction, texts);
    if (!changes) {
      throw new AiProviderError(
        locale === 'en'
          ? 'The assistant did not understand that command. Try "make it shorter" or "change it to …".'
          : 'ผู้ช่วยยังไม่เข้าใจคำสั่งนี้ ลองบอกเช่น "ทำให้สั้นลง" หรือ "เปลี่ยนเป็น …"',
      );
    }
    return { changes };
  }

  async siteCommand({ instruction, tokens, locale }: AiSiteCommandRequest): Promise<ThemeCommand> {
    // Tokens are the one thing the offline engine can change safely: the command
    // maps to a known palette entry and the diff shows the exact hex values.
    const command = themeCommandFromInstruction(instruction, tokens, locale);
    if (!command) {
      throw new AiProviderError(
        locale === 'en'
          ? 'The assistant did not understand that command. Try "make every button orange" or "use rounder corners".'
          : 'ผู้ช่วยยังไม่เข้าใจคำสั่งนี้ ลองบอกเช่น "เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม" หรือ "ทำมุมให้โค้งขึ้น"',
      );
    }
    return command;
  }
}

const SYSTEM_PROMPT =
  'คุณเป็นผู้ช่วยเขียนเนื้อหาเว็บไซต์ภาษาไทย ตอบกลับเป็น JSON ตามรูปแบบที่กำหนดเท่านั้น ห้ามมีข้อความอื่นปน';

const jsonFrom = (content: string): unknown => {
  const trimmed = content
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new AiProviderError('ผู้ช่วย AI ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองอีกครั้ง');
  }
};

interface OpenAiCompatibleOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  /** Injectable so tests never reach the network. */
  fetchImpl?: typeof fetch;
}

/**
 * Any OpenAI-compatible chat endpoint (OpenAI, Azure, a local vLLM, ...): the
 * base URL and model come from the environment, so switching engines is config
 * (docs/design/09-ai-assistant.md 9.4).
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = 'openai';

  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenAiCompatibleOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  get model(): string {
    return this.options.model;
  }

  supports(): boolean {
    return true;
  }

  private async chat(userPrompt: string): Promise<unknown> {
    if (this.options.apiKey.length === 0) {
      throw new AiProviderError('ยังไม่ได้ตั้งค่า AI_API_KEY กรุณาตั้งค่าแล้วลองอีกครั้ง');
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.options.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch {
      throw new AiProviderError('ติดต่อผู้ให้บริการ AI ไม่ได้ ลองอีกครั้ง');
    }

    if (!response.ok) {
      throw new AiProviderError('ผู้ให้บริการ AI ปฏิเสธคำขอ ลองอีกครั้ง');
    }

    const payload = (await response.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
    } | null;
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AiProviderError('ผู้ช่วย AI ไม่ได้ส่งคำตอบกลับมา ลองอีกครั้ง');
    }
    return jsonFrom(content);
  }

  async rewrite({ texts, style, context }: AiRewriteRequest): Promise<string[]> {
    const parsed = (await this.chat(
      [
        `ปรับข้อความต่อไปนี้ให้ "${AI_REWRITE_LABELS[style]}"`,
        context ? `บริบทของธุรกิจ: ${context}` : '',
        'ตอบเป็น JSON: {"texts": ["..."]} โดยมีจำนวนเท่ากับข้อความต้นฉบับและเรียงลำดับเดิม',
        JSON.stringify({ texts }),
      ]
        .filter(Boolean)
        .join('\n'),
    )) as { texts?: unknown };

    const result = Array.isArray(parsed.texts)
      ? parsed.texts.filter((entry): entry is string => typeof entry === 'string')
      : [];
    if (result.length !== texts.length) {
      throw new AiProviderError('ผู้ช่วย AI ตอบจำนวนข้อความไม่ตรงกับที่ขอ ลองอีกครั้ง');
    }
    return result.map((text) => collapseWhitespace(text));
  }

  async translate({ texts, targetLocale, context }: AiTranslateRequest): Promise<string[]> {
    const parsed = (await this.chat(
      [
        `แปลข้อความต่อไปนี้เป็นภาษา${AI_LOCALE_LABELS[targetLocale]}`,
        context ? `บริบทของธุรกิจ: ${context}` : '',
        'ตอบเป็น JSON: {"texts": ["..."]} โดยมีจำนวนเท่ากับข้อความต้นฉบับและเรียงลำดับเดิม',
        JSON.stringify({ texts }),
      ]
        .filter(Boolean)
        .join('\n'),
    )) as { texts?: unknown };

    const result = Array.isArray(parsed.texts)
      ? parsed.texts.filter((entry): entry is string => typeof entry === 'string')
      : [];
    if (result.length !== texts.length) {
      throw new AiProviderError('ผู้ช่วย AI ตอบจำนวนข้อความไม่ตรงกับที่ขอ ลองอีกครั้ง');
    }
    return result.map((text) => collapseWhitespace(text));
  }

  async altText({ filename, folder, context }: AiAltTextRequest): Promise<string> {
    const parsed = (await this.chat(
      [
        'เขียนคำอธิบายรูป (alt) ภาษาไทยสั้น ๆ ไม่เกิน 125 ตัวอักษร สำหรับผู้ใช้โปรแกรมอ่านหน้าจอ',
        'ตอบเป็น JSON: {"alt": "..."}',
        JSON.stringify({ filename, folder: folder ?? null, context: context ?? null }),
      ].join('\n'),
    )) as { alt?: unknown };

    if (typeof parsed.alt !== 'string' || parsed.alt.trim().length === 0) {
      throw new AiProviderError('ผู้ช่วย AI ไม่ได้ส่งคำอธิบายรูปกลับมา ลองอีกครั้ง');
    }
    return truncateText(parsed.alt, AI_ALT_TEXT_MAX);
  }

  async seo({ title, headings, body, keyword }: AiSeoRequest): Promise<AiSeoResult> {
    const parsed = (await this.chat(
      [
        'ร่างชื่อเรื่องสำหรับค้นหา (ไม่เกิน 60 ตัวอักษร) และคำอธิบายหน้า (ไม่เกิน 160 ตัวอักษร) เป็นภาษาไทย',
        'ตอบเป็น JSON: {"title": "...", "description": "..."}',
        JSON.stringify({ title, headings, body, keyword: keyword ?? null }),
      ].join('\n'),
    )) as { title?: unknown; description?: unknown };

    if (typeof parsed.title !== 'string' || typeof parsed.description !== 'string') {
      throw new AiProviderError('ผู้ช่วย AI ไม่ได้ส่งชื่อเรื่องและคำอธิบายกลับมา ลองอีกครั้ง');
    }
    return {
      title: truncateText(parsed.title, AI_SEO_TITLE_MAX),
      description: truncateText(parsed.description, AI_SEO_DESCRIPTION_MAX),
    };
  }

  async generateSite({ prompt, locale }: AiSiteRequest): Promise<AiSiteDraft> {
    const parsed = await this.chat(
      [
        'ร่างโครงเว็บไซต์จากคำอธิบายของเจ้าของเว็บ ตอบเป็น JSON เท่านั้น',
        'รูปแบบ: {"name":string,"tagline":string,"businessType":"restaurant"|"clinic"|"freelance","pages":[{"title":string,"purpose":string}]}',
        'ให้ 4-5 หน้า และใช้ภาษาที่เจ้าของเว็บเขียนมาหรือภาษาเป้าหมาย',
        JSON.stringify({ prompt, locale }),
      ].join('\n'),
    );

    const draft = parsed as Partial<AiSiteDraft>;
    const base = siteDraftFrom({ prompt, locale });
    const pages = Array.isArray(draft.pages)
      ? draft.pages
          .filter(
            (page): page is { title: string; purpose: string } =>
              typeof page?.title === 'string' && page.title.trim().length > 0,
          )
          .slice(0, 6)
      : [];

    return {
      ...base,
      ...(typeof draft.name === 'string' && draft.name.trim().length > 0
        ? { name: draft.name.trim().slice(0, 120) }
        : {}),
      ...(typeof draft.tagline === 'string' ? { tagline: draft.tagline.trim().slice(0, 160) } : {}),
      ...(draft.businessType && AI_SITE_BUSINESS_TYPES.includes(draft.businessType)
        ? { businessType: draft.businessType }
        : {}),
      // The engine drafts the copy; the palette and style stay ours so the
      // result always passes the contrast checks in the wizard.
      ...(pages.length >= 3 ? { pages } : {}),
      provider: this.name,
    };
  }

  /**
   * Asks the model for a token patch, then validates it against the same schema
   * the Design Panel uses. An unusable answer falls back to the deterministic
   * parser instead of guessing, so the site can never be restyled with garbage.
   */
  async blockCommand({
    instruction,
    texts,
    locale,
  }: AiBlockCommandRequest): Promise<AiBlockCommandResult> {
    try {
      const parsed = await this.chat(
        [
          'แก้ข้อความของบล็อกตามคำสั่งของผู้ใช้ โดยคงความหมายและภาษาเดิม',
          'รูปแบบ: {"changes":[{"path":"<path เดิมจาก texts>","after":"<ข้อความใหม่>"}]}',
          'ใส่เฉพาะฟิลด์ที่ต้องแก้ และห้ามใช้ path ที่ไม่มีใน texts',
          JSON.stringify({ instruction, texts }),
        ].join('\n'),
      );

      const raw =
        parsed !== null && typeof parsed === 'object'
          ? (parsed as { changes?: unknown }).changes
          : null;
      if (Array.isArray(raw)) {
        const allowed = new Map(texts.map((text) => [text.path, text.value]));
        const changes = raw.flatMap((entry) => {
          if (entry === null || typeof entry !== 'object') return [];
          const path = (entry as { path?: unknown }).path;
          const after = (entry as { after?: unknown }).after;
          if (typeof path !== 'string' || typeof after !== 'string') return [];
          if (!allowed.has(path)) return [];
          if (after.trim() === (allowed.get(path) ?? '').trim()) return [];
          return [{ path, after: after.slice(0, AI_TEXT_MAX) }];
        });
        if (changes.length > 0) return { changes };
      }
    } catch {
      // A model that cannot answer falls back to the offline parser below, so the
      // owner still gets the everyday commands.
    }

    const fallback = blockCommandFromInstruction(instruction, texts);
    if (!fallback) {
      throw new AiProviderError(
        locale === 'en'
          ? 'The assistant did not understand that command. Try "make it shorter" or "change it to …".'
          : 'ผู้ช่วยยังไม่เข้าใจคำสั่งนี้ ลองบอกเช่น "ทำให้สั้นลง" หรือ "เปลี่ยนเป็น …"',
      );
    }
    return { changes: fallback };
  }

  async siteCommand({ instruction, tokens, locale }: AiSiteCommandRequest): Promise<ThemeCommand> {
    try {
      const parsed = await this.chat(
        [
          'แปลงคำสั่งปรับหน้าตาเว็บให้เป็น JSON patch ของ design tokens',
          'รูปแบบ: {"patch":{"colors":{"primary":"#RRGGBB"},"radius":"none|sm|md|lg|xl|full","button":"solid|outline|soft|gradient","density":"compact|comfortable|spacious","colorMode":"light|dark|auto"}}',
          'ใช้เฉพาะคีย์ที่เปลี่ยน และเลือกสีที่ข้อความบนพื้นอ่านได้',
          JSON.stringify({ instruction, tokens }),
        ].join('\n'),
      );

      const raw =
        parsed !== null && typeof parsed === 'object'
          ? (parsed as { patch?: unknown }).patch
          : null;
      const checked = themeTokensPatchSchema.safeParse(raw);
      if (checked.success) {
        const command = themeCommandFromPatch(checked.data, tokens, locale);
        if (command) return command;
      }
    } catch {
      // A model that cannot answer is not an error: the offline parser below
      // still understands the common commands, so the suggestion is not lost.
    }

    const fallback = themeCommandFromInstruction(instruction, tokens, locale);
    if (!fallback) {
      throw new AiProviderError(
        locale === 'en'
          ? 'The assistant did not understand that command. Try "make every button orange" or "use rounder corners".'
          : 'ผู้ช่วยยังไม่เข้าใจคำสั่งนี้ ลองบอกเช่น "เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม" หรือ "ทำมุมให้โค้งขึ้น"',
      );
    }
    return fallback;
  }
}

/** Builds the configured engine. Development runs the key-free local one. */
export const createAiProvider = (): AiProvider =>
  aiProviderName() === 'openai'
    ? new OpenAiCompatibleProvider({
        baseUrl: aiBaseUrl(),
        apiKey: aiApiKey(),
        model: aiModel(),
        timeoutMs: aiTimeoutMs(),
      })
    : new LocalAiProvider();
