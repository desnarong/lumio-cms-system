import type { Metadata } from 'next';
import { ShopShell } from '../../../components/ShopShell';
import { ForgotPanel } from '../../../components/MembershipPanels';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { loadShop } from '../../../lib/shop';

// These screens depend on the Host header and a one-off token, never a cache.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ลืมรหัสผ่าน',
  robots: { index: false, follow: false },
};

export interface ForgotPageProps {
  searchParams: Promise<{ sent?: string; error?: string }>;
}

/** Asks for a password reset link; the answer never reveals whether the email exists. */
export default async function ForgotPasswordPage({ searchParams }: ForgotPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const params = await searchParams;
  const chrome = await loadShop(host, locale);

  return (
    <ShopShell chrome={chrome} path="/membership/forgot">
      <header className="shop-hero">
        <h1 className="shop-hero__title">ลืมรหัสผ่าน</h1>
        <p className="shop-hero__subtitle">เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ทางอีเมล</p>
      </header>
      <div className="shop-account">
        <ForgotPanel sent={params.sent === '1'} error={params.error ?? null} />
      </div>
    </ShopShell>
  );
}
