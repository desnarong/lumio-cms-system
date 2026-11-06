import type { PublicMembershipPlan, ReaderSession } from '@lumio/shared';
import { formatMembershipPrice, intervalLabel, intervalLabelEn } from '@lumio/shared';
import {
  storefrontIntlLocale,
  storefrontLocale,
  storefrontT,
  type StorefrontKey,
} from '../lib/messages';

/** Message keys for the `?error=` codes the membership routes redirect with. */
export const MEMBERSHIP_NOTICES: Record<string, StorefrontKey> = {
  'sign-in': 'member.notice.signIn',
  exists: 'member.notice.exists',
  invalid: 'member.notice.invalid',
  unavailable: 'member.notice.unavailable',
  'plan-missing': 'member.notice.planMissing',
  expired: 'member.notice.expired',
};

export const membershipNotice = (
  code: string | null | undefined,
  locale?: string | null,
): string | null =>
  code ? storefrontT(locale)(MEMBERSHIP_NOTICES[code] ?? 'member.notice.invalid') : null;

/** Every panel renders in the request's language; Thai when it is not given. */
export interface LocaleProps {
  locale?: string | null;
}

export interface NoticeProps extends LocaleProps {
  code: string | null | undefined;
}

export const MembershipNotice = ({ code, locale }: NoticeProps) => {
  const notice = membershipNotice(code, locale);
  if (!notice) return null;
  return (
    <p className="shop-notice shop-notice--error" role="alert">
      {notice}
    </p>
  );
};

export const planPrice = (plan: PublicMembershipPlan, locale?: string | null): string => {
  const interval =
    storefrontLocale(locale) === 'en'
      ? intervalLabelEn(plan.interval)
      : intervalLabel(plan.interval);
  return `${formatMembershipPrice(plan.price, plan.currency)} / ${interval}`;
};

export interface PlansPanelProps extends LocaleProps {
  plans: readonly PublicMembershipPlan[];
  signedIn: boolean;
  /** Set after a successful checkout, for the "joined" confirmation. */
  joined?: boolean;
}

/**
 * Plan cards. A signed-in reader picks one and pays on Stripe; a visitor is sent
 * to the join form first. Plain forms, so the page works without JavaScript.
 */
