import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ApiException } from './api-error';
import { OriginGuard, resolveAllowedOrigins } from './origin.guard';

const contextFor = (method: string, origin?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ method, headers: origin === undefined ? {} : { origin } }),
    }),
  }) as unknown as ExecutionContext;

describe('resolveAllowedOrigins', () => {
  it('collects the admin, renderer and API origins without duplicates', () => {
    const origins = resolveAllowedOrigins({
      ADMIN_ORIGIN: 'https://app.lumio.app',
      RENDERER_ORIGIN: 'https://lumio.app,https://www.lumio.app',
      API_PUBLIC_URL: 'https://api.lumio.app',
    } as NodeJS.ProcessEnv);

    expect(origins).toEqual([
      'https://app.lumio.app',
      'https://lumio.app',
      'https://www.lumio.app',
      'https://api.lumio.app',
    ]);
  });

  it('falls back to the local admin origin', () => {
    expect(resolveAllowedOrigins({} as NodeJS.ProcessEnv)).toEqual(['http://localhost:49300']);
  });
});

describe('OriginGuard', () => {
  it('lets safe methods through even from another origin', () => {
    const guard = new OriginGuard();

    expect(guard.canActivate(contextFor('GET', 'https://evil.example'))).toBe(true);
  });

  it('allows a state-changing request from the configured admin origin', () => {
    process.env.ADMIN_ORIGIN = 'https://app.lumio.app';
    try {
      expect(new OriginGuard().canActivate(contextFor('POST', 'https://app.lumio.app'))).toBe(true);
    } finally {
      delete process.env.ADMIN_ORIGIN;
    }
  });

  it('rejects a state-changing request from an unknown origin', () => {
    const guard = new OriginGuard();

    expect(() => guard.canActivate(contextFor('POST', 'https://evil.example'))).toThrowError(
      ApiException,
    );
  });

  it('lets server-to-server calls through (no Origin header)', () => {
    const guard = new OriginGuard();

    expect(guard.canActivate(contextFor('POST'))).toBe(true);
  });
});
