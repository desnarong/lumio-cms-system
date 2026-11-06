import type { Metadata } from 'next';
import { formatBaht } from '@lumio/shared';
import { money, shippingFee, storefrontT } from '../../lib/messages';
import { ShopShell } from '../../components/ShopShell';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop, priceCart, readCart } from '../../lib/shop';

export async function generateMetadata(): Promise<Metadata> {
  const t = storefrontT(await requestLocale());
  return { title: t('cart.title'), robots: { index: false, follow: false } };
}

export default async function CartPage() {
  const host = await requestHost();
  const locale = await requestLocale();
  const t = storefrontT(locale);
  const items = await readCart();
  const shop = await loadShop(host, locale);

  let cartError: string | null = null;
  const cart =
    items.length === 0
      ? null
      : await priceCart(host, items, locale).catch((error: unknown) => {
          cartError = error instanceof Error ? error.message : t('cart.unavailable');
          return null;
        });

  return (
    <ShopShell chrome={shop} locale={locale} path="/cart">
      <header className="shop-hero">
        <h1 className="shop-hero__title">{t('cart.title')}</h1>
        <p className="shop-hero__subtitle">
          {cart
            ? `${t('cart.count', { count: cart.cart.count })}${
                cart.cart.freeCount > 0 ? t('cart.extraGift', { count: cart.cart.freeCount }) : ''
              }`
            : t('cart.empty')}
        </p>
      </header>

      {cartError ? <p className="shop-notice shop-notice--error">{cartError}</p> : null}

      {!cart || cart.cart.items.length === 0 ? (
        <div className="shop-empty">
          <p>{t('cart.empty')}</p>
          <a className="shop-button" href="/shop">
            {t('common.shopNow')}
          </a>
        </div>
      ) : (
        <div className="shop-cart">
          <>
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
            <ul className="shop-cart__lines">
              {cart.cart.items.map((line) => (
                <li className="shop-cart__line" key={`${line.product.id}:${line.variantId ?? ''}`}>
                  <a className="shop-cart__thumb" href={`/shop/${line.product.slug}`}>
                    {line.product.images[0] ? (
                      <img
                        src={line.product.images[0]}
                        alt={line.product.title}
                        width={120}
                        height={90}
                      />
                    ) : (
                      <span aria-hidden="true">🛍</span>
                    )}
                  </a>
                  <div className="shop-cart__body">
                    <a className="shop-cart__name" href={`/shop/${line.product.slug}`}>
                      {line.product.title}
                    </a>
                    {line.variantLabel ? (
                      <p className="shop-cart__variant">
                        {t('cart.variant', { label: line.variantLabel })}
                      </p>
                    ) : null}
                    <p className="shop-cart__unit">
                      {t('cart.unitPrice', {
                        amount: formatBaht(
                          line.product.variants.find((variant) => variant.id === line.variantId)
                            ?.price ?? line.product.price,
                        ),
                      })}
                    </p>
                    {line.freeQuantity > 0 ? (
                      <p className="shop-cart__gift">
                        🎁 {t('common.giftPieces', { count: line.freeQuantity })}
                        {line.promotionTitle ? ` · ${line.promotionTitle}` : ''}
                      </p>
                    ) : null}
                    <form className="shop-cart__actions" action="/cart/update" method="post">
                      <input type="hidden" name="productId" value={line.product.id} />
                      {line.variantId ? (
                        <input type="hidden" name="variantId" value={line.variantId} />
                      ) : null}
                      <label
                        className="shop-cart__label"
                        htmlFor={`qty-${line.product.id}-${line.variantId ?? ''}`}
                      >
                        {t('cart.quantity')}
                      </label>
                      <input
                        className="shop-buy__quantity"
                        id={`qty-${line.product.id}-${line.variantId ?? ''}`}
                        name="quantity"
                        type="number"
                        min={1}
                        max={99}
                        defaultValue={line.quantity}
                        inputMode="numeric"
                      />
                      <button className="shop-button shop-button--ghost" type="submit">
                        {t('cart.update')}
                      </button>
                    </form>
                    <form action="/cart/update" method="post">
                      <input type="hidden" name="productId" value={line.product.id} />
                      {line.variantId ? (
                        <input type="hidden" name="variantId" value={line.variantId} />
                      ) : null}
                      <input type="hidden" name="quantity" value="0" />
                      <button className="shop-link-button" type="submit">
                        {t('cart.remove')}
                      </button>
                    </form>
                  </div>
                  <p className="shop-cart__line-total">{money(t, line.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </>

          <aside className="shop-summary" aria-label={t('cart.summary')}>
            <dl className="shop-summary__list">
              <div>
                <dt>{t('common.subtotal')}</dt>
                <dd>{money(t, cart.cart.subtotal)}</dd>
              </div>
              {cart.cart.weightGrams > 0 ? (
                <div>
                  <dt>{t('cart.weight')}</dt>
                  <dd>
                    {t('cart.weightValue', { kg: (cart.cart.weightGrams / 1000).toFixed(2) })}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>{t('common.shipping')}</dt>
                <dd>{shippingFee(t, cart.cart.shippingFee)}</dd>
              </div>
              <div className="shop-summary__grand">
                <dt>{t('common.total')}</dt>
                <dd>{money(t, cart.cart.total)}</dd>
              </div>
            </dl>
            <a className="shop-button" href="/checkout">
              {t('cart.checkout')}
            </a>
            <a className="shop-link-button" href="/shop">
              {t('cart.continue')}
            </a>
          </aside>
        </div>
      )}
    </ShopShell>
  );
}
