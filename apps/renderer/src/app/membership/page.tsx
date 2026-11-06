import type { Metadata } from 'next';
import { ShopShell } from '../../components/ShopShell';
import { AccountPanel, JoinPanel, LoginPanel, PlansPanel } from '../../components/MembershipPanels';
import { loadMembershipPlans, loadReaderSession, readReaderToken } from '../../lib/reader';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop } from '../../lib/shop';
import { storefrontT } from '../../lib/messages';

export async function generateMetadata(): Promise<Metadata> {
  const t = storefrontT(await requestLocale());
  return { title: t('membership.title'), robots: { index: false, follow: true } };
}

export interface MembershipPageProps {
  searchParams: Promise<{ error?: string; checkout?: string; joined?: string }>;
}

/**
 * Join page of the public site (docs/PROGRESS.md batch A). It lists the plans the
 * site sells and, once signed in, the reader's own card. Every action is a plain
 * form posting to a route handler, so the page works without JavaScript.
 */
export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const t = storefrontT(locale);
  const params = await searchParams;
  const token = await readReaderToken();
  const [chrome, reader, plans] = await Promise.all([
    loadShop(host, locale),
    loadReaderSession(host, token),
    loadMembershipPlans(host),
  ]);

  const joined = params.joined === '1' || params.checkout === 'success';
  const cancelled = params.checkout === 'cancel';

  return (
    <ShopShell chrome={chrome} locale={locale} path="/membership">
      <header className="shop-hero">
        <h1 className="shop-hero__title">{t('membership.title')}</h1>
        <p className="shop-hero__subtitle">{t('membership.subtitle')}</p>
      </header>

      <div className="shop-account">
        {cancelled ? (
          <p className="shop-notice" role="status">
            {t('membership.cancelled')}
          </p>
        ) : null}

        {reader ? (
          <AccountPanel reader={reader} locale={locale} />
        ) : (
          <JoinPanel error={params.error} locale={locale} />
        )}
        <PlansPanel plans={plans} signedIn={reader !== null} joined={joined} locale={locale} />
        {reader ? null : <LoginPanel error={params.error} locale={locale} />}
      </div>
    </ShopShell>
  );
}
