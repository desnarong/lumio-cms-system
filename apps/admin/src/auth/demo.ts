import { translateNow } from '@lumio/ui';
import type { AuthUser, LoginInput, TwoFactorStatus } from '@lumio/shared';
import { ApiError } from '../editor/api.js';
import type { AuthApi } from './api.js';

/** Account the demo sign-in accepts, matching the seeded owner. */
export const DEMO_EMAIL = 'owner@example.com';
export const DEMO_PASSWORD = 'lumio-demo-1234';

/** The code the demo accepts when turning two-factor on. */
export const DEMO_TOTP_CODE = '123456';

const demoUser: AuthUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: DEMO_EMAIL,
  name: 'สมชาย ใจดี',
  avatarUrl: null,
};

/**
 * In-memory sign-in so the admin runs before the API is configured. It keeps the
 * same shape as the HTTP client, and explains the demo credentials when they are
 * wrong instead of failing silently. Two-factor is simulated with a fixed code.
 */
export const createDemoAuthApi = (): AuthApi => {
  let enabled = false;
  let recoveryCodesLeft = 0;

  const status = (): TwoFactorStatus => ({ enabled, recoveryCodesLeft });

  return {
    login: async (input: LoginInput) => {
      if (input.email !== DEMO_EMAIL || input.password !== DEMO_PASSWORD) {
        throw new ApiError(
          'unauthorized',
          translateNow('auth.demoHint', { email: DEMO_EMAIL, password: DEMO_PASSWORD }),
          401,
        );
      }
      return { user: demoUser, accessToken: 'demo-access-token' };
    },

    verifyTwoFactor: async () => {
      throw new ApiError('unauthorized', translateNow('auth.twoFactorWrong'), 401);
    },

    me: async () => demoUser,
    logout: async () => undefined,

    twoFactorStatus: async () => status(),

    startTwoFactor: async () => ({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Lumio:owner@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Lumio',
    }),

    enableTwoFactor: async (code) => {
      if (code !== DEMO_TOTP_CODE) {
        throw new ApiError('unauthorized', translateNow('auth.twoFactorWrong'), 401);
      }
      enabled = true;
      recoveryCodesLeft = 10;
      return { recoveryCodes: Array.from({ length: 10 }, (_, index) => `DEMO-${index + 1}234`) };
    },

    disableTwoFactor: async (password) => {
      if (password !== DEMO_PASSWORD) {
        throw new ApiError('unauthorized', translateNow('auth.wrongPassword'), 401);
      }
      enabled = false;
      recoveryCodesLeft = 0;
      return status();
    },
  };
};
