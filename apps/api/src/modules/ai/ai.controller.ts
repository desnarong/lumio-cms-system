import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  aiAltTextBatchInputSchema,
  aiBlockCommandInputSchema,
  aiAltTextInputSchema,
  aiGenerateSiteInputSchema,
  aiRewriteInputSchema,
  aiSeoInputSchema,
  aiSiteCommandInputSchema,
  aiTranslateInputSchema,
  type ApiLocale,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { RequestLocale } from '../../common/request-locale.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { FeatureGuard, RequireFeature } from '../features/feature.guard';
import { AiService } from './ai.service';

/** The assistant writes content, so it follows the content-write roles (13-rbac.md). */
const AI_ROLES: Role[] = ['owner', 'admin', 'editor', 'author'];

/** Writing copy is an expensive action, so one user cannot hammer the engine. */
const AI_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

/**
 * AI assistant endpoints (docs/design/09-ai-assistant.md 9.5). Every route answers
 * with a proposal, never with a change: the admin shows it as a diff and applies
 * what the user accepts. Quota, rate limit and audit live in the service.
 */
@Controller('v1/ai')
@UseGuards(AuthGuard, SiteGuard, RolesGuard, FeatureGuard)
@RequireFeature('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  @Roles(...AI_ROLES)
  async status(@CurrentSite() siteId: string, @RequestLocale() locale: ApiLocale) {
    return ok(await this.ai.status(siteId, locale));
  }

  @Post('rewrite')
  @UseGuards(RateLimitGuard)
  @RateLimit(AI_RATE_LIMIT)
  @Roles(...AI_ROLES)
  async rewrite(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const input = aiRewriteInputSchema.parse(body);
    return ok(await this.ai.rewrite(siteId, user.id, input, locale));
  }

  @Post('translate')
  @UseGuards(RateLimitGuard)
  @RateLimit(AI_RATE_LIMIT)
  @Roles(...AI_ROLES)
  async translate(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const input = aiTranslateInputSchema.parse(body);
    return ok(await this.ai.translate(siteId, user.id, input, locale));
  }

  @Post('alt-text')
  @UseGuards(RateLimitGuard)
  @RateLimit(AI_RATE_LIMIT)
  @Roles(...AI_ROLES)
  async altText(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const input = aiAltTextInputSchema.parse(body);
    return ok(await this.ai.altText(siteId, user.id, input, locale));
  }

  /**
   * Describes several images at once: the media library sends the images that
   * have no description yet (docs/design/09-ai-assistant.md 9.2).
   */
  @Post('alt-text/batch')
  @UseGuards(RateLimitGuard)
  @RateLimit(AI_RATE_LIMIT)
  @Roles(...AI_ROLES)
  async altTextBatch(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = aiAltTextBatchInputSchema.parse(body);
    return ok(await this.ai.altTextBatch(siteId, user.id, input));
  }

  /**
   * Drafts the onboarding answers from one sentence. The wizard shows the draft
   * and the user confirms it (docs/design/09-ai-assistant.md 9.1).
   */
  @Post('generate-site')
  @UseGuards(RateLimitGuard)
  @RateLimit(AI_RATE_LIMIT)
  @Roles(...AI_ROLES)
  async generateSite(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = aiGenerateSiteInputSchema.parse(body);
    return ok(await this.ai.generateSite(siteId, user.id, input));
  }

  /** Edits the text of the block selected in the editor (docs/design/09-ai-assistant.md 9.3). */
  @Post('block-command')
  @UseGuards(RateLimitGuard)
  @RateLimit(AI_RATE_LIMIT)
  @Roles(...AI_ROLES)
  async blockCommand(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const input = aiBlockCommandInputSchema.parse(body);
    return ok(await this.ai.blockCommand(siteId, user.id, input, locale));
  }

  @Post('seo')
  @UseGuards(RateLimitGuard)
  @RateLimit(AI_RATE_LIMIT)
  @Roles(...AI_ROLES)
  async seo(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const input = aiSeoInputSchema.parse(body);
    return ok(await this.ai.seo(siteId, user.id, input, locale));
  }

  /**
   * A whole-site instruction from the assistant chat ("make every button
   * orange"): answers with a design-token diff, never a saved change.
   */
  @Post('site-command')
  @UseGuards(RateLimitGuard)
  @RateLimit(AI_RATE_LIMIT)
  @Roles(...AI_ROLES)
  async siteCommand(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const input = aiSiteCommandInputSchema.parse(body);
    return ok(await this.ai.siteCommand(siteId, user.id, input, locale));
  }
}
