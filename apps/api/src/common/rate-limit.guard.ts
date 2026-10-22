import {
  Inject,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiException } from './api-error';
import { RATE_LIMIT_STORE } from './rate-limit.module';
import type { RateLimitStore } from './rate-limit.store';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_KEY = 'lumio:rate-limit';

/** Marks a route with a per-IP request budget (docs/design/12-api.md 12.9). */
export const RateLimit = (options: RateLimitOptions): MethodDecorator =>
  SetMetadata(RATE_LIMIT_KEY, options);

/** Real client address; `trust proxy` makes `request.ip` skip the proxy hop. */
const clientKey = (request: Request): string => request.ip ?? 'unknown';

/**
 * Fixed-window limiter for the endpoints that are open to the public (login,
 * register, refresh). Counters live in the shared store so several API
 * instances share one budget (docs/design/15-security.md 15.2).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const key = `${context.getClass().name}.${context.getHandler().name}:${clientKey(request)}`;
    const { count } = await this.store.hit(key, options.windowMs);

    if (count > options.limit) throw ApiException.rateLimited();
    return true;
  }
}
