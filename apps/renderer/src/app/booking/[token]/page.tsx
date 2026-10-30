import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BOOKING_STATUS_LABELS, bookingRangeLabel } from '@lumio/shared';
import { ShopShell } from '../../../components/ShopShell';
import { bookingIsPast, loadBooking } from '../../../lib/booking';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { loadShop } from '../../../lib/shop';

export const metadata: Metadata = {
  title: 'รายการจอง',
  robots: { index: false, follow: false },
};

export interface BookingTokenPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}

/**
 * Confirmation of one booking, reached only through the token returned after
 * booking. It never lists other bookings, so a guessed link reveals nothing.
 */
export default async function BookingTokenPage({
  params,
  searchParams,
}: BookingTokenPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const [{ token }, { cancelled }] = await Promise.all([params, searchParams]);
  const [chrome, booking] = await Promise.all([
    loadShop(host, locale),
    loadBooking(host, token).catch(() => null),
  ]);
  if (!booking) notFound();

  const past = bookingIsPast(booking);
  const cancelledNow = cancelled === '1' || booking.status === 'cancelled';

  return (
    <ShopShell chrome={chrome} path={`/booking/${token}`} hideTracker>
      <header className="shop-hero">
        <h1 className="shop-hero__title">
          {cancelledNow ? 'ยกเลิกนัดแล้ว' : 'ได้รับคำขอจองแล้ว'}
        </h1>
        <p className="shop-hero__subtitle">
          {cancelledNow
            ? 'หากต้องการเวลาใหม่ กลับไปที่หน้าจองคิวได้เลย'
            : 'เราจะติดต่อกลับเพื่อยืนยันนัดหมายของคุณ'}
        </p>
      </header>

      <section className="shop-order">
        <div className="shop-order__card">
          <dl className="shop-specs__list">
            <div className="shop-specs__row">
              <dt>บริการ</dt>
              <dd>{booking.serviceName}</dd>
            </div>
            <div className="shop-specs__row">
              <dt>วันเวลา</dt>
              <dd>{bookingRangeLabel(booking.startsAt, booking.endsAt)}</dd>
            </div>
            <div className="shop-specs__row">
              <dt>ชื่อ</dt>
              <dd>{booking.customerName}</dd>
            </div>
            <div className="shop-specs__row">
              <dt>สถานะ</dt>
              <dd>{BOOKING_STATUS_LABELS[booking.status].th}</dd>
            </div>
          </dl>

          {!cancelledNow && !past ? (
            <form method="post" action={`/booking/${encodeURIComponent(token)}/cancel`}>
              <button className="shop-button shop-button--ghost" type="submit">
                ยกเลิกนัดนี้
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </ShopShell>
  );
}
