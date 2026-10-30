import type { PublicMembershipPlan, ReaderSession } from '@lumio/shared';
import { formatMembershipPrice, intervalLabel } from '@lumio/shared';

/** Human explanations for the `?error=` codes the membership routes redirect with. */
export const MEMBERSHIP_NOTICES: Record<string, string> = {
  'sign-in': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง ลองอีกครั้ง',
  exists: 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ',
  invalid: 'กรุณากรอกข้อมูลให้ครบและใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร',
  unavailable: 'ตอนนี้ระบบขัดข้อง ลองอีกครั้งในอีกสักครู่',
  'plan-missing': 'ไม่พบแพ็กเกจที่เลือก กรุณาเลือกใหม่',
  expired: 'ลิงก์นี้หมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง',
};

export const membershipNotice = (code: string | null | undefined): string | null =>
  code ? (MEMBERSHIP_NOTICES[code] ?? MEMBERSHIP_NOTICES.invalid ?? null) : null;

export interface NoticeProps {
  code: string | null | undefined;
}

export const MembershipNotice = ({ code }: NoticeProps) => {
  const notice = membershipNotice(code);
  if (!notice) return null;
  return (
    <p className="shop-notice shop-notice--error" role="alert">
      {notice}
    </p>
  );
};

const planPrice = (plan: PublicMembershipPlan): string =>
  `${formatMembershipPrice(plan.price, plan.currency)} / ${intervalLabel(plan.interval)}`;

export interface PlansPanelProps {
  plans: readonly PublicMembershipPlan[];
  signedIn: boolean;
  /** Set after a successful checkout, for the "joined" confirmation. */
  joined?: boolean;
}

/**
 * Plan cards. A signed-in reader picks one and pays on Stripe; a visitor is sent
 * to the join form first. Plain forms, so the page works without JavaScript.
 */
