import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { publishSettingsInputSchema, type PublishTestResult } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { PublishSettingsService } from './publish-settings.service';
import { PublishService } from './publish.service';
import { StaticPublisher } from './static-publisher';

/**
 * ตั้งค่า › การเผยแพร่. The owner of a site connects their own static host and
 * CDN here, so putting a published page on the CDN never needs a server-side
 * `.env` edit (docs/design/03-scope.md Definition of Done).
 */
@Controller('v1/publish')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
@Roles('owner', 'admin')
export class PublishSettingsController {
  constructor(
    private readonly settings: PublishSettingsService,
    private readonly pages: StaticPublisher,
    private readonly publish: PublishService,
  ) {}

  @Get('settings')
  async view(@CurrentSite() siteId: string) {
    return ok(await this.settings.view(siteId));
  }

  @Patch('settings')
  async update(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = publishSettingsInputSchema.parse(body);
    return ok(await this.settings.update(siteId, input, user.id));
  }

  /** Writes the home page to the configured host so the owner sees it working. */
  @Post('test')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60_000 })
  async test(@CurrentSite() siteId: string): Promise<{ data: PublishTestResult }> {
    const config = await this.settings.config(siteId);
    if (config.staticPublishUrl.length === 0) {
      return ok({
        ok: false,
        message: 'ยังไม่ได้ตั้งค่าที่อยู่สำหรับส่งไฟล์ขึ้น CDN กรุณาบันทึกการตั้งค่าก่อนทดสอบ',
        durationMs: 0,
      });
    }
    if (config.rendererUrl.length === 0) {
      return ok({
        ok: false,
        message: 'ยังไม่ได้ตั้งค่าที่อยู่ของ renderer กรุณากรอกก่อนทดสอบ',
        durationMs: 0,
      });
    }

    const host = await this.publish.primaryHost(siteId);
    if (!host) throw ApiException.notFound('ไม่พบที่อยู่สาธารณะของเว็บนี้');

    const result = await this.pages.publish(
      {
        rendererUrl: config.rendererUrl,
        staticPublishUrl: config.staticPublishUrl,
        staticPublishSecret: config.staticPublishSecret,
      },
      host,
      ['/'],
    );

    return ok({
      ok: result.delivered && !result.skipped,
      message: result.delivered
        ? `ส่งหน้าแรกขึ้น CDN สำเร็จใน ${(result.durationMs / 1000).toFixed(1)} วินาที`
        : `ส่งไม่สำเร็จ: ${result.failures.join(', ') || 'ตรวจสอบที่อยู่และคีย์อีกครั้ง'}`,
      durationMs: result.durationMs,
    });
  }
}
