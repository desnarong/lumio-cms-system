import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { formatBaht } from '@lumio/shared';
import { money, shippingFee, storefrontT, type StorefrontKey } from '../../../lib/messages';
import { ShopShell } from '../../../components/ShopShell';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { loadOrderOrNull } from '../../../lib/shop';
import { apiBaseUrl } from '../../../lib/site-locales';
import { literalColors } from '@lumio/tokens';

export async function generateMetadata(): Promise<Metadata> {
  const t = storefrontT(await requestLocale());
  return { title: t('order.metaTitle'), robots: { index: false, follow: false } };
}

const STATUS_LABEL: Record<string, StorefrontKey> = {
  pending: 'order.status.pending',
  paid: 'order.status.paid',
  shipped: 'order.status.shipped',
  completed: 'order.status.completed',
  cancelled: 'order.status.cancelled',
  refunded: 'order.status.refunded',
};

const formatDateTime = (iso: string): string => {
  const [date, time] = iso.split('T');
  const [year, month, day] = (date ?? '').split('-');
  return year && month && day ? `${day}/${month}/${year} ${(time ?? '').slice(0, 5)}` : '';
};

export interface OrderPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ slip?: string }>;
}

const SLIP_NOTICE: Record<string, StorefrontKey> = {
  verified: 'order.slip.verified',
  review: 'order.slip.review',
  error: 'order.slip.error',
  'too-large': 'order.slip.tooLarge',
  type: 'order.slip.type',
};

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const t = storefrontT(locale);
  const { token } = await params;
  const { slip: slipNotice } = await searchParams;
  const slipKey = slipNotice ? SLIP_NOTICE[slipNotice] : undefined;
  const found = await loadOrderOrNull(host, token, locale);
  if (!found) notFound();

  const { order, payment } = found;
  const statusKey = STATUS_LABEL[order.status];
  const apiBase = apiBaseUrl();
  const receiptBase = apiBase
    ? `${apiBase}/api/v1/public/${encodeURIComponent(host)}/shop/orders/${encodeURIComponent(order.token)}`
    : null;
  const slipRejected = order.slip?.status === 'rejected';
  const canUploadSlip =
    order.status === 'pending' &&
    order.paymentMethod === 'promptpay' &&
    (!order.slip || slipRejected);
  const qr =
    payment.promptPayPayload && order.status === 'pending'
      ? await QRCode.toString(payment.promptPayPayload, {
          type: 'svg',
          margin: 1,
          width: 240,
          color: { dark: literalColors.qrDark, light: literalColors.qrLight },
        }).catch(() => null)
      : null;

  return (
    <ShopShell chrome={found} locale={locale} path={`/order/${order.token}`}>
      <header className="shop-hero">
        <h1 className="shop-hero__title">{t('order.title', { number: order.number })}</h1>
        <p className="shop-hero__subtitle">
          {statusKey ? t(statusKey) : order.status} ·{' '}
          {t('order.placedAt', { date: formatDateTime(order.createdAt) })}
        </p>
      </header>

      {order.status === 'refunded' ? (
        <p className="shop-notice">
          {t('order.refunded', { amount: formatBaht(order.refundedAmount) })}
          {order.refundReason ? ` — ${order.refundReason}` : ''}
          <br />
          {t('order.refundDelay')}
        </p>
      ) : null}

      {slipKey ? <p className="shop-notice">{t(slipKey)}</p> : null}

      {order.status === 'pending' && qr ? (
        <section className="shop-payment" aria-labelledby="payment-heading">
          <h2 className="shop-section-title" id="payment-heading">
            {t('order.promptpay.title')}
          </h2>
          <div className="shop-payment__qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="shop-payment__amount">
            {t('order.amountDue', { amount: formatBaht(order.total) })}
          </p>
          <p className="shop-payment__hint">{t('order.promptpay.hint')}</p>
          {payment.promptPayId ? (
            <p className="shop-payment__id">
              {t('order.promptpay.id', { id: payment.promptPayId })}
            </p>
          ) : null}
        </section>
      ) : order.status === 'pending' && order.paymentUrl ? (
        <section className="shop-payment">
          <h2 className="shop-section-title">
            {order.paymentMethod === 'bbl' ? t('order.bbl.title') : t('order.card.title')}
          </h2>
          <p className="shop-payment__hint">
            {order.paymentMethod === 'bbl' ? t('order.bbl.hint') : t('order.card.hint')}
          </p>
          <a className="shop-button" href={order.paymentUrl}>
            {t('order.openPayment')}
          </a>
        </section>
      ) : order.status === 'pending' ? (
        <p className="shop-notice">{t('order.contactLater')}</p>
      ) : null}

      {order.slip && order.slip.status !== 'rejected' ? (
        <p className="shop-notice">
          {order.slip.status === 'verified' ? t('order.slipVerified') : t('order.slipPending')}{' '}
          {t('order.slipReference', { reference: order.slip.reference })}
        </p>
      ) : null}

      {canUploadSlip ? (
        <section className="shop-payment" aria-labelledby="slip-heading">
          <h2 className="shop-section-title" id="slip-heading">
            {t('order.slipUpload.title')}
          </h2>
          <p className="shop-payment__hint">{t('order.slipUpload.hint')}</p>
          <form
            className="shop-slip"
            action={`/order/${order.token}/slip`}
            method="post"
            encType="multipart/form-data"
          >
            <label className="shop-field">
              <span>{t('order.slipUpload.amount')}</span>
              <input
                name="amount"
                required
                inputMode="decimal"
                defaultValue={(order.total / 100).toFixed(2)}
              />
            </label>
            <label className="shop-field">
              <span>{t('order.slipUpload.reference')}</span>
              <input name="reference" required minLength={4} maxLength={60} />
            </label>
            <label className="shop-field">
              <span>{t('order.slipUpload.file')}</span>
              <input name="slip" type="file" accept="image/jpeg,image/png,image/webp" required />
            </label>
            <button className="shop-button" type="submit">
              {t('order.slipUpload.submit')}
            </button>
          </form>
        </section>
      ) : null}

      <div className="shop-order">
        <section className="shop-order__card">
          <h2 className="shop-section-title">{t('order.items')}</h2>
          <ul className="shop-order__items">
            {order.items.map((item, index) => (
              <li key={`${item.productId ?? item.title}-${item.variantId ?? index}`}>
                <span>
                  {item.title}
                  {item.variantLabel ? ` (${item.variantLabel})` : ''} × {item.quantity}
                </span>
                <span>{money(t, item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="shop-summary__list">
            <div>
              <dt>{t('common.subtotal')}</dt>
              <dd>{money(t, order.subtotal)}</dd>
            </div>
            <div>
              <dt>{t('common.shipping')}</dt>
              <dd>{shippingFee(t, order.shippingFee)}</dd>
            </div>
            <div className="shop-summary__grand">
              <dt>{t('common.total')}</dt>
              <dd>{money(t, order.total)}</dd>
            </div>
          </dl>
          {receiptBase && ['paid', 'shipped', 'completed'].includes(order.status) ? (
            <div className="shop-order__receipt">
              <a
                className="shop-button shop-button--ghost"
                href={`${receiptBase}/receipt`}
                target="_blank"
                rel="noreferrer"
              >
                {t('order.receipt')}
              </a>
              <a className="shop-link-button" href={`${receiptBase}/receipt.pdf`}>
                {t('order.receiptPdf')}
              </a>
            </div>
          ) : null}
        </section>

        <section className="shop-order__card">
          <h2 className="shop-section-title">{t('order.shipping')}</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          {order.trackingNumber ? (
            <p>{t('order.tracking', { number: order.trackingNumber })}</p>
          ) : null}
          <p className="shop-payment__hint">{t('order.keepPrivate')}</p>
        </section>
      </div>
    </ShopShell>
  );
}
