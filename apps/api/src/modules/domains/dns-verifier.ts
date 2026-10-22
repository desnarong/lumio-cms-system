import { normalizeHost } from '../public/host';

/**
 * Checks that a custom domain actually points at the site's free subdomain.
 * Kept behind an interface so the service can be tested without touching DNS.
 */
export interface DomainVerifier {
  resolves(hostname: string, target: string): Promise<boolean>;
}

export const DOMAIN_VERIFIER = Symbol('DOMAIN_VERIFIER');

/**
 * A domain is considered connected when it has a CNAME to the site's free
 * subdomain, or an A record pointing at the same address as that subdomain.
 */
export const createDnsDomainVerifier = (): DomainVerifier => ({
  async resolves(hostname: string, target: string): Promise<boolean> {
    const dns = await import('node:dns/promises');

    try {
      const cnames = await dns.resolveCname(hostname);
      if (cnames.some((cname) => normalizeHost(cname) === target)) return true;
    } catch {
      // No CNAME record; fall through to the address check.
    }

    try {
      const [hostAddresses, targetAddresses] = await Promise.all([
        dns.resolve4(hostname),
        dns.resolve4(target),
      ]);
      return hostAddresses.some((address) => targetAddresses.includes(address));
    } catch {
      return false;
    }
  },
});
