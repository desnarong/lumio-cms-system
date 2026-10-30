import type { PublicMembershipPlan } from '@lumio/shared';
import { formatMembershipPrice, intervalLabel } from '@lumio/shared';

export interface PaywallNoticeProps {
  plans: readonly PublicMembershipPlan[];
  /** Already signed in: the call to action is joining, not signing in. */
  signedIn: boolean;
}

/**
 * What a visitor sees instead of the body of a members-only page. The teaser
 * (title and summary) still renders above it, so search engines and readers see
 * what the page is about without ever receiving the locked content.
 */
export const PaywallNotice = ({ plans, signedIn }: PaywallNoticeProps) => (
  <section className="paywall" aria-labelledby="paywall-title">
    <p className="paywall__badge">เนื้อหาสำหรับสมาชิก</p>
    <h2 className="paywall__title" id="paywall-title">
      เข้าร่วมเพื่ออ่านต่อ
    </h2>
    <p className="paywall__text">
      หน้าต้นฉบับนี้เปิดให้สมาชิกของเว็บอ่าน เข้าร่วมแล้วอ่านได้ทุกหน้าและทุกบทความที่ไม่จำกัดสิทธิ์
    </p>

    {plans.length > 0 ? (
      <ul className="paywall__plans">
        {plans.map((plan) => (
          <li className="paywall__plan" key={plan.id}>
            <span className="paywall__plan-name">{plan.name}</span>
            <span className="paywall__plan-price">
              {formatMembershipPrice(plan.price, plan.currency)}
              <span className="paywall__plan-interval"> / {intervalLabel(plan.interval)}</span>
            </span>
            {plan.description ? (
              <span className="paywall__plan-note">{plan.description}</span>
            ) : null}
          </li>
        ))}
      </ul>
    ) : null}

    <div className="paywall__actions">
      <a className="shop-button" href="/membership">
        {signedIn ? 'เลือกแพ็กเกจ' : 'สมัครหรือเข้าสู่ระบบ'}
      </a>
      <a className="paywall__hint" href="/membership#login">
        มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
      </a>
    </div>
  </section>
);
