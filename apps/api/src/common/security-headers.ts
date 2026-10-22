import type { NextFunction, Request, Response } from 'express';

export interface SecurityHeaderOptions {
  /** Send HSTS only when the API is reachable over HTTPS (production). */
  hsts?: boolean;
  /** CSP for API responses. Override only when a route serves a document. */
  contentSecurityPolicy?: string;
}

/**
 * The API answers with JSON and static media, so the strictest CSP still lets
 * the public site embed `/media/*` from another origin. `frame-ancestors` plus
 * `X-Frame-Options` keep the API out of iframes (docs/design/15-security.md 15.2).
 */
export const DEFAULT_API_CSP =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

/** Headers every API response carries. */
export const buildSecurityHeaders = (
  options: SecurityHeaderOptions = {},
): Record<string, string> => {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    // Media and template previews are embedded by sites on other origins.
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Content-Security-Policy': options.contentSecurityPolicy ?? DEFAULT_API_CSP,
  };

  if (options.hsts) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
};

/** Express middleware that stamps the security headers onto every response. */
export const securityHeadersMiddleware =
  (options: SecurityHeaderOptions = {}) =>
  (_request: Request, response: Response, next: NextFunction): void => {
    for (const [key, value] of Object.entries(buildSecurityHeaders(options))) {
      response.setHeader(key, value);
    }
    next();
  };
