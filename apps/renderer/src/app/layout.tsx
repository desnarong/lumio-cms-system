import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@lumio/tokens/theme.css';
import '@lumio/ui/styles.css';
import '@lumio/blocks/styles.css';
import './globals.css';
import './shop.css';
import { requestLocale } from '../lib/request-locale';

/**
 * The root layout stays free of client JavaScript. Fonts are the platform UI
 * stack from the design tokens (no third-party request), which keeps the
 * performance budget from docs/design/14-seo-performance.md 14.2 intact. The
 * `lang` attribute follows the language of the requested URL (design 17-i18n.md).
 */
export const metadata: Metadata = {
  metadataBase: undefined,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await requestLocale();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Kanit:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Prompt:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
