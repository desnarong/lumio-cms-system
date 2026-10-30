import type { Metadata } from 'next';
import { ShopShell } from '../../../components/ShopShell';
import { ResetPanel } from '../../../components/MembershipPanels';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { loadShop } from '../../../lib/shop';

// These screens depend on the Host header and a one-off token, never a cache.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ตั้งรหัสผ่านใหม่',
  robots: { index: false, follow: false },
};

export interface ResetPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

/** The screen behind the link in a password-reset email. */
export default async function ResetPasswordPage({ searchParams }: ResetPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const params = await searchParams;
  const chrome = await loadShop(host, locale);

  return (
    <ShopShell chrome={chrome} path="/membership/reset">
      <header className="shop-hero">
        <h1 className="shop-hero__title">ตั้งรหัสผ่านใหม่</h1>
        <p className="shop-hero__subtitle">ตั้งรหัสผ่านใหม่แล้วเข้าสู่ระบบได้ทันที</p>
      </header>
      <div className="shop-account">
        {params.token ? (
          <ResetPanel token={params.token} error={params.error ?? null} />
        ) : (
          <p className="shop-notice shop-notice--error" role="alert">
            ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์ใหม่จากหน้า “ลืมรหัสผ่าน”
          </p>
        )}
      </div>
    </ShopShell>
  );
}
