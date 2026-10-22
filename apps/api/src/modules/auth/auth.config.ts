export interface AuthConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
  refreshCookieName: string;
  refreshCookieMaxAgeMs: number;
}

const REFRESH_TTL_DAYS = 30;

const readSecret = (name: string): string => {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`);
  }
  return `lumio-dev-${name.toLowerCase()}`;
};

/** Auth settings come from the environment (see .env.example). */
export const getAuthConfig = (): AuthConfig => ({
  accessSecret: readSecret('JWT_ACCESS_SECRET'),
  refreshSecret: readSecret('JWT_REFRESH_SECRET'),
  accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  refreshCookieName: 'lumio_refresh',
  refreshCookieMaxAgeMs: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
});
