/**
 * Social preview card (docs/design/14-seo-performance.md 14.1 "OG image เจน
 * อัตโนมัติ"). Every page gets one without the owner designing anything: the
 * image route draws the page title and site name with the bundled Thai font.
 */

const MAX_TITLE = 120;
const MAX_SITE = 60;

const clip = (value: string, max: number): string => value.trim().slice(0, max);

export const ogImageUrl = (origin: string, title: string, siteName: string): string => {
  const params = new URLSearchParams({
    title: clip(title, MAX_TITLE) || 'Lumio',
    site: clip(siteName, MAX_SITE),
  });
  return `${origin}/og?${params.toString()}`;
};
