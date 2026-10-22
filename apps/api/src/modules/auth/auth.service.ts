import { Injectable } from '@nestjs/common';
import {
  isRole,
  type AuthUser,
  type DisableTwoFactorInput,
  type LoginInput,
  type Membership,
  type RegisterInput,
  type TwoFactorChallenge,
  type TwoFactorEnabled,
  type TwoFactorSetup,
  type TwoFactorStatus,
  type VerifyTwoFactorInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { LoginThrottleService } from './login-throttle.service';
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUrl,
  verifyTotp,
} from '../../common/totp';
import { PasswordService } from './password.service';
import { TokenService, type TokenPair } from './token.service';

export interface AuthenticatedSession extends TokenPair {
  user: AuthUser;
}

export interface SessionProfile {
  user: AuthUser;
  memberships: Membership[];
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  totpSecret?: string | null;
  totpEnabledAt?: Date | null;
  totpRecoveryCodes?: string[];
}

const toAuthUser = (user: UserRow): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly throttle: LoginThrottleService,
  ) {}

  async register(input: RegisterInput): Promise<AuthenticatedSession> {
    const existing = await this.db.user.findUnique({ where: { email: input.email } });
    if (existing) throw ApiException.conflict('อีเมลนี้ถูกใช้งานแล้ว');

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.db.user.create({
      data: { email: input.email, passwordHash, name: input.name ?? null },
    });

    return { user: toAuthUser(user), ...(await this.tokens.issuePair(user)) };
  }

  async login(input: LoginInput): Promise<AuthenticatedSession | TwoFactorChallenge> {
    await this.throttle.registerAttempt(input.email);

    const user = await this.db.user.findUnique({ where: { email: input.email } });
    const passwordOk = user?.passwordHash
      ? await this.passwords.verify(input.password, user.passwordHash)
      : false;
    if (!user || !passwordOk) {
      throw ApiException.unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    await this.throttle.reset(input.email);
    if (user.totpEnabledAt) {
      return {
        twoFactorRequired: true,
        challengeToken: await this.tokens.issueTwoFactorChallenge(user),
      };
    }
    return { user: toAuthUser(user), ...(await this.tokens.issuePair(user)) };
  }

  /**
   * Second step of sign-in: a TOTP code from the authenticator app, or one of
   * the recovery codes (which is then used up). Only a valid challenge token can
   * reach this point, so the password check already happened.
   */
  async verifyTwoFactor(input: VerifyTwoFactorInput): Promise<AuthenticatedSession> {
    const payload = await this.tokens.verifyTwoFactorChallenge(input.challengeToken);
    const user = await this.db.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw ApiException.unauthorized('ไม่พบผู้ใช้ของเซสชันนี้');
    if (!user.totpEnabledAt || !user.totpSecret) {
      throw ApiException.conflict('บัญชีนี้ยังไม่ได้เปิดใช้การยืนยันตัวตนสองขั้น');
    }

    if (verifyTotp(user.totpSecret, input.code)) {
      return { user: toAuthUser(user), ...(await this.tokens.issuePair(user)) };
    }

    const hash = hashRecoveryCode(input.code);
    const codes = user.totpRecoveryCodes ?? [];
    if (!codes.includes(hash)) {
      throw ApiException.unauthorized('รหัสไม่ถูกต้อง ลองอีกครั้ง');
    }

    // Recovery codes are single-use: drop the one that just signed in.
    await this.db.user.update({
      where: { id: user.id },
      data: { totpRecoveryCodes: codes.filter((code) => code !== hash) },
    });
    return { user: toAuthUser(user), ...(await this.tokens.issuePair(user)) };
  }

  async twoFactorStatus(userId: string): Promise<TwoFactorStatus> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiException.unauthorized('ไม่พบผู้ใช้');
    return {
      enabled: Boolean(user.totpEnabledAt),
      recoveryCodesLeft: (user.totpRecoveryCodes ?? []).length,
    };
  }

  /** Starts setup: stores a pending secret and returns it with its otpauth URI. */
  async startTwoFactor(userId: string): Promise<TwoFactorSetup> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiException.unauthorized('ไม่พบผู้ใช้');
    if (user.totpEnabledAt) throw ApiException.conflict('บัญชีนี้เปิดใช้การยืนยันตัวตนอยู่แล้ว');

    const secret = generateTotpSecret();
    await this.db.user.update({ where: { id: userId }, data: { totpSecret: secret } });

    return {
      secret,
      otpauthUrl: otpauthUrl({ secret, account: user.email }),
    };
  }

  /** Confirms the pending secret with a first code and issues recovery codes. */
  async enableTwoFactor(userId: string, code: string): Promise<TwoFactorEnabled> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiException.unauthorized('ไม่พบผู้ใช้');
    if (user.totpEnabledAt) throw ApiException.conflict('บัญชีนี้เปิดใช้การยืนยันตัวตนอยู่แล้ว');
    if (!user.totpSecret) {
      throw ApiException.conflict('ยังไม่ได้เริ่มตั้งค่าการยืนยันตัวตน กรุณากดเริ่มตั้งค่าก่อน');
    }
    if (!verifyTotp(user.totpSecret, code)) {
      throw ApiException.unauthorized('รหัสไม่ถูกต้อง ลองอีกครั้ง');
    }

    const recoveryCodes = generateRecoveryCodes();
    await this.db.user.update({
      where: { id: userId },
      data: {
        totpEnabledAt: new Date(),
        totpRecoveryCodes: recoveryCodes.map(hashRecoveryCode),
      },
    });
    return { recoveryCodes };
  }

  /** Turns 2FA off; requires the password and a current code, like any other change. */
  async disableTwoFactor(userId: string, input: DisableTwoFactorInput): Promise<TwoFactorStatus> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiException.unauthorized('ไม่พบผู้ใช้');
    if (!user.totpEnabledAt || !user.totpSecret) {
      throw ApiException.conflict('บัญชีนี้ยังไม่ได้เปิดใช้การยืนยันตัวตน');
    }

    const passwordOk = user.passwordHash
      ? await this.passwords.verify(input.password, user.passwordHash)
      : false;
    if (!passwordOk) throw ApiException.unauthorized('รหัสผ่านไม่ถูกต้อง');

    const validCode =
      verifyTotp(user.totpSecret, input.code) ||
      (user.totpRecoveryCodes ?? []).includes(hashRecoveryCode(input.code));
    if (!validCode) throw ApiException.unauthorized('รหัสไม่ถูกต้อง ลองอีกครั้ง');

    await this.db.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabledAt: null, totpRecoveryCodes: [] },
    });
    return { enabled: false, recoveryCodesLeft: 0 };
  }

  async refresh(refreshToken: string): Promise<AuthenticatedSession> {
    const payload = await this.tokens.verifyRefresh(refreshToken);
    const user = await this.db.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw ApiException.unauthorized('ไม่พบผู้ใช้ของเซสชันนี้');

    return { user: toAuthUser(user), ...(await this.tokens.issuePair(user)) };
  }

  async me(userId: string): Promise<SessionProfile> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiException.unauthorized('ไม่พบผู้ใช้');

    const memberships = await this.db.forUser(userId, (tx) =>
      tx.siteMember.findMany({ where: { userId }, select: { siteId: true, role: true } }),
    );

    return {
      user: toAuthUser(user),
      memberships: memberships.map((membership) => ({
        siteId: membership.siteId,
        role: isRole(membership.role) ? membership.role : 'viewer',
      })),
    };
  }
}
