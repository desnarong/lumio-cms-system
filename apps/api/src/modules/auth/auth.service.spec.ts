import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService, type AuthenticatedSession } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, totpCode } from '../../common/totp';
import type { TwoFactorChallenge } from '@lumio/shared';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const EMAIL = 'owner@example.com';
const PASSWORD = 'lumio-demo-1234';

const userRow = (passwordHash: string | null = null) => ({
  id: USER_ID,
  email: EMAIL,
  name: 'สมชาย ใจดี',
  avatarUrl: null,
  passwordHash,
  createdAt: new Date('2026-10-20T00:00:00Z'),
});

interface MockDb {
  user: { findUnique: Mock; create: Mock; update: Mock };
  forUser: Mock;
}

describe('AuthService two-factor', () => {
  const passwords = new PasswordService();
  const tokens = new TokenService(new JwtService({}));
  const throttle = {
    registerAttempt: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
  } as unknown as LoginThrottleService;
  let db: MockDb;
  let auth: AuthService;

  beforeEach(() => {
    db = {
      user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn().mockResolvedValue({}) },
      forUser: vi.fn(),
    };
    auth = new AuthService(db as unknown as PrismaService, passwords, tokens, throttle);
  });

  const enabledUser = async (secret: string, recoveryCodes: string[] = []) => ({
    ...userRow(await passwords.hash(PASSWORD)),
    totpSecret: secret,
    totpEnabledAt: new Date('2026-10-21T00:00:00Z'),
    totpRecoveryCodes: recoveryCodes,
  });

  it('answers with a challenge instead of tokens when 2FA is on', async () => {
    db.user.findUnique.mockResolvedValue(await enabledUser(generateTotpSecret()));

    const result = await auth.login({ email: EMAIL, password: PASSWORD });

    expect('challengeToken' in result).toBe(true);
    expect(result).not.toHaveProperty('accessToken');
  });

  it('exchanges the challenge and a valid code for a session', async () => {
    const secret = generateTotpSecret();
    db.user.findUnique.mockResolvedValue(await enabledUser(secret));
    const challenge = (await auth.login({
      email: EMAIL,
      password: PASSWORD,
    })) as TwoFactorChallenge;

    const session = await auth.verifyTwoFactor({
      challengeToken: challenge.challengeToken,
      code: totpCode(secret),
    });

    expect(session.user.id).toBe(USER_ID);
    await expect(tokens.verifyAccess(session.accessToken)).resolves.toMatchObject({ sub: USER_ID });
  });

  it('refuses a wrong code', async () => {
    const secret = generateTotpSecret();
    db.user.findUnique.mockResolvedValue(await enabledUser(secret));
    const challenge = (await auth.login({
      email: EMAIL,
      password: PASSWORD,
    })) as TwoFactorChallenge;

    await expect(
      auth.verifyTwoFactor({ challengeToken: challenge.challengeToken, code: '000000' }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('accepts a recovery code once and removes it', async () => {
    const secret = generateTotpSecret();
    const code = generateRecoveryCodes(1)[0] as string;
    db.user.findUnique.mockResolvedValue(await enabledUser(secret, [hashRecoveryCode(code)]));
    const challenge = (await auth.login({
      email: EMAIL,
      password: PASSWORD,
    })) as TwoFactorChallenge;

    await auth.verifyTwoFactor({ challengeToken: challenge.challengeToken, code });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { totpRecoveryCodes: [] },
    });
  });

  it('starts setup, then enables with the first code and returns recovery codes', async () => {
    db.user.findUnique.mockResolvedValue({
      ...userRow(await passwords.hash(PASSWORD)),
      totpSecret: null,
      totpEnabledAt: null,
      totpRecoveryCodes: [],
    });

    const setup = await auth.startTwoFactor(USER_ID);

    expect(setup.secret).toMatch(/^[A-Z2-7]{16,}$/);
    expect(setup.otpauthUrl).toContain('otpauth://totp/');
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { totpSecret: setup.secret },
    });

    db.user.findUnique.mockResolvedValue({
      ...userRow(await passwords.hash(PASSWORD)),
      totpSecret: setup.secret,
      totpEnabledAt: null,
      totpRecoveryCodes: [],
    });
    const enabled = await auth.enableTwoFactor(USER_ID, totpCode(setup.secret));

    expect(enabled.recoveryCodes).toHaveLength(10);
    expect(db.user.update).toHaveBeenLastCalledWith({
      where: { id: USER_ID },
      data: {
        totpEnabledAt: expect.any(Date),
        totpRecoveryCodes: expect.arrayContaining([expect.stringMatching(/^[0-9a-f]{64}$/)]),
      },
    });
  });

  it('refuses to enable when the code does not match the pending secret', async () => {
    db.user.findUnique.mockResolvedValue({
      ...userRow(await passwords.hash(PASSWORD)),
      totpSecret: generateTotpSecret(),
      totpEnabledAt: null,
      totpRecoveryCodes: [],
    });

    await expect(auth.enableTwoFactor(USER_ID, '000000')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('turns 2FA off with the password and a current code', async () => {
    const secret = generateTotpSecret();
    db.user.findUnique.mockResolvedValue(await enabledUser(secret));

    const status = await auth.disableTwoFactor(USER_ID, {
      password: PASSWORD,
      code: totpCode(secret),
    });

    expect(status).toEqual({ enabled: false, recoveryCodesLeft: 0 });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { totpSecret: null, totpEnabledAt: null, totpRecoveryCodes: [] },
    });
  });

  it('refuses to turn 2FA off with the wrong password', async () => {
    const secret = generateTotpSecret();
    db.user.findUnique.mockResolvedValue(await enabledUser(secret));

    await expect(
      auth.disableTwoFactor(USER_ID, { password: 'wrong-password', code: totpCode(secret) }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
  });
});

describe('AuthService', () => {
  const passwords = new PasswordService();
  const tokens = new TokenService(new JwtService({}));
  const throttle = {
    registerAttempt: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
  } as unknown as LoginThrottleService;
  let db: MockDb;
  let auth: AuthService;

  beforeEach(() => {
    db = {
      user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      forUser: vi.fn(),
    };
    auth = new AuthService(db as unknown as PrismaService, passwords, tokens, throttle);
  });

  it('registers a new user and returns a session with tokens', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(userRow());

    const session = await auth.register({ email: EMAIL, password: PASSWORD, name: 'สมชาย ใจดี' });

    expect(session.user).toMatchObject({ id: USER_ID, email: EMAIL });
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: EMAIL }),
    });
  });

  it('rejects registration when the email is already used', async () => {
    db.user.findUnique.mockResolvedValue(userRow());

    await expect(auth.register({ email: EMAIL, password: PASSWORD })).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('logs in with the correct password', async () => {
    db.user.findUnique.mockResolvedValue(userRow(await passwords.hash(PASSWORD)));

    const session = (await auth.login({ email: EMAIL, password: PASSWORD })) as AuthenticatedSession;

    expect(session.user.id).toBe(USER_ID);
    await expect(tokens.verifyAccess(session.accessToken)).resolves.toMatchObject({ sub: USER_ID });
  });

  it('rejects a wrong password with 401', async () => {
    db.user.findUnique.mockResolvedValue(userRow(await passwords.hash(PASSWORD)));

    await expect(auth.login({ email: EMAIL, password: 'wrong-password' })).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('rejects an unknown email without revealing which part failed', async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(auth.login({ email: EMAIL, password: PASSWORD })).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('issues a fresh session from a valid refresh token', async () => {
    const pair = await tokens.issuePair({ id: USER_ID, email: EMAIL });
    db.user.findUnique.mockResolvedValue(userRow());

    const session = await auth.refresh(pair.refreshToken);

    expect(session.user.id).toBe(USER_ID);
  });

  it('rejects an invalid refresh token', async () => {
    await expect(auth.refresh('garbage')).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('returns the memberships of the current user', async () => {
    db.user.findUnique.mockResolvedValue(userRow());
    db.forUser.mockImplementation(async (_userId: string, fn: (tx: unknown) => unknown) =>
      fn({
        siteMember: { findMany: vi.fn().mockResolvedValue([{ siteId: SITE_ID, role: 'owner' }]) },
      }),
    );

    const profile = await auth.me(USER_ID);

    expect(profile.memberships).toEqual([{ siteId: SITE_ID, role: 'owner' }]);
  });
});
