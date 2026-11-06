import type { PublicMembershipPlan } from '@lumio/shared';
import { formatMembershipPrice, intervalLabel, intervalLabelEn } from '@lumio/shared';
import { storefrontLocale, storefrontT } from '../lib/messages';

export interface PaywallNoticeProps {
  plans: readonly PublicMembershipPlan[];
  /** Already signed in: the call to action is joining, not signing in. */
  signedIn: boolean;
  /** Request language; Thai when not given. */
  locale?: string | null;
}

/**
 * What a visitor sees instead of the body of a members-only page. The teaser
 * (title and summary) still renders above it, so search engines and readers see
 * what the page is about without ever receiving the locked content.
 */
export const PaywallNotice = ({ plans, signedIn, locale }: PaywallNoticeProps) => {
  const t = storefrontT(locale);
  const interval = storefrontLocale(locale) === 'en' ? intervalLabelEn : intervalLabel;
  return (
    <section className="paywall" aria-labelledby="paywall-title">
      <p className="paywall__badge">{t('paywall.badge')}</p>
      <h2 className="paywall__title" id="paywall-title">
        {t('paywall.title')}
      </h2>
      <p className="paywall__text">{t('paywall.body')}</p>

      {plans.length > 0 ? (
        <ul className="paywall__plans">
          {plans.map((plan) => (
            <li className="paywall__plan" key={plan.id}>
              <span className="paywall__plan-name">{plan.name}</span>
              <span className="paywall__plan-price">
                {formatMembershipPrice(plan.price, plan.currency)}
                <span className="paywall__plan-interval"> / {interval(plan.interval)}</span>
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
          {signedIn ? t('paywall.choosePlan') : t('paywall.joinOrSignIn')}
        </a>
        <a className="paywall__hint" href="/membership#login">
          {t('paywall.haveAccount')}
        </a>
      </div>
    </section>
  );
};
