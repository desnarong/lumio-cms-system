import type { Metadata } from 'next';
import { formatBaht } from '@lumio/shared';
import { ShopShell } from '../../components/ShopShell';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop, priceCart, readCart } from '../../lib/shop';

export const metadata: Metadata = {
  title: 'ตะกร้าสินค้า',
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const host = await requestHost();
  const locale = await requestLocale();
  const items = await readCart();
  const shop = await loadShop(host, locale);

  let cartError: string | null = null;
  const cart =
    items.length === 0
      ? null
      : await priceCart(host, items, locale).catch((error: unknown) => {
          cartError = error instanceof Error ? error.message : 'สินค้าในตะกร้าไม่พร้อมขายแล้ว';
          return null;
        });

  return (
    <ShopShell chrome={shop} path="/cart">
      <header className="shop-hero">
        <h1 className="shop-hero__title">ตะกร้าสินค้า</h1>
        <p className="shop-hero__subtitle">
          {cart ? `${cart.cart.count} ชิ้นในตะกร้า` : 'ยังไม่มีสินค้าในตะกร้า'}
        </p>
      </header>

      {cartError ? <p className="shop-notice shop-notice--error">{cartError}</p> : null}

      {!cart || cart.cart.items.length === 0 ? (
        <div className="shop-empty">
          <p>ยังไม่มีสินค้าในตะกร้า</p>
          <a className="shop-button" href="/shop">
            เลือกซื้อสินค้า
          </a>
        </div>
      ) : (
        <div className="shop-cart">
          <ul className="shop-cart__lines">
            {cart.cart.items.map((line) => (
              <li
                className="shop-cart__line"
                key={`${line.product.id}:${line.variantId ?? ''}`}
              >
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
                    <p className="shop-cart__variant">ตัวเลือก: {line.variantLabel}</p>
                  ) : null}
                  <p className="shop-cart__unit">
                    {formatBaht(
                      line.product.variants.find((variant) => variant.id === line.variantId)
                        ?.price ?? line.product.price,
                    )}{' '}
                    บาท / ชิ้น
                  </p>
                  <form className="shop-cart__actions" action="/cart/update" method="post">
                    <input type="hidden" name="productId" value={line.product.id} />
                    {line.variantId ? (
                      <input type="hidden" name="variantId" value={line.variantId} />
                    ) : null}
                    <label
                      className="shop-cart__label"
                      htmlFor={`qty-${line.product.id}-${line.variantId ?? ''}`}
                    >
                      จำนวน
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
                      อัปเดต
                    </button>
                  </form>
                  <form action="/cart/update" method="post">
                    <input type="hidden" name="productId" value={line.product.id} />
                    {line.variantId ? (
                      <input type="hidden" name="variantId" value={line.variantId} />
                    ) : null}
                    <input type="hidden" name="quantity" value="0" />
                    <button className="shop-link-button" type="submit">
                      ลบออก
                    </button>
                  </form>
                </div>
                <p className="shop-cart__line-total">{formatBaht(line.lineTotal)} บาท</p>
              </li>
            ))}
          </ul>

          <aside className="shop-summary" aria-label="สรุปยอด">
            <dl className="shop-summary__list">
              <div>
                <dt>ยอดสินค้า</dt>
                <dd>{formatBaht(cart.cart.subtotal)} บาท</dd>
              </div>
              {cart.cart.weightGrams > 0 ? (
                <div>
                  <dt>น้ำหนักรวม</dt>
                  <dd>{(cart.cart.weightGrams / 1000).toFixed(2)} กก.</dd>
                </div>
              ) : null}
              <div>
                <dt>ค่าจัดส่ง</dt>
                <dd>
                  {cart.cart.shippingFee === 0 ? 'ฟรี' : `${formatBaht(cart.cart.shippingFee)} บาท`}
                </dd>
              </div>
              <div className="shop-summary__grand">
                <dt>รวมทั้งสิ้น</dt>
                <dd>{formatBaht(cart.cart.total)} บาท</dd>
              </div>
            </dl>
            <a className="shop-button" href="/checkout">
              ดำเนินการสั่งซื้อ
            </a>
            <a className="shop-link-button" href="/shop">
              เลือกซื้อต่อ
            </a>
          </aside>
        </div>
      )}
    </ShopShell>
  );
}
