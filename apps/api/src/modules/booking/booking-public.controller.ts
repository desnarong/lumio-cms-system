import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { bookingCancelInputSchema, bookingInputSchema } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { BookingService } from './booking.service';

/**
 * Appointment booking on a public site (docs/PROGRESS.md "งานนอก MVP").
 * Anonymous like the shop: rate limited, site resolved from the host, and a
 * confirmation token is the only way to see or cancel one booking.
 */
@Controller('v1/public/:host/booking')
@UseGuards(RateLimitGuard)
export class PublicBookingController {
  constructor(private readonly bookings: BookingService) {}

  @Get()
  @RateLimit({ limit: 300, windowMs: 60_000 })
  async view(@Param('host') host: string) {
    return ok(await this.bookings.publicView(host));
  }

  @Post()
  @RateLimit({ limit: 10, windowMs: 60_000 })
  async book(@Param('host') host: string, @Body() body: unknown) {
    const input = bookingInputSchema.parse(body);
    return ok(await this.bookings.book(host, input));
  }

  @Get('bookings/:token')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  async booking(@Param('host') host: string, @Param('token') token: string) {
    return ok(await this.bookings.bookingByToken(host, token));
  }

  @Post('bookings/:token/cancel')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  async cancel(@Param('host') host: string, @Param('token') token: string, @Body() body: unknown) {
    // The token is in the path; the body is accepted so a plain form can post an
    // empty object without a validation error.
    bookingCancelInputSchema.partial().parse(body ?? {});
    return ok(await this.bookings.cancelByToken(host, token));
  }
}
