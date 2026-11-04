/**
 * Address of the site as the visitor sees it.
 *
 * `next start` builds `request.url` from its own listen address, so behind the
 * reverse proxy it says `http://localhost:49200` whatever the visitor typed.
 * A redirect built from that sends the buyer to their own machine, and the
 * page's `form-action 'self'` policy blocks it first. The proxy forwards the
 * public host and scheme, so redirects are built from those instead.
 */

/** Hosts are letters, digits, dots, dashes, an optional port or an IPv6 literal. */
const HOST_PATTERN = /^[a-z0-9.[\]:-]+$/i;

const first = (value: string | null): string => value?.split(',')[0]?.trim() ?? '';

/** `https://shop.example.com` for a request, or `fallback`'s origin when no usable host came in. */
export const publicOrigin = (headers: Headers, fallback: string): string => {
  const host = first(headers.get('x-forwarded-host')) || first(headers.get('host'));
  const base = new URL(fallback);
  if (!HOST_PATTERN.test(host)) return base.origin;

  const forwardedProto = first(headers.get('x-forwarded-proto')).toLowerCase();
  const protocol =
    forwardedProto === 'https' || forwardedProto === 'http'
      ? forwardedProto
      : base.protocol.replace(':', '');
  return `${protocol}://${host}`;
};

/** Absolute URL for `target` on the public site; an absolute `target` is kept as it is. */
export const publicUrl = (target: string, request: Request): URL =>
  new URL(target, publicOrigin(request.headers, request.url));
