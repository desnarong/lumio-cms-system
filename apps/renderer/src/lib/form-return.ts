/**
 * Where to send a visitor after they submit a form: back to the page they came
 * from, but only for a path on this host. An absolute URL or a foreign host is
 * ignored, so a crafted `Referer` can never turn the redirect into an open
 * redirect.
 */
export const formReturnPath = (referer: string | null | undefined, host: string): string => {
  if (!referer) return '/';

  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return '/';
  }

  if (url.host !== host) return '/';

  const path = `${url.pathname}${url.search}`;
  return path.startsWith('/') ? path : '/';
};
