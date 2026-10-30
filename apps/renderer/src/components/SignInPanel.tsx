import { savedOrderDate, type SavedOrder } from '../lib/customer';

/** Human explanations for the `?error=` codes the lookup route redirects with. */
export const SIGN_IN_NOTICES: Record<string, string> = {
  'not-found': 'ไม่พบคำสั่งซื้อที่ตรงกับเลขคำสั่งซื้อและข้อมูลติดต่อนี้ ลองตรวจอีกครั้ง',
  invalid: 'กรุณากรอกเลขคำสั่งซื้อ และเบอร์โทรหรืออีเมลที่ใช้สั่งซื้อ',
  unavailable: 'ตอนนี้ระบบขัดข้อง ลองอีกครั้งในอีกสักครู่',
};

export interface SignInPanelProps {
  /** Orders this device already opened; empty for a first visit. */
  saved: SavedOrder[];
  /** `?error=` code from the lookup route. */
  error?: string | null;
}

/**
 * The storefront account screen. There are no customer passwords yet, so a
 * visitor proves ownership of an order with the number from the receipt plus
 * the phone or email used at checkout (docs/design/11-data-model.md 11.3).
 * Plain HTML forms only, so it works with JavaScript turned off.
 */
export const SignInPanel = ({ saved, error }: SignInPanelProps) => {
  const notice = error ? SIGN_IN_NOTICES[error] ?? SIGN_IN_NOTICES['not-found'] : null;

  return (
    <div className="shop-account">
      {notice ? (
        <p className="shop-notice shop-notice--error" role="alert">
          {notice}
        </p>
      ) : null}

      {saved.length > 0 ? (
        <section className="shop-account__saved" aria-labelledby="saved-orders-heading">
          <h2 className="shop-section-title" id="saved-orders-heading">
            คำสั่งซื้อที่เปิดไว้บนเครื่องนี้
          </h2>
          <ul className="shop-account__list">
            {saved.map((order) => (
              <li key={order.token}>
                <a className="shop-account__order" href={`/order/${encodeURIComponent(order.token)}`}>
                  <strong>{order.number}</strong>
                  <span className="shop-payment__hint">{savedOrderDate(order.createdAt)}</span>
                </a>
              </li>
            ))}
          </ul>
          <form action="/signin/signout" method="post">
            <button className="shop-button shop-button--ghost" type="submit">
              ออกจากระบบ
            </button>
          </form>
        </section>
      ) : null}

      <form className="shop-account__form" action="/signin/lookup" method="post">
        <h2 className="shop-section-title">เข้าสู่ระบบด้วยคำสั่งซื้อ</h2>
        <p className="shop-payment__hint">
          ใช้เลขคำสั่งซื้อบนใบเสร็จ และเบอร์โทรหรืออีเมลที่ให้ไว้ตอนสั่งซื้อ
          ระบบจะพาไปหน้าคำสั่งซื้อของคุณทันที
        </p>
        <div className="shop-fields">
          <label className="shop-field shop-field--wide">
            <span>เลขคำสั่งซื้อ</span>
            <input
              name="number"
              required
              autoComplete="off"
              placeholder="LM-261022-7K4Q"
              maxLength={40}
            />
          </label>
          <label className="shop-field shop-field--wide">
            <span>เบอร์โทรหรืออีเมลที่ใช้สั่งซื้อ</span>
            <input name="contact" required autoComplete="tel" maxLength={200} />
          </label>
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
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  );
};
