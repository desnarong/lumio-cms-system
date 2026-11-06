import type { Metadata } from 'next';
import { formatBaht } from '@lumio/shared';
import { money, shippingFee, storefrontT } from '../../lib/messages';
import { ShopShell } from '../../components/ShopShell';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop, priceCart, readCart } from '../../lib/shop';

export async function generateMetadata(): Promise<Metadata> {
  const t = storefrontT(await requestLocale());
  return { title: t('checkout.title'), robots: { index: false, follow: false } };
}

export interface CheckoutPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const t = storefrontT(locale);
  const { error } = await searchParams;
  const items = await readCart();
  const shop = await loadShop(host, locale);

  const cart = items.length > 0 ? await priceCart(host, items, locale).catch(() => null) : null;
  const canPromptPay = shop.settings.payments.promptpay && Boolean(shop.settings.promptPayId);
  const canCod = shop.settings.payments.cod;
  const methods = [
    ...(canPromptPay
      ? [
          {
            id: 'promptpay' as const,
            label: t('checkout.method.promptpay'),
            hint: t('checkout.method.promptpayHint'),
          },
        ]
      : []),
    ...(shop.settings.payments.card
      ? [
          {
            id: 'card' as const,
            label: t('checkout.method.card'),
            hint: t('checkout.method.cardHint'),
          },
        ]
      : []),
    ...(shop.settings.payments.bbl
      ? [
          {
            id: 'bbl' as const,
            label: t('checkout.method.bbl'),
            hint: t('checkout.method.bblHint'),
          },
        ]
      : []),
    ...(canCod
      ? [
          {
            id: 'cod' as const,
            label: t('checkout.method.cod'),
            hint: t('checkout.method.codHint'),
          },
        ]
      : []),
  ];

  return (
    <ShopShell chrome={shop} locale={locale} path="/checkout">
      <header className="shop-hero">
        <h1 className="shop-hero__title">{t('checkout.title')}</h1>
        <p className="shop-hero__subtitle">{t('checkout.subtitle')}</p>
      </header>

      {error ? <p className="shop-notice shop-notice--error">{t('checkout.error')}</p> : null}

      {!cart || cart.cart.items.length === 0 ? (
        <div className="shop-empty">
          <p>{t('common.emptyCart')}</p>
          <a className="shop-button" href="/shop">
            {t('common.shopNow')}
          </a>
        </div>
      ) : methods.length === 0 ? (
        <p className="shop-notice">{t('checkout.noPayments')}</p>
      ) : (
        <form className="shop-checkout" action="/checkout/confirm" method="post">
          <div className="shop-checkout__form">
            <h2 className="shop-section-title">{t('checkout.recipient')}</h2>
            <div className="shop-fields">
              <label className="shop-field">
                <span>{t('common.fullName')}</span>
                <input name="name" required maxLength={120} autoComplete="name" />
              </label>
              <label className="shop-field">
                <span>{t('common.phone')}</span>
                <input
                  name="phone"
                  required
                  inputMode="tel"
                  pattern="0[0-9]{8,9}"
                  autoComplete="tel"
                  placeholder="0812345678"
                />
              </label>
              <label className="shop-field shop-field--wide">
                <span>{t('common.optional', { label: t('common.email') })}</span>
                <input name="email" type="email" autoComplete="email" />
              </label>
              <label className="shop-field shop-field--wide">
                <span>{t('checkout.address')}</span>
                <input name="address" required maxLength={300} autoComplete="street-address" />
              </label>
              <label className="shop-field">
                <span>{t('checkout.subdistrict')}</span>
                <input name="subdistrict" maxLength={120} />
              </label>
              <label className="shop-field">
                <span>{t('checkout.district')}</span>
                <input name="district" maxLength={120} />
              </label>
              <label className="shop-field">
                <span>{t('checkout.province')}</span>
                <input name="province" required maxLength={120} />
              </label>
              <label className="shop-field">
                <span>{t('checkout.postcode')}</span>
                <input name="postcode" required inputMode="numeric" pattern="[0-9]{5}" />
              </label>
              <label className="shop-field shop-field--wide">
                <span>{t('common.optional', { label: t('checkout.noteToShop') })}</span>
                <textarea name="note" rows={3} maxLength={500} />
              </label>
            </div>

            <h2 className="shop-section-title">{t('checkout.paymentMethod')}</h2>
            <div className="shop-methods">
              {methods.map((method, index) => (
                <label className="shop-method" key={method.id}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    defaultChecked={index === 0}
                  />
                  <span>
                    <strong>{method.label}</strong>
                    <small>{method.hint}</small>
                  </span>
                </label>
              ))}
            </div>

            <input
              type="text"
              name="_hp"
              tabIndex={-1}
              autoComplete="off"
              className="shop-honeypot"
              aria-hidden="true"
            />
            <button className="shop-button shop-button--large" type="submit">
              {t('checkout.submit', { amount: formatBaht(cart.cart.total) })}
            </button>
          </div>

          <aside className="shop-summary" aria-label={t('checkout.summary')}>
            <h2 className="shop-section-title">{t('checkout.summary')}</h2>
            <ul className="shop-summary__items">
              {cart.cart.items.map((line) => (
                <li key={`${line.product.id}:${line.variantId ?? ''}`}>
                  <span>
                    {line.product.title}
                    {line.variantLabel ? ` (${line.variantLabel})` : ''} × {line.quantity}
                    {line.freeQuantity > 0
                      ? t('checkout.lineGift', { count: line.freeQuantity })
                      : ''}
                  </span>
                  <span>{formatBaht(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {cart.cart.promotions.length > 0 ? (
              <ul className="shop-promos" aria-label={t('common.promotionsLabel')}>
                {cart.cart.promotions.map((promotion) => (
                  <li key={promotion.title}>
                    {t('common.promotionGift', {
                      title: promotion.title,
                      count: promotion.freeQuantity,
                    })}
                  </li>
                ))}
              </ul>
            ) : null}
            <dl className="shop-summary__list">
              <div>
                <dt>{t('common.subtotal')}</dt>
                <dd>{money(t, cart.cart.subtotal)}</dd>
              </div>
              <div>
                <dt>{t('common.shipping')}</dt>
                <dd>{shippingFee(t, cart.cart.shippingFee)}</dd>
              </div>
              <div className="shop-summary__grand">
                <dt>{t('common.total')}</dt>
                <dd>{money(t, cart.cart.total)}</dd>
              </div>
            </dl>
            <p className="shop-payment__hint">{t('checkout.shippingHint')}</p>
          </aside>
        </form>
      )}
    </ShopShell>
  );
}
