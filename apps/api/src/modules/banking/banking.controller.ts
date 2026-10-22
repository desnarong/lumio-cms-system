import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { bblTransferQuerySchema, updateBankSettingsInputSchema, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { BankingService } from './banking.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
/** The receiving account and its connection are money-sensitive. */
const BANK_ROLES: Role[] = ['owner', 'admin'];

/**
 * Bangkok Bank connection for one site (docs/design/12-api.md 12.10). Slip
 * verification is also applied automatically while a buyer uploads a slip; these
 * routes let the owner link the account, test the credentials and re-check an
 * order the bank did not confirm on its own.
 */
@Controller('v1/banking')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class BankingController {
  constructor(private readonly banking: BankingService) {}

  @Get('bbl')
  @Roles(...READ_ROLES)
  async connection(@CurrentSite() siteId: string) {
    return ok(await this.banking.connection(siteId));
  }

  @Patch('bbl')
  @Roles(...BANK_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateBankSettingsInputSchema.parse(body);
    return ok(await this.banking.updateSettings(siteId, input, user.id));
  }

  @Post('bbl/test')
  @Roles(...BANK_ROLES)
  async test(@CurrentSite() siteId: string, @CurrentUser() user: AuthenticatedUser) {
    return ok(await this.banking.testConnection(siteId, user.id));
  }

  @Get('bbl/transfers')
  @Roles(...BANK_ROLES)
  async transfers(@CurrentSite() siteId: string, @Query() query: unknown) {
    const parsed = bblTransferQuerySchema.parse(query);
    return ok(await this.banking.transfers(siteId, parsed));
  }

  @Post('bbl/orders/:orderId/verify-slip')
  @Roles(...BANK_ROLES)
  async verifySlip(
    @CurrentSite() siteId: string,
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.banking.verifySlip(siteId, orderId, user.id));
  }
}
