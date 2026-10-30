import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { SignInPanel } from '../../components/SignInPanel';
import { ShopShell } from '../../components/ShopShell';
import { SAVED_ORDERS_COOKIE, parseSavedOrders } from '../../lib/customer';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop } from '../../lib/shop';

export const metadata: Metadata = {
  title: 'บัญชีของฉัน',
  robots: { index: false, follow: false },
};

export interface SignInPageProps {
  searchParams: Promise<{ error?: string }>;
}

/**
 * The storefront account screen. It reads the orders this device already
 * opened and offers the lookup form for a new one; the shop chrome keeps the
 * page looking like the rest of the site.
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const { error } = await searchParams;
  const shop = await loadShop(host, locale);
  const saved = parseSavedOrders((await cookies()).get(SAVED_ORDERS_COOKIE)?.value);

  return (
    <ShopShell chrome={shop} path="/signin">
      <header className="shop-hero">
        <h1 className="shop-hero__title">บัญชีของฉัน</h1>
        <p className="shop-hero__subtitle">
          เปิดดูคำสั่งซื้อและติดตามสถานะได้โดยไม่ต้องจำรหัสผ่าน
        </p>
      </header>
      <SignInPanel saved={saved} error={error ?? null} />
    </ShopShell>
  );
}
