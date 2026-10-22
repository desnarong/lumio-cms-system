/**
 * How many proxies sit in front of the API. Express only trusts
 * `X-Forwarded-For` up to this many hops, so `request.ip` (which the rate
 * limiter keys on) resolves the real client instead of the proxy. The repo
 * ships a Caddy reverse proxy, hence the default of one hop
 * (docs/design/15-security.md 15.2).
 */
export const resolveTrustProxy = (value: string | undefined): number | boolean => {
  if (value === undefined || value.trim() === '') return 1;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  const hops = Number(normalized);
  return Number.isInteger(hops) && hops >= 0 ? hops : 1;
};
