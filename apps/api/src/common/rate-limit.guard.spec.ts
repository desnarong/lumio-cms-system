import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ApiException } from './api-error';
import { RateLimitGuard, type RateLimitOptions } from './rate-limit.guard';
import { MemoryRateLimitStore } from './rate-limit.store';

const contextFor = (ip: string): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ip }) }),
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
  }) as unknown as ExecutionContext;

const reflectorWith = (options: RateLimitOptions | undefined): Reflector =>
  ({ getAllAndOverride: () => options }) as unknown as Reflector;

const guardWith = (
  options: RateLimitOptions | undefined,
  store = new MemoryRateLimitStore(),
): RateLimitGuard => new RateLimitGuard(reflectorWith(options), store);

describe('RateLimitGuard', () => {
  it('allows requests up to the limit and blocks the next one', async () => {
    const guard = guardWith({ limit: 2, windowMs: 60_000 });
    const context = contextFor('203.0.113.1');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toThrowError(ApiException);
  });

  it('does nothing when the route has no rate limit', async () => {
    const guard = guardWith(undefined);

    await expect(guard.canActivate(contextFor('203.0.113.2'))).resolves.toBe(true);
  });

  it('tracks each client IP separately', async () => {
    const guard = guardWith({ limit: 1, windowMs: 60_000 });

    await expect(guard.canActivate(contextFor('198.51.100.1'))).resolves.toBe(true);
    await expect(guard.canActivate(contextFor('198.51.100.2'))).resolves.toBe(true);
  });

  it('shares one counter store across guard instances', async () => {
    const store = new MemoryRateLimitStore();
    const first = guardWith({ limit: 1, windowMs: 60_000 }, store);
    const second = guardWith({ limit: 1, windowMs: 60_000 }, store);

    await expect(first.canActivate(contextFor('203.0.113.9'))).resolves.toBe(true);
    await expect(second.canActivate(contextFor('203.0.113.9'))).rejects.toThrowError(ApiException);
  });
});
