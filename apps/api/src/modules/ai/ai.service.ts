import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  AI_MAX_TEXTS,
  aiFieldLabel,
  aiLocaleLabel,
  aiProposalSummary,
  aiQuotaForPlan,
  aiRewriteLabel,
  aiTextChangeLabel,
  aiUsageFor,
  collectBodyTexts,
  collectHeadingTexts,
  planLabel,
  type AiAltTextBatchInput,
  type AiAltTextBatchItem,
  type AiAltTextBatchResult,
  type AiAltTextInput,
  type AiBlockCommandInput,
  type AiChange,
  type AiGenerateSiteInput,
  type AiLocale,
  type AiProposal,
  type AiResult,
  type AiRewriteInput,
  type AiSeoInput,
  type AiSiteCommandInput,
  type AiSiteCommandResult,
  type AiSiteDraft,
  type AiStatus,
  type AiTranslateInput,
  type ApiLocale,
  type BlockNode,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { AI_CACHE, type AiCache } from './ai.cache.js';
import { aiCacheTtlMs } from './ai.config.js';
import {
  AiProviderError,
  AI_PROVIDER,
  type AiProvider,
  type AiProviderAction,
} from './ai.provider.js';

/** First moment of the current month (UTC); the quota window. */
export const monthStart = (now: Date = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

const asBlocks = (value: unknown): BlockNode[] =>
  Array.isArray(value) ? (value as BlockNode[]) : [];

const asSeo = (value: unknown): { title?: string; description?: string } =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as { title?: string; description?: string })
    : {};

const cacheKey = (action: string, payload: unknown): string =>
  createHash('sha256')
    .update(`${action}:${JSON.stringify(payload)}`)
    .digest('hex');

/**
 * The AI assistant for one site (docs/design/09-ai-assistant.md). It never edits
 * anything: every action answers with a proposal (before/after per field) and the
 * admin applies what the user accepts through the normal screens.
 *
 * Quota comes from the plan table, usage is counted from this month's rows, and
 * each accepted action writes an audit entry plus one usage row
 * (docs/design/09-ai-assistant.md 9.6, 18-deployment.md 18.6).
 */
@Injectable()
export class AiService {
  constructor(
    private readonly db: PrismaService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    @Inject(AI_CACHE) private readonly cache: AiCache,
  ) {}

  /** Whether this plan includes the assistant, and how much is left this month. */
  async status(siteId: string, locale: ApiLocale = 'th'): Promise<AiStatus> {
    const { plan, used } = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { plan: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      const used = await tx.aiUsage.count({ where: { createdAt: { gte: monthStart() } } });
      return { plan: site.plan, used };
    });

