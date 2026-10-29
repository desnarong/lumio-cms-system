import type { Metadata } from 'next';
import { formatBaht } from '@lumio/shared';
import { ShopShell } from '../../components/ShopShell';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { loadShop, priceCart, readCart } from '../../lib/shop';

export const metadata: Metadata = {
  title: 'ยืนยันคำสั่งซื้อ',
  robots: { index: false, follow: false },
};

export interface CheckoutPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const { error } = await searchParams;
  const items = await readCart();
  const shop = await loadShop(host, locale);

  const cart = items.length > 0 ? await priceCart(host, items, locale).catch(() => null) : null;
  const canPromptPay = shop.settings.payments.promptpay && Boolean(shop.settings.promptPayId);
  const canCod = shop.settings.payments.cod;
  const methods = [
    ...(canPromptPay
      ? [{ id: 'promptpay' as const, label: 'พร้อมเพย์', hint: 'สแกน QR จ่ายเงินทันที' }]
      : []),
    ...(shop.settings.payments.card
      ? [{ id: 'card' as const, label: 'บัตรเครดิต/เดบิต', hint: 'ชำระผ่านหน้าจ่ายเงินของ Stripe' }]
      : []),
    ...(shop.settings.payments.bbl
      ? [
          {
            id: 'bbl' as const,
            label: 'ธนาคารกรุงเทพ',
            hint: 'บัตรหรือ QR ผ่านหน้าจ่ายเงินของธนาคาร',
          },
        ]
      : []),
    ...(canCod
      ? [{ id: 'cod' as const, label: 'เก็บเงินปลายทาง', hint: 'ชำระกับขนส่งตอนรับสินค้า' }]
      : []),
  ];

  return (
    <ShopShell chrome={shop} path="/checkout">
      <header className="shop-hero">
        <h1 className="shop-hero__title">ยืนยันคำสั่งซื้อ</h1>
        <p className="shop-hero__subtitle">กรอกที่อยู่จัดส่ง แล้วเลือกวิธีชำระเงิน</p>
      </header>

      {error ? (
        <p className="shop-notice shop-notice--error">
          ยังสั่งซื้อไม่ได้ ข้อมูลอาจไม่ครบหรือสินค้ามีจำนวนไม่พอ กรุณาตรวจอีกครั้ง
        </p>
      ) : null}

      {!cart || cart.cart.items.length === 0 ? (
        <div className="shop-empty">
          <p>ตะกร้ายังว่างอยู่</p>
          <a className="shop-button" href="/shop">
            เลือกซื้อสินค้า
          </a>
        </div>
      ) : methods.length === 0 ? (
        <p className="shop-notice">ร้านนี้ยังไม่เปิดรับชำระเงินออนไลน์ กรุณาติดต่อร้านโดยตรง</p>
      ) : (
        <form className="shop-checkout" action="/checkout/confirm" method="post">
          <div className="shop-checkout__form">
            <h2 className="shop-section-title">ข้อมูลผู้รับ</h2>
            <div className="shop-fields">
              <label className="shop-field">
                <span>ชื่อ-นามสกุล</span>
                <input name="name" required maxLength={120} autoComplete="name" />
              </label>
              <label className="shop-field">
                <span>เบอร์โทร</span>
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
                <span>อีเมล (ไม่บังคับ)</span>
                <input name="email" type="email" autoComplete="email" />
              </label>
              <label className="shop-field shop-field--wide">
                <span>ที่อยู่</span>
                <input name="address" required maxLength={300} autoComplete="street-address" />
              </label>
              <label className="shop-field">
                <span>ตำบล / แขวง</span>
                <input name="subdistrict" maxLength={120} />
              </label>
              <label className="shop-field">
                <span>อำเภอ / เขต</span>
                <input name="district" maxLength={120} />
              </label>
              <label className="shop-field">
                <span>จังหวัด</span>
                <input name="province" required maxLength={120} />
              </label>
              <label className="shop-field">
                <span>รหัสไปรษณีย์</span>
                <input name="postcode" required inputMode="numeric" pattern="[0-9]{5}" />
              </label>
              <label className="shop-field shop-field--wide">
                <span>หมายเหตุถึงร้าน (ไม่บังคับ)</span>
                <textarea name="note" rows={3} maxLength={500} />
              </label>
            </div>

            <h2 className="shop-section-title">วิธีชำระเงิน</h2>
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
              สั่งซื้อ · {formatBaht(cart.cart.total)} บาท
            </button>
          </div>

          <aside className="shop-summary" aria-label="สรุปคำสั่งซื้อ">
            <h2 className="shop-section-title">สรุปคำสั่งซื้อ</h2>
            <ul className="shop-summary__items">
              {cart.cart.items.map((line) => (
                <li key={`${line.product.id}:${line.variantId ?? ''}`}>
                  <span>
                    {line.product.title}
                    {line.variantLabel ? ` (${line.variantLabel})` : ''} × {line.quantity}
                    {line.freeQuantity > 0 ? ` + แถม ${line.freeQuantity}` : ''}
                  </span>
                  <span>{formatBaht(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {cart.cart.promotions.length > 0 ? (
              <ul className="shop-promos" aria-label="โปรโมชั่นที่ใช้ได้">
                {cart.cart.promotions.map((promotion) => (
                  <li key={promotion.title}>
                    🎁 {promotion.title} — แถม {promotion.freeQuantity} ชิ้น
                  </li>
                ))}
              </ul>
            ) : null}
            <dl className="shop-summary__list">
              <div>
                <dt>ยอดสินค้า</dt>
                <dd>{formatBaht(cart.cart.subtotal)} บาท</dd>
              </div>
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
            <p className="shop-payment__hint">
              ค่าจัดส่งสุดท้ายคำนวณจากจังหวัดและน้ำหนักสินค้าตอนยืนยันคำสั่งซื้อ
            </p>
          </aside>
        </form>
      )}
    </ShopShell>
  );
}