export const PlansPanel = ({ plans, signedIn, joined = false, locale }: PlansPanelProps) => {
  const t = storefrontT(locale);
  return (
    <section className="shop-account__saved" aria-labelledby="membership-plans">
      <h2 className="shop-section-title" id="membership-plans">
        {t('member.plans')}
      </h2>
      {joined ? (
        <p className="shop-notice" role="status">
          {t('member.joined')}
        </p>
      ) : null}
      {plans.length === 0 ? (
        <p className="shop-payment__hint">{t('member.noPlans')}</p>
      ) : (
        <ul className="shop-account__list">
          {plans.map((plan) => (
            <li key={plan.id}>
              <div className="shop-account__order">
                <strong>{plan.name}</strong>
                <span className="shop-payment__hint">{planPrice(plan, locale)}</span>
                {plan.description ? (
                  <span className="shop-payment__hint">{plan.description}</span>
                ) : null}
                {signedIn ? (
                  <form action="/membership/checkout" method="post">
                    <input type="hidden" name="planId" value={plan.id} />
                    <button className="shop-button" type="submit">
                      {t('member.subscribe')}
                    </button>
                  </form>
                ) : (
                  <a className="shop-button shop-button--ghost" href="/membership#join">
                    {t('member.joinFirst')}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export interface JoinPanelProps extends LocaleProps {
  error?: string | null;
}

export const JoinPanel = ({ error, locale }: JoinPanelProps) => {
  const t = storefrontT(locale);
  return (
    <form className="shop-account__form" id="join" action="/membership/join" method="post">
      <h2 className="shop-section-title">{t('member.join')}</h2>
      <MembershipNotice code={error} locale={locale} />
      <div className="shop-fields">
        <label className="shop-field shop-field--wide">
          <span>{t('common.email')}</span>
          <input name="email" type="email" required autoComplete="email" maxLength={200} />
        </label>
        <label className="shop-field shop-field--wide">
          <span>{t('common.optional', { label: t('member.displayName') })}</span>
          <input name="name" autoComplete="name" maxLength={80} />
        </label>
        <label className="shop-field shop-field--wide">
          <span>{t('member.passwordNew')}</span>
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
        {t('member.join')}
      </button>
    </form>
  );
};

export interface LoginPanelProps extends LocaleProps {
  error?: string | null;
}

export const LoginPanel = ({ error, locale }: LoginPanelProps) => {
  const t = storefrontT(locale);
  return (
    <form className="shop-account__form" id="login" action="/membership/login" method="post">
      <h2 className="shop-section-title">{t('member.signIn')}</h2>
      <MembershipNotice code={error} locale={locale} />
      <div className="shop-fields">
        <label className="shop-field shop-field--wide">
          <span>{t('common.email')}</span>
          <input name="email" type="email" required autoComplete="email" maxLength={200} />
        </label>
        <label className="shop-field shop-field--wide">
          <span>{t('member.password')}</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            maxLength={200}
          />
        </label>
      </div>
      <button className="shop-button shop-button--large" type="submit">
        {t('member.signIn')}
      </button>
      <a className="shop-payment__hint" href="/membership/forgot">
        {t('member.forgotLink')}
      </a>
    </form>
  );
};

export interface AccountPanelProps extends LocaleProps {
  reader: ReaderSession;
}

/** The signed-in reader's own card: address, plan and when it renews. */
export const AccountPanel = ({ reader, locale }: AccountPanelProps) => {
  const t = storefrontT(locale);
  const subscription = reader.subscription;
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(storefrontIntlLocale(locale), {
        dateStyle: 'long',
      })
    : '-';

  return (
    <section className="shop-account__saved" aria-labelledby="membership-account">
      <h2 className="shop-section-title" id="membership-account">
        {t('member.account')}
      </h2>
      <p className="shop-payment__hint">{reader.email}</p>
      {subscription ? (
        <p className="shop-payment__hint">
          {subscription.planName ?? t('member.plans')} ·{' '}
          {subscription.status === 'active'
            ? subscription.cancelAtPeriodEnd
              ? t('member.endsOn', { date: periodEnd })
              : t('member.renewsOn', { date: periodEnd })
            : t('member.ended')}
        </p>
      ) : (
        <p className="shop-payment__hint">{t('member.noSubscription')}</p>
      )}
      {!reader.emailVerified ? (
        <p className="shop-payment__hint">{t('member.unverified')}</p>
      ) : null}
      <form action="/membership/logout" method="post">
        <button className="shop-button shop-button--ghost" type="submit">
          {t('member.signOut')}
        </button>
      </form>
    </section>
  );
};

export interface ForgotPanelProps extends LocaleProps {
  sent?: boolean;
  error?: string | null;
}

export const ForgotPanel = ({ sent = false, error, locale }: ForgotPanelProps) => {
  const t = storefrontT(locale);
  return (
    <form className="shop-account__form" action="/membership/forgot/send" method="post">
      <h2 className="shop-section-title">{t('member.forgot')}</h2>
      {sent ? (
        <p className="shop-notice" role="status">
          {t('member.forgotSent')}
        </p>
      ) : (
        <p className="shop-payment__hint">{t('member.forgotHint')}</p>
      )}
      <MembershipNotice code={error} locale={locale} />
      <div className="shop-fields">
        <label className="shop-field shop-field--wide">
          <span>{t('common.email')}</span>
          <input name="email" type="email" required autoComplete="email" maxLength={200} />
        </label>
      </div>
      <button className="shop-button shop-button--large" type="submit">
        {t('member.forgotSubmit')}
      </button>
    </form>
  );
};

export interface ResetPanelProps extends LocaleProps {
  token: string;
  error?: string | null;
}

export const ResetPanel = ({ token, error, locale }: ResetPanelProps) => {
  const t = storefrontT(locale);
  return (
    <form className="shop-account__form" action="/membership/reset/save" method="post">
      <h2 className="shop-section-title">{t('member.reset')}</h2>
      <MembershipNotice code={error} locale={locale} />
      <input type="hidden" name="token" value={token} />
      <div className="shop-fields">
        <label className="shop-field shop-field--wide">
          <span>{t('member.passwordReset')}</span>
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
        {t('member.resetSubmit')}
      </button>
    </form>
  );
};
