import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  inviteMemberInputSchema,
  paginationQuerySchema,
  updateMemberInputSchema,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { MembersService } from './members.service';

@Controller('v1/members')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
@Roles('owner', 'admin')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  async list(@CurrentSite() siteId: string, @Query() query: unknown) {
    const page = paginationQuerySchema.parse(query);
    const { items, cursor } = await this.members.list(siteId, page);
    return ok(items, { cursor });
  }

  @Post()
  async invite(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = inviteMemberInputSchema.parse(body);
    return ok(await this.members.invite(siteId, input, user.id));
  }

  @Patch(':userId')
  async updateRole(
    @CurrentSite() siteId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateMemberInputSchema.parse(body);
    return ok(await this.members.updateRole(siteId, userId, input, user.id));
  }

  @Delete(':userId')
  async remove(
    @CurrentSite() siteId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.members.remove(siteId, userId, user.id);
    return ok({ success: true });
  }
}
