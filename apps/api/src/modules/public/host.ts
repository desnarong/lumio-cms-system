const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Strips the port (and the IPv6 brackets) so `Host` headers compare as one key. */
export const normalizeHost = (host: string): string => {
  const trimmed = host.trim().toLowerCase();
  const hostname = trimmed.startsWith('[')
    ? trimmed.slice(0, trimmed.indexOf(']') + 1)
    : (trimmed.split(':')[0] ?? '');
  return hostname.replace(/\.$/, '');
};

/** Domain free subdomains hang off, e.g. `mysite.lumio.app`. */
export const rootDomain = (): string => (process.env.PUBLIC_ROOT_DOMAIN ?? 'lumio.app').toLowerCase();

/** `baandoi.lumio.app` → `baandoi`; custom domains and nested hosts return null. */
export const subdomainOf = (hostname: string, root = rootDomain()): string | null => {
  if (!hostname.endsWith(`.${root}`)) return null;
  const label = hostname.slice(0, -(root.length + 1));
  return label.length > 0 && !label.includes('.') ? label : null;
};

/** Loopback hosts may fall back to a configured demo site during development. */
export const isLoopbackHost = (hostname: string): boolean => LOOPBACK_HOSTS.has(hostname);
