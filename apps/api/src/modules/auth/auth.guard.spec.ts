import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ApiException } from '../../common/api-error';
import { AuthGuard } from './auth.guard';
import type { TokenService } from './token.service';

interface RequestStub {
  headers: Record<string, string | undefined>;
  user?: unknown;
}

const contextFor = (request: RequestStub): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  it('attaches the user resolved from a valid bearer token', async () => {
    const tokens = {
      verifyAccess: vi.fn().mockResolvedValue({ sub: 'u1', email: 'a@b.c', typ: 'access' }),
    };
    const request: RequestStub = { headers: { authorization: 'Bearer token-1' } };

    await expect(
      new AuthGuard(tokens as unknown as TokenService).canActivate(contextFor(request)),
    ).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', email: 'a@b.c' });
  });

  it('rejects a request without an Authorization header', async () => {
    const guard = new AuthGuard({ verifyAccess: vi.fn() } as unknown as TokenService);

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(
      ApiException,
    );
  });

  it('rejects a request that does not use the bearer scheme', async () => {
    const guard = new AuthGuard({ verifyAccess: vi.fn() } as unknown as TokenService);

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Basic abc' } })),
    ).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('rejects when the token cannot be verified', async () => {
    const tokens = { verifyAccess: vi.fn().mockRejectedValue(ApiException.unauthorized()) };
    const guard = new AuthGuard(tokens as unknown as TokenService);

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Bearer expired' } })),
    ).rejects.toMatchObject({ code: 'unauthorized' });
  });
});
