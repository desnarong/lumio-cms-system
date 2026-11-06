import type { Metadata } from 'next';
import { ShopShell } from '../../../components/ShopShell';
import { ForgotPanel } from '../../../components/MembershipPanels';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { loadShop } from '../../../lib/shop';
import { storefrontT } from '../../../lib/messages';

// These screens depend on the Host header and a one-off token, never a cache.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = storefrontT(await requestLocale());
  return { title: t('member.forgot'), robots: { index: false, follow: false } };
}

export interface ForgotPageProps {
  searchParams: Promise<{ sent?: string; error?: string }>;
}

/** Asks for a password reset link; the answer never reveals whether the email exists. */
export default async function ForgotPasswordPage({ searchParams }: ForgotPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const t = storefrontT(locale);
  const params = await searchParams;
  const chrome = await loadShop(host, locale);

  return (
    <ShopShell chrome={chrome} locale={locale} path="/membership/forgot">
      <header className="shop-hero">
        <h1 className="shop-hero__title">{t('member.forgot')}</h1>
        <p className="shop-hero__subtitle">{t('membership.forgotSubtitle')}</p>
      </header>
      <div className="shop-account">
        <ForgotPanel sent={params.sent === '1'} error={params.error ?? null} locale={locale} />
      </div>
    </ShopShell>
  );
}
