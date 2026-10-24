export interface AuthConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
  refreshCookieName: string;
  refreshCookieMaxAgeMs: number;
}

const UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** `24h`, `30d`, `15m`: the cookie must expire when the refresh token does. */
const ttlToMs = (ttl: string, fallbackDays = 1): number => {
  const match = /^(\d+)\s*([smhd])$/.exec(ttl.trim().toLowerCase());
  if (!match) return fallbackDays * UNIT_MS.d;
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
};

const readSecret = (name: string): string => {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`);
  }
  return `lumio-dev-${name.toLowerCase()}`;
};

/** Auth settings come from the environment (see .env.example). */
export const getAuthConfig = (): AuthConfig => {
  const refreshTtl = process.env.JWT_REFRESH_TTL ?? '24h';
  return {
    accessSecret: readSecret('JWT_ACCESS_SECRET'),
    refreshSecret: readSecret('JWT_REFRESH_SECRET'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl,
    refreshCookieName: 'lumio_refresh',
    refreshCookieMaxAgeMs: ttlToMs(refreshTtl),
  };
};
