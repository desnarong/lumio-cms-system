import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { AuthGuard } from '../auth/auth.guard';
import { UpdatesService } from './updates.service';

/**
 * What version this deployment runs and whether a newer release exists
 * (docs/design/18-deployment.md 18.8). Any signed-in user may read the status,
 * because the version badge sits in the shell; asking for a fresh check is
 * rate limited so the manifest is never hammered.
 */
@Controller('v1/updates')
@UseGuards(AuthGuard, RateLimitGuard)
export class UpdatesController {
  constructor(private readonly updates: UpdatesService) {}

  @Get()
  @RateLimit({ limit: 60, windowMs: 60_000 })
  async status() {
    return ok(await this.updates.status());
  }

  @Post('check')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  async check() {
    return ok(await this.updates.status(true));
  }
}