export const PlansPanel = ({ plans, signedIn, joined = false }: PlansPanelProps) => (
  <section className="shop-account__saved" aria-labelledby="membership-plans">
    <h2 className="shop-section-title" id="membership-plans">
      แพ็กเกจสมาชิก
    </h2>
    {joined ? (
      <p className="shop-notice" role="status">
        เปิดการเป็นสมาชิกแล้ว อ่านทุกหน้าที่สงวนไว้สำหรับสมาชิกได้เลย
      </p>
    ) : null}
    {plans.length === 0 ? (
      <p className="shop-payment__hint">เว็บนี้ยังไม่เปิดขายแพ็กเกจสมาชิกในขณะนี้</p>
    ) : (
      <ul className="shop-account__list">
        {plans.map((plan) => (
          <li key={plan.id}>
            <div className="shop-account__order">
              <strong>{plan.name}</strong>
              <span className="shop-payment__hint">{planPrice(plan)}</span>
              {plan.description ? <span className="shop-payment__hint">{plan.description}</span> : null}
              {signedIn ? (
                <form action="/membership/checkout" method="post">
                  <input type="hidden" name="planId" value={plan.id} />
                  <button className="shop-button" type="submit">
                    สมัครแพ็กเกจนี้
                  </button>
                </form>
              ) : (
                <a className="shop-button shop-button--ghost" href="/membership#join">
                  สมัครก่อน แล้วเลือกแพ็กเกจนี้
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export interface JoinPanelProps {
  error?: string | null;
}

export const JoinPanel = ({ error }: JoinPanelProps) => (
  <form className="shop-account__form" id="join" action="/membership/join" method="post">
    <h2 className="shop-section-title">สมัครสมาชิก</h2>
    <MembershipNotice code={error} />
    <div className="shop-fields">
      <label className="shop-field shop-field--wide">
        <span>อีเมล</span>
        <input name="email" type="email" required autoComplete="email" maxLength={200} />
      </label>
      <label className="shop-field shop-field--wide">
        <span>ชื่อที่ให้เรียก (ไม่บังคับ)</span>
        <input name="name" autoComplete="name" maxLength={80} />
      </label>
      <label className="shop-field shop-field--wide">
        <span>รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          maxLength={200}
        />
      </label>
    </div>
    <input
      type="text"
      name="honeypot"
      tabIndex={-1}
      autoComplete="off"
      className="shop-honeypot"
      aria-hidden="true"
    />
    <button className="shop-button shop-button--large" type="submit">
      สมัครสมาชิก
    </button>
  </form>
);

export interface LoginPanelProps {
  error?: string | null;
}

export const LoginPanel = ({ error }: LoginPanelProps) => (
  <form className="shop-account__form" id="login" action="/membership/login" method="post">
    <h2 className="shop-section-title">เข้าสู่ระบบ</h2>
    <MembershipNotice code={error} />
    <div className="shop-fields">
      <label className="shop-field shop-field--wide">
        <span>อีเมล</span>
        <input name="email" type="email" required autoComplete="email" maxLength={200} />
      </label>
      <label className="shop-field shop-field--wide">
        <span>รหัสผ่าน</span>
        <input name="password" type="password" required autoComplete="current-password" maxLength={200} />
      </label>
    </div>
    <button className="shop-button shop-button--large" type="submit">
      เข้าสู่ระบบ
    </button>
    <a className="shop-payment__hint" href="/membership/forgot">
      ลืมรหัสผ่าน?
    </a>
  </form>
);

export interface AccountPanelProps {
  reader: ReaderSession;
}

/** The signed-in reader's own card: address, plan and when it renews. */
export const AccountPanel = ({ reader }: AccountPanelProps) => {
  const subscription = reader.subscription;
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('th-TH', {
        dateStyle: 'long',
      })
    : null;

  return (
    <section className="shop-account__saved" aria-labelledby="membership-account">
      <h2 className="shop-section-title" id="membership-account">
        บัญชีของฉัน
      </h2>
      <p className="shop-payment__hint">{reader.email}</p>
      {subscription ? (
        <p className="shop-payment__hint">
          {subscription.planName ?? 'แพ็กเกจสมาชิก'} ·{' '}
          {subscription.status === 'active'
            ? subscription.cancelAtPeriodEnd
              ? `สิ้นสุดรอบวันที่ ${periodEnd ?? '-'} และจะไม่ต่ออายุ`
              : `ต่ออายุรอบถัดไป ${periodEnd ?? '-'}`
            : 'การเป็นสมาชิกสิ้นสุดแล้ว'}
        </p>
      ) : (
        <p className="shop-payment__hint">ยังไม่ได้สมัครแพ็กเกจสมาชิก</p>
      )}
      {!reader.emailVerified ? (
        <p className="shop-payment__hint">
          ยังไม่ได้ยืนยันอีเมล เปิดลิงก์ในอีเมลที่ส่งให้ตอนสมัครเพื่อยืนยัน
        </p>
      ) : null}
      <form action="/membership/logout" method="post">
        <button className="shop-button shop-button--ghost" type="submit">
          ออกจากระบบ
        </button>
      </form>
    </section>
  );
};

export interface ForgotPanelProps {
  sent?: boolean;
  error?: string | null;
}

export const ForgotPanel = ({ sent = false, error }: ForgotPanelProps) => (
  <form className="shop-account__form" action="/membership/forgot/send" method="post">
    <h2 className="shop-section-title">ลืมรหัสผ่าน</h2>
    {sent ? (
      <p className="shop-notice" role="status">
        ถ้าอีเมลนี้มีบัญชีอยู่ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว
      </p>
    ) : (
      <p className="shop-payment__hint">
        กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ (ใช้ได้ภายใน 1 ชั่วโมง)
      </p>
    )}
    <MembershipNotice code={error} />
    <div className="shop-fields">
      <label className="shop-field shop-field--wide">
        <span>อีเมล</span>
        <input name="email" type="email" required autoComplete="email" maxLength={200} />
      </label>
    </div>
    <button className="shop-button shop-button--large" type="submit">
      ส่งลิงก์ตั้งรหัสผ่านใหม่
    </button>
  </form>
);

export interface ResetPanelProps {
  token: string;
  error?: string | null;
}

export const ResetPanel = ({ token, error }: ResetPanelProps) => (
  <form className="shop-account__form" action="/membership/reset/save" method="post">
    <h2 className="shop-section-title">ตั้งรหัสผ่านใหม่</h2>
    <MembershipNotice code={error} />
    <input type="hidden" name="token" value={token} />
    <div className="shop-fields">
      <label className="shop-field shop-field--wide">
        <span>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          maxLength={200}
        />
      </label>
    </div>
    <button className="shop-button shop-button--large" type="submit">
      บันทึกรหัสผ่านใหม่
    </button>
  </form>
);
