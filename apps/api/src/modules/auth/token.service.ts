import { Injectable } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ApiException } from '../../common/api-error';
import { getAuthConfig, type AuthConfig } from './auth.config';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  typ: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  typ: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Exchanged for a session only together with a TOTP or recovery code. */
export interface TwoFactorTokenPayload {
  sub: string;
  typ: '2fa';
}

type ExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

/**
 * jsonwebtoken parses duration strings such as "15m" at runtime, but its type
 * is a template-literal union, so the value from the environment is narrowed
 * here once instead of at every call site.
 */
const asExpiresIn = (value: string): ExpiresIn => value as unknown as ExpiresIn;

@Injectable()
export class TokenService {
  private readonly config: AuthConfig = getAuthConfig();

  constructor(private readonly jwt: JwtService) {}

  async issuePair(user: { id: string; email: string }): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = { sub: user.id, email: user.email, typ: 'access' };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, typ: 'refresh' };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.accessSecret,
        expiresIn: asExpiresIn(this.config.accessTtl),
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.refreshSecret,
        expiresIn: asExpiresIn(this.config.refreshTtl),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /** Short-lived ticket for the second step of sign-in (five minutes). */
  async issueTwoFactorChallenge(user: { id: string }): Promise<string> {
    const payload: TwoFactorTokenPayload = { sub: user.id, typ: '2fa' };
    return this.jwt.signAsync(payload, {
      secret: this.config.accessSecret,
      expiresIn: asExpiresIn('5m'),
    });
  }

  async verifyTwoFactorChallenge(token: string): Promise<TwoFactorTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<TwoFactorTokenPayload>(token, {
        secret: this.config.accessSecret,
      });
      if (payload.typ !== '2fa') throw new Error('unexpected token type');
      return payload;
    } catch {
      throw ApiException.unauthorized('รหัสยืนยันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.accessSecret,
      });
      if (payload.typ !== 'access') throw new Error('unexpected token type');
      return payload;
    } catch {
      throw ApiException.unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.refreshSecret,
      });
      if (payload.typ !== 'refresh') throw new Error('unexpected token type');
      return payload;
    } catch {
      throw ApiException.unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
  }
}
