import { savedOrderDate, type SavedOrder } from '../lib/customer';
import { storefrontT, type StorefrontKey } from '../lib/messages';

/** Message keys for the `?error=` codes the lookup route redirects with. */
export const SIGN_IN_NOTICES: Record<string, StorefrontKey> = {
  'not-found': 'signin.notice.notFound',
  invalid: 'signin.notice.invalid',
  unavailable: 'member.notice.unavailable',
};

export interface SignInPanelProps {
  /** Orders this device already opened; empty for a first visit. */
  saved: SavedOrder[];
  /** `?error=` code from the lookup route. */
  error?: string | null;
  /** Request language; Thai when not given. */
  locale?: string | null;
}

/**
 * The storefront account screen. There are no customer passwords yet, so a
 * visitor proves ownership of an order with the number from the receipt plus
 * the phone or email used at checkout (docs/design/11-data-model.md 11.3).
 * Plain HTML forms only, so it works with JavaScript turned off.
 */
export const SignInPanel = ({ saved, error, locale }: SignInPanelProps) => {
  const t = storefrontT(locale);
  const notice = error ? t(SIGN_IN_NOTICES[error] ?? 'signin.notice.notFound') : null;

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
            {t('signin.saved')}
          </h2>
          <ul className="shop-account__list">
            {saved.map((order) => (
              <li key={order.token}>
                <a
                  className="shop-account__order"
                  href={`/order/${encodeURIComponent(order.token)}`}
                >
                  <strong>{order.number}</strong>
                  <span className="shop-payment__hint">{savedOrderDate(order.createdAt)}</span>
                </a>
              </li>
            ))}
          </ul>
          <form action="/signin/signout" method="post">
            <button className="shop-button shop-button--ghost" type="submit">
              {t('member.signOut')}
            </button>
          </form>
        </section>
      ) : null}

      <form className="shop-account__form" action="/signin/lookup" method="post">
        <h2 className="shop-section-title">{t('signin.withOrder')}</h2>
        <p className="shop-payment__hint">{t('signin.withOrderHint')}</p>
        <div className="shop-fields">
          <label className="shop-field shop-field--wide">
            <span>{t('signin.orderNumber')}</span>
            <input
              name="number"
              required
              autoComplete="off"
              placeholder="LM-261022-7K4Q"
              maxLength={40}
            />
          </label>
          <label className="shop-field shop-field--wide">
            <span>{t('signin.contact')}</span>
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
          {t('member.signIn')}
        </button>
      </form>
    </div>
  );
};
