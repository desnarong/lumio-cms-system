import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiException } from '../../common/api-error';
import { TokenService } from './token.service';

const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'owner@lumio.app' };

describe('TokenService', () => {
  let tokens: TokenService;

  beforeEach(() => {
    tokens = new TokenService(new JwtService({}));
  });

  it('issues an access and a refresh token that verify back to their payloads', async () => {
    const pair = await tokens.issuePair(USER);

    expect(pair.accessToken).not.toBe(pair.refreshToken);
    await expect(tokens.verifyAccess(pair.accessToken)).resolves.toMatchObject({
      sub: USER.id,
      email: USER.email,
      typ: 'access',
    });
    await expect(tokens.verifyRefresh(pair.refreshToken)).resolves.toMatchObject({
      sub: USER.id,
      typ: 'refresh',
    });
  });

  it('rejects a refresh token presented as an access token', async () => {
    const pair = await tokens.issuePair(USER);
    await expect(tokens.verifyAccess(pair.refreshToken)).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects a tampered token', async () => {
    await expect(tokens.verifyAccess('not.a.token')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });
});
