import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@lumio/tokens/theme.css';
import '@lumio/ui/styles.css';
import '@lumio/blocks/styles.css';
import './globals.css';
import './shop.css';
import './fonts';
import { requestLocale } from '../lib/request-locale';

/**
 * The root layout stays free of client JavaScript. The design fonts are
 * self-hosted (./fonts.ts), so a visit makes no third-party request, which
 * keeps the performance budget from docs/design/14-seo-performance.md 14.2
 * intact. The `lang` attribute follows the language of the requested URL
 * (design 17-i18n.md).
 */
export const metadata: Metadata = {
  metadataBase: undefined,
};

/**
 * Pin the layout to the real phone width. Without an explicit scale the browser
 * treats the page as a zoomed desktop layout and inflates text to compensate,
 * which is why a 16px paragraph could fill the screen on a phone.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await requestLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
