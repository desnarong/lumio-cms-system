import type { Metadata } from 'next';
import { bookingDateLabel } from '@lumio/shared';
import { money, storefrontLocale, storefrontT, type StorefrontKey } from '../../lib/messages';
import { ShopShell } from '../../components/ShopShell';
import { BOOKING_HONEYPOT_FIELD, loadBookingPage } from '../../lib/booking';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop } from '../../lib/shop';

export async function generateMetadata(): Promise<Metadata> {
  return { title: storefrontT(await requestLocale())('booking.title') };
}

export interface BookingPageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_TEXT: Record<string, StorefrontKey> = {
  slot: 'booking.error.slot',
  details: 'booking.error.details',
  unavailable: 'booking.error.unavailable',
};

/**
 * Public booking page (docs/PROGRESS.md "งานนอก MVP"). Every action is a plain
 * form, so a visitor can book a slot with no JavaScript at all.
 */
export default async function BookingPage({ searchParams }: BookingPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const t = storefrontT(locale);
  const { error } = await searchParams;
  const [chrome, booking] = await Promise.all([loadShop(host, locale), loadBookingPage(host)]);

  return (
    <ShopShell chrome={chrome} locale={locale} path="/booking">
      <header className="shop-hero">
        <h1 className="shop-hero__title">{t('booking.title')}</h1>
        <p className="shop-hero__subtitle">{booking.intro}</p>
      </header>

      {error ? (
        <p className="shop-notice shop-notice--error" role="alert">
          {t(ERROR_TEXT[error] ?? 'booking.error.unavailable')}
        </p>
      ) : null}

      {!booking.enabled || booking.services.length === 0 ? (
        <section className="shop-empty">
          <h2>{t('booking.closed.title')}</h2>
          <p>{t('booking.closed.body')}</p>
        </section>
      ) : (
        <section className="shop-checkout">
          <form className="shop-checkout__form" method="post" action="/booking/book">
            <h2 className="shop-section-title">{t('booking.pick')}</h2>

            <label className="shop-field">
              <span>{t('common.service')}</span>
              <select name="serviceId" required defaultValue={booking.services[0]?.id ?? ''}>
                {booking.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {t('booking.minutes', { count: service.durationMinutes })} ·{' '}
                    {service.price > 0 ? money(t, service.price) : t('common.free')}
                  </option>
                ))}
              </select>
            </label>

            <label className="shop-field shop-field--wide">
              <span>{t('booking.dateTime')}</span>
              <select name="slot" required defaultValue="">
                <option value="" disabled>
                  {t('booking.pickDay')}
                </option>
                {booking.days.map((day) => (
                  <optgroup
                    key={day.date}
                    label={bookingDateLabel(day.date, storefrontLocale(locale))}
                  >
                    {day.slots
                      .filter((slot) => slot.available)
                      .map((slot) => (
                        <option key={`${day.date}-${slot.time}`} value={`${day.date}|${slot.time}`}>
                          {t('booking.time', { time: slot.time })}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="shop-fields">
              <label className="shop-field">
                <span>{t('common.name')}</span>
                <input name="name" required maxLength={120} autoComplete="name" />
              </label>
              <label className="shop-field">
                <span>{t('common.phone')}</span>
                <input name="phone" maxLength={40} autoComplete="tel" inputMode="tel" />
              </label>
              <label className="shop-field shop-field--wide">
                <span>{t('common.email')}</span>
                <input name="email" type="email" maxLength={200} autoComplete="email" />
              </label>
              <label className="shop-field shop-field--wide">
                <span>{t('common.optional', { label: t('common.note') })}</span>
                <textarea name="note" rows={3} maxLength={500} />
              </label>
            </div>

            <p className="shop-field">
              <span>{t('booking.contactHint')}</span>
            </p>

            <label className="shop-honeypot" aria-hidden="true">
              <span>{t('common.website')}</span>
              <input name={BOOKING_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
            </label>

            <button className="shop-button shop-button--large" type="submit">
              {t('booking.submit')}
            </button>
            <p className="shop-notice">{booking.successMessage}</p>
          </form>
        </section>
      )}
    </ShopShell>
  );
}
