export interface CspOptions {
  /** Per-request nonce Next.js stamps onto the scripts it generates. */
  nonce: string;
  /** Dev needs `'unsafe-eval'` for the HMR runtime, which has no nonce. */
  dev?: boolean;
}

/**
 * Content-Security-Policy for the public site (docs/design/15-security.md 15.2).
 * Scripts must come from the app or carry the request nonce, so injected inline
 * script cannot run; images may come from the API/CDN that serves the media
 * library; the site can never be framed.
 */
export const buildContentSecurityPolicy = ({ nonce, dev = false }: CspOptions): string => {
  const scriptSrc = dev
    ? ["'self'", "'unsafe-eval'", "'unsafe-inline'"]
    : ["'self'", `'nonce-${nonce}'`];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http://localhost:*",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
};
