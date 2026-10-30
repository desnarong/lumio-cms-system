import type { Metadata } from 'next';
import { ShopShell } from '../../components/ShopShell';
import { BOOKING_HONEYPOT_FIELD, loadBookingPage } from '../../lib/booking';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop } from '../../lib/shop';

export const metadata: Metadata = {
  title: 'จองคิว',
};

export interface BookingPageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_TEXT: Record<string, string> = {
  slot: 'เวลานี้เพิ่งถูกจองไป กรุณาเลือกเวลาอื่น',
  details: 'กรุณากรอกชื่อและเบอร์โทรหรืออีเมล',
  unavailable: 'ระบบจองไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่หรือโทรหาเรา',
};

/**
 * Public booking page (docs/PROGRESS.md "งานนอก MVP"). Every action is a plain
 * form, so a visitor can book a slot with no JavaScript at all.
 */
export default async function BookingPage({ searchParams }: BookingPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const { error } = await searchParams;
  const [chrome, booking] = await Promise.all([loadShop(host, locale), loadBookingPage(host)]);

  return (
    <ShopShell chrome={chrome} path="/booking">
      <header className="shop-hero">
        <h1 className="shop-hero__title">จองคิว</h1>
        <p className="shop-hero__subtitle">{booking.intro}</p>
      </header>

      {error ? (
        <p className="shop-notice shop-notice--error" role="alert">
          {ERROR_TEXT[error] ?? ERROR_TEXT.unavailable}
        </p>
      ) : null}

      {!booking.enabled || booking.services.length === 0 ? (
        <section className="shop-empty">
          <h2>ยังไม่เปิดรับการจองออนไลน์</h2>
          <p>ตอนนี้สามารถโทรหรือส่งข้อความถึงเราเพื่อนัดหมายได้เลย</p>
        </section>
      ) : (
        <section className="shop-checkout">
          <form className="shop-checkout__form" method="post" action="/booking/book">
            <h2 className="shop-section-title">เลือกบริการและเวลา</h2>

            <label className="shop-field">
              <span>บริการ</span>
              <select name="serviceId" required defaultValue={booking.services[0]?.id ?? ''}>
                {booking.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.durationMinutes} นาที
                    {service.price > 0
                      ? ` · ${(service.price / 100).toLocaleString('th-TH')} บาท`
                      : ' · ฟรี'}
                  </option>
                ))}
              </select>
            </label>

            <label className="shop-field shop-field--wide">
              <span>วันและเวลา</span>
              <select name="slot" required defaultValue="">
                <option value="" disabled>
                  เลือกวันที่ต้องการ
                </option>
                {booking.days.map((day) => (
                  <optgroup key={day.date} label={day.label}>
                    {day.slots
                      .filter((slot) => slot.available)
                      .map((slot) => (
                        <option key={`${day.date}-${slot.time}`} value={`${day.date}|${slot.time}`}>
                          {slot.time} น.
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="shop-fields">
              <label className="shop-field">
                <span>ชื่อ</span>
                <input name="name" required maxLength={120} autoComplete="name" />
              </label>
              <label className="shop-field">
                <span>เบอร์โทร</span>
                <input name="phone" maxLength={40} autoComplete="tel" inputMode="tel" />
              </label>
              <label className="shop-field shop-field--wide">
                <span>อีเมล</span>
                <input name="email" type="email" maxLength={200} autoComplete="email" />
              </label>
              <label className="shop-field shop-field--wide">
                <span>หมายเหตุ (ไม่บังคับ)</span>
                <textarea name="note" rows={3} maxLength={500} />
              </label>
            </div>

            <p className="shop-field">
              <span>ให้เบอร์โทรหรืออีเมลอย่างน้อยหนึ่งอย่าง เพื่อให้เราติดต่อกลับได้</span>
            </p>

            <label className="shop-honeypot" aria-hidden="true">
              <span>เว็บไซต์</span>
              <input name={BOOKING_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
            </label>

            <button className="shop-button shop-button--large" type="submit">
              ส่งคำขอจอง
            </button>
            <p className="shop-notice">{booking.successMessage}</p>
          </form>
        </section>
      )}
    </ShopShell>
  );
}
