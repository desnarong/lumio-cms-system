/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@lumio/blocks', '@lumio/shared', '@lumio/tokens', '@lumio/ui'],
  async headers() {
    return [
      {
        // Security headers on every response (docs/design/15-security.md 15.2).
        // The Content-Security-Policy itself is set per request in
        // `src/middleware.ts` because it carries a nonce.
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        // Public HTML is rendered on demand but safe to cache at the edge. The
        // publish pipeline revalidates the Next data cache per path, and a CDN
        // purge (or the short s-maxage) clears the HTML
        // (docs/design/10-architecture.md 10.4, 14-seo-performance.md 14.2).
        source: '/((?!api/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
