import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { emailSettingsInputSchema, emailTestInputSchema } from '@lumio/shared';
import { EmailService } from './email.service';

/** Only owners and admins may read or change a mailbox the site sends from. */
@Controller('v1/email')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class EmailController {
  constructor(private readonly email: EmailService) {}

  @Get('settings')
  @Roles('owner', 'admin')
  async settings(@CurrentSite() siteId: string) {
    return ok(await this.email.view(siteId));
  }

  @Patch('settings')
  @Roles('owner', 'admin')
  async update(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = emailSettingsInputSchema.parse(body);
    return ok(await this.email.update(siteId, input, user.id));
  }

  @Post('test')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Roles('owner', 'admin')
  async test(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = emailTestInputSchema.parse(body);
    return ok(await this.email.test(siteId, input.to, user.id));
  }
}
