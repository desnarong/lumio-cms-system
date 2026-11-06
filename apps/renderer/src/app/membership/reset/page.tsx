import type { Metadata } from 'next';
import { ShopShell } from '../../../components/ShopShell';
import { ResetPanel } from '../../../components/MembershipPanels';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { loadShop } from '../../../lib/shop';
import { storefrontT } from '../../../lib/messages';

// These screens depend on the Host header and a one-off token, never a cache.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = storefrontT(await requestLocale());
  return { title: t('member.reset'), robots: { index: false, follow: false } };
}

export interface ResetPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

/** The screen behind the link in a password-reset email. */
export default async function ResetPasswordPage({ searchParams }: ResetPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const t = storefrontT(locale);
  const params = await searchParams;
  const chrome = await loadShop(host, locale);

  return (
    <ShopShell chrome={chrome} locale={locale} path="/membership/reset">
      <header className="shop-hero">
        <h1 className="shop-hero__title">{t('member.reset')}</h1>
        <p className="shop-hero__subtitle">{t('membership.resetSubtitle')}</p>
      </header>
      <div className="shop-account">
        {params.token ? (
          <ResetPanel token={params.token} error={params.error ?? null} locale={locale} />
        ) : (
          <p className="shop-notice shop-notice--error" role="alert">
            {t('membership.resetInvalid')}
          </p>
        )}
      </div>
    </ShopShell>
  );
}
