import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  bookingListQuerySchema,
  bookingServiceInputSchema,
  bookingSettingsSchema,
  bookingStatusInputSchema,
  updateBookingServiceInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FeatureGuard, RequireFeature } from '../features/feature.guard';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { BookingService as Bookings } from './booking.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor'];

/** Bookings of the current site (docs/PROGRESS.md "งานนอก MVP"). */
@Controller('v1/booking')
@UseGuards(AuthGuard, SiteGuard, RolesGuard, FeatureGuard)
@RequireFeature('booking')
export class BookingController {
  constructor(private readonly bookings: Bookings) {}

  @Get('settings')
  @Roles(...READ_ROLES)
  async settings(@CurrentSite() siteId: string) {
    return ok(await this.bookings.settings(siteId));
  }

  @Put('settings')
  @Roles(...WRITE_ROLES)
  async updateSettings(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = bookingSettingsSchema.parse(body);
    return ok(await this.bookings.updateSettings(siteId, input, user.id));
  }

  @Get('services')
  @Roles(...READ_ROLES)
  async services(@CurrentSite() siteId: string) {
    return ok({ items: await this.bookings.listServices(siteId) });
  }

  @Post('services')
  @Roles(...WRITE_ROLES)
  async createService(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = bookingServiceInputSchema.parse(body);
    return ok(await this.bookings.createService(siteId, input, user.id));
  }

  @Patch('services/:serviceId')
  @Roles(...WRITE_ROLES)
  async updateService(
    @CurrentSite() siteId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateBookingServiceInputSchema.parse(body);
    return ok(await this.bookings.updateService(siteId, serviceId, input, user.id));
  }

  @Delete('services/:serviceId')
  @Roles(...WRITE_ROLES)
  async deleteService(
    @CurrentSite() siteId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.bookings.deleteService(siteId, serviceId, user.id);
    return ok({ success: true });
  }

  @Get('bookings')
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string, @Query() query: unknown) {
    const parsed = bookingListQuerySchema.parse(query);
    return ok(await this.bookings.listBookings(siteId, parsed));
  }

  @Patch('bookings/:bookingId')
  @Roles(...WRITE_ROLES)
  async setStatus(
    @CurrentSite() siteId: string,
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const { status } = bookingStatusInputSchema.parse(body);
    return ok(await this.bookings.setStatus(siteId, bookingId, status, user.id));
  }

  /** Kept for integrations that read the public calendar shape. */
  @Get('preview')
  @Roles(...READ_ROLES)
  async preview(@CurrentSite() siteId: string) {
    return ok(await this.bookings.settings(siteId));
  }
}