    const limit = aiQuotaForPlan(plan);
    return {
      enabled: limit !== null,
      plan,
      planLabel: planLabel(plan, locale),
      provider: this.provider.name,
      usage: aiUsageFor(used, limit),
    };
  }

  async rewrite(
    siteId: string,
    userId: string,
    input: AiRewriteInput,
    locale: ApiLocale = 'th',
  ): Promise<AiResult> {
    const { limit, used } = await this.guard(siteId, 'rewrite');
    const styleLabel = aiRewriteLabel(input.style, locale);

    const texts = await this.ask('rewrite', input, () =>
      this.provider.rewrite({
        texts: input.texts,
        style: input.style,
        ...(input.context ? { context: input.context } : {}),
      }),
    );

    const proposal = this.proposal(
      'rewrite',
      styleLabel,
      aiProposalSummary('rewrite', texts.length, styleLabel, locale),
      texts.map((after, index) => ({
        field: 'text' as const,
        label: aiTextChangeLabel(index, texts.length, locale),
        before: input.texts[index] ?? '',
        after,
      })),
    );

    return this.finish(siteId, userId, 'rewrite', proposal, used, limit);
  }

  async translate(
    siteId: string,
    userId: string,
    input: AiTranslateInput,
    locale: ApiLocale = 'th',
  ): Promise<AiResult> {
    const { limit, used } = await this.guard(siteId, 'translate');
    const target = aiLocaleLabel(input.targetLocale, locale);
    const label = locale === 'en' ? `Translate to ${target}` : `แปลเป็น${target}`;

    const texts = await this.ask('translate', input, () =>
      this.provider.translate({
        texts: input.texts,
        targetLocale: input.targetLocale,
        ...(input.context ? { context: input.context } : {}),
      }),
    );

    const proposal = this.proposal(
      'translate',
      label,
      aiProposalSummary('translate', texts.length, null, locale),
      texts.map((after, index) => ({
        field: 'text' as const,
        label: aiTextChangeLabel(index, texts.length, locale),
        before: input.texts[index] ?? '',
        after,
      })),
    );

    return this.finish(siteId, userId, 'translate', proposal, used, limit);
  }

  async altText(
    siteId: string,
    userId: string,
    input: AiAltTextInput,
    locale: ApiLocale = 'th',
  ): Promise<AiResult> {
    const { limit, used } = await this.guard(siteId, 'alt-text');

    const media = await this.db.forSite(siteId, async (tx) => {
      const row = await tx.media.findUnique({
        where: { id: input.mediaId },
        select: { filename: true, folder: true, alt: true },
      });
      if (!row) throw ApiException.notFound('ไม่พบรูปนี้');
      return row;
    });

    const after = await this.ask('alt-text', input, () =>
      this.provider.altText({
        filename: media.filename ?? '',
        folder: media.folder,
        ...(input.context ? { context: input.context } : {}),
      }),
    );

    const altLabel = aiFieldLabel('altText', locale);
    const proposal = this.proposal(
      'alt-text',
      altLabel,
      aiProposalSummary('alt-text', 1, null, locale),
      [{ field: 'alt', label: altLabel, before: media.alt ?? '', after }],
    );

    return this.finish(siteId, userId, 'alt-text', proposal, used, limit);
  }

  /**
   * Describes several images at once (docs/design/09-ai-assistant.md 9.2). The
   * media library sends the ids of the images that have no description yet;
   * anything that already has one is skipped instead of overwritten, and the
   * batch counts as many quota items as it really answered.
   */
  async altTextBatch(
    siteId: string,
    userId: string,
    input: AiAltTextBatchInput,
  ): Promise<AiAltTextBatchResult> {
    const { limit, used } = await this.guard(siteId, 'alt-text');

    const rows = await this.db.forSite(siteId, (tx) =>
      tx.media.findMany({
        where: { id: { in: input.mediaIds }, status: { not: 'trashed' } },
        select: { id: true, filename: true, folder: true, alt: true },
      }),
    );
    if (rows.length === 0) throw ApiException.notFound('ไม่พบรูปที่เลือก');

    const items: AiAltTextBatchItem[] = [];
    let skipped = 0;
    for (const row of rows) {
      if (row.alt && row.alt.trim().length > 0) {
        skipped += 1;
        continue;
      }

      const after = await this.ask(`alt-text:${row.id}`, { mediaId: row.id }, () =>
        this.provider.altText({ filename: row.filename ?? '', folder: row.folder }),
      );
      items.push({
        mediaId: row.id,
        filename: row.filename ?? '',
        before: row.alt ?? '',
        after,
      });
    }

    if (items.length === 0) throw ApiException.conflict('รูปที่เลือกมีคำอธิบายครบแล้ว');

    const remaining = limit - used;
    if (items.length > remaining) {
      throw ApiException.conflict(
        `โควตาผู้ช่วย AI เหลือ ${remaining} ครั้ง แต่ต้องใช้ ${items.length} ครั้ง ลองเลือกน้อยลง`,
      );
    }

    await this.db.forSite(siteId, async (tx) => {
      await tx.aiUsage.create({
        data: {
          siteId,
          userId,
          action: 'alt-text',
          provider: this.provider.name,
          model: this.provider.model,
          items: items.length,
        },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId,
          action: 'ai.alt-text',
          target: null,
          meta: { provider: this.provider.name, items: items.length, skipped },
        },
      });
    });

    return { items, skipped, provider: this.provider.name };
  }

  /**
   * Drafts the wizard's answers from one sentence (docs/design/09-ai-assistant.md
   * 9.1). It answers with a draft only: the wizard shows it, the user confirms,
   * and the template fills the pages, exactly like every other AI action.
   */
  async generateSite(
    siteId: string,
    userId: string,
    input: AiGenerateSiteInput,
  ): Promise<AiSiteDraft> {
    await this.guard(siteId, 'generate-site');

    const draft = await this.ask('generate-site', input, () => this.provider.generateSite(input));

    await this.db.forSite(siteId, async (tx) => {
      await tx.aiUsage.create({
        data: {
          siteId,
          userId,
          action: 'generate-site',
          provider: this.provider.name,
          model: this.provider.model,
          items: draft.pages.length,
        },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId,
          action: 'ai.generate-site',
          target: null,
          meta: {
            provider: this.provider.name,
            businessType: draft.businessType,
            pages: draft.pages.length,
          },
        },
      });
    });

    return { ...draft, provider: this.provider.name };
  }

  /**
   * A whole-site instruction from the assistant chat ("make every button
   * orange"). It answers with a design-token patch plus the inverse patch, so
   * accepting restyles the site through the Design settings and undo is exact.
   */
  async siteCommand(
    siteId: string,
    userId: string,
    input: AiSiteCommandInput,
    locale: ApiLocale = 'th',
  ): Promise<AiSiteCommandResult> {
    const { limit, used } = await this.guard(siteId, 'site-command');

    const tokens = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { themeTokens: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      return site.themeTokens;
    });

    const command = await this.ask('site-command', { input, locale }, () =>
      this.provider.siteCommand({ instruction: input.instruction, tokens, locale }),
    );

    const id = randomUUID();
    await this.record(siteId, userId, 'site-command', id, command.changes.length);

    return {
      proposal: {
        id,
        action: 'site-command',
        label: aiFieldLabel('siteCommand', locale),
        summary: aiFieldLabel('siteCommandSummary', locale),
        changes: command.changes,
        patch: command.patch,
        inversePatch: command.inversePatch,
        provider: this.provider.name,
      },
      usage: aiUsageFor(used + 1, limit),
    };
  }

  async seo(
    siteId: string,
    userId: string,
    input: AiSeoInput,
    locale: ApiLocale = 'th',
  ): Promise<AiResult> {
    const { limit, used } = await this.guard(siteId, 'seo');

    const page = await this.db.forSite(siteId, async (tx) => {
      const row = await tx.content.findUnique({
        where: { id: input.pageId },
        select: { title: true, seo: true, blocksDraft: true },
      });
      if (!row) throw ApiException.notFound('ไม่พบหน้านี้');
      return row;
    });

    const blocks = asBlocks(page.blocksDraft);
    const result = await this.ask('seo', input, () =>
      this.provider.seo({
        title: page.title,
        headings: collectHeadingTexts(blocks),
        body: collectBodyTexts(blocks),
        ...(input.keyword ? { keyword: input.keyword } : {}),
      }),
    );

    const current = asSeo(page.seo);
    const titleLabel = aiFieldLabel('seoTitle', locale);
    const proposal = this.proposal(
      'seo',
      aiFieldLabel('seoProposal', locale),
      aiProposalSummary('seo', 2, null, locale),
      [
        { field: 'title', label: titleLabel, before: current.title ?? '', after: result.title },
        {
          field: 'description',
          label: aiFieldLabel('seoDescription', locale),
          before: current.description ?? '',
          after: result.description,
        },
      ],
    );

    return this.finish(siteId, userId, 'seo', proposal, used, limit);
  }

  /**
   * Edits the text of the block the owner selected (docs/design/09-ai-assistant.md
   * 9.3). The client sends the current fields and their paths; every change comes
   * back with the same path, so the editor applies them as one undo step.
   */
  async blockCommand(
    siteId: string,
    userId: string,
    input: AiBlockCommandInput,
    locale: ApiLocale = 'th',
  ): Promise<AiResult> {
    const { limit, used } = await this.guard(siteId, 'block-command');

    const page = await this.db.forSite(siteId, (tx) =>
      tx.content.findUnique({ where: { id: input.pageId }, select: { id: true } }),
    );
    if (!page) throw ApiException.notFound('ไม่พบหน้านี้');

    const answer = await this.ask('block-command', input, () =>
      this.provider.blockCommand({
        instruction: input.instruction,
        texts: input.texts,
        locale,
      }),
    );

    const byPath = new Map(input.texts.map((text) => [text.path, text]));
    const changes: AiChange[] = answer.changes.flatMap((change) => {
      const source = byPath.get(change.path);
      if (!source) return [];
      return [
        {
          field: 'text' as const,
          label:
            source.label.length > 0
              ? source.label
              : aiTextChangeLabel(0, answer.changes.length, locale),
          before: source.value,
          after: change.after,
          path: change.path,
        },
      ];
    });
    if (changes.length === 0) {
      throw ApiException.conflict('ผู้ช่วยยังไม่ได้ปรับอะไรใหม่ ลองสั่งให้ชัดขึ้นอีกนิด');
    }

    const proposal = this.proposal(
      'block-command',
      aiFieldLabel('blockCommand', locale),
      aiFieldLabel('blockCommandSummary', locale),
      changes,
    );

    return this.finish(siteId, userId, 'block-command', proposal, used, limit);
  }

  /**
   * Translates a whole page's copy in one go (docs/design/17-i18n.md 17.1). It
   * splits the texts into provider-sized batches and counts one plan credit per
   * batch, so creating a translation costs as many credits as it really used.
   */
  async translateTexts(
    siteId: string,
    userId: string,
    texts: readonly string[],
    targetLocale: AiLocale,
  ): Promise<string[]> {
    const translated: string[] = [];

    for (let start = 0; start < texts.length; start += AI_MAX_TEXTS) {
      const batch = texts.slice(start, start + AI_MAX_TEXTS);
      await this.guard(siteId, 'translate');
      const answer = await this.ask('translate', { texts: batch, targetLocale }, () =>
        this.provider.translate({ texts: batch, targetLocale }),
      );

      await this.db.forSite(siteId, async (tx) => {
        await tx.aiUsage.create({
          data: {
            siteId,
            userId,
            action: 'translate',
            provider: this.provider.name,
            model: this.provider.model,
            items: batch.length,
          },
        });
        await tx.auditLog.create({
          data: {
            siteId,
            userId,
            action: 'ai.translate',
            target: null,
            meta: {
              provider: this.provider.name,
              items: batch.length,
              targetLocale,
            },
          },
        });
      });

      translated.push(...answer);
    }

    return translated;
  }

  /** Plan check, monthly quota check and "can this engine do it at all". */
  private async guard(
    siteId: string,
    action: AiProviderAction,
  ): Promise<{ limit: number; used: number }> {
    const { plan, used } = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { plan: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      const used = await tx.aiUsage.count({ where: { createdAt: { gte: monthStart() } } });
      return { plan: site.plan, used };
    });

    const limit = aiQuotaForPlan(plan);
    if (limit === null) {
      throw ApiException.forbidden('แพ็กเกจนี้ยังไม่รวมผู้ช่วย AI กรุณาอัปเกรดแพ็กเกจเพื่อใช้งาน');
    }
    if (used >= limit) {
      throw ApiException.conflict(
        `เดือนนี้ใช้ผู้ช่วย AI ครบ ${limit} ครั้งแล้ว รอเดือนใหม่หรืออัปเกรดแพ็กเกจ`,
      );
    }
    if (!this.provider.supports(action)) {
      throw ApiException.conflict(
        'งานนี้ต้องใช้ผู้ให้บริการ AI กรุณาตั้งค่า AI_PROVIDER=openai และ AI_API_KEY ก่อนใช้งาน',
      );
    }
    return { limit, used };
  }

  /** Cached provider call; the cache key is the hash of prompt + context. */
  private async ask<T>(action: string, payload: unknown, run: () => Promise<T>): Promise<T> {
    const key = cacheKey(action, payload);
    const cached = await this.cache.get<T>(key);
    if (cached !== null) return cached;

    let result: T;
    try {
      result = await run();
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw ApiException.conflict(error.message);
      }
      throw new ApiException('internal_error', 'ผู้ช่วย AI ตอบกลับไม่สำเร็จ ลองอีกครั้ง');
    }

    await this.cache.set(key, result, aiCacheTtlMs());
    return result;
  }

  private proposal(
    action: AiProposal['action'],
    label: string,
    summary: string,
    changes: AiChange[],
  ): AiProposal {
    if (changes.every((change) => change.after.trim() === change.before.trim())) {
      throw ApiException.conflict('ผู้ช่วยยังไม่ได้ปรับอะไรใหม่ ลองเลือกแบบอื่นดูนะ');
    }
    return {
      id: randomUUID(),
      action,
      label,
      summary,
      changes,
      provider: this.provider.name,
    };
  }

  /** Records the accepted suggestion, then answers with the updated quota. */
  private async finish(
    siteId: string,
    userId: string,
    action: AiProposal['action'],
    proposal: AiProposal,
    used: number,
    limit: number,
  ): Promise<AiResult> {
    await this.record(siteId, userId, action, proposal.id, proposal.changes.length);
    return { proposal, usage: aiUsageFor(used + 1, limit) };
  }

  /** One usage row and one audit entry per accepted action. */
  private async record(
    siteId: string,
    userId: string,
    action: AiProposal['action'] | 'site-command',
    target: string,
    items: number,
  ): Promise<void> {
    await this.db.forSite(siteId, async (tx) => {
      await tx.aiUsage.create({
        data: {
          siteId,
          userId,
          action,
          provider: this.provider.name,
          model: this.provider.model,
          items,
        },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId,
          action: `ai.${action}`,
          target,
          meta: { provider: this.provider.name, items },
        },
      });
    });
  }
}
