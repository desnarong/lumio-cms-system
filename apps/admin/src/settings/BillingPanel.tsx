import { useCallback, useEffect, useState } from 'react';
import {
  formatBytes,
  formatPlanPrice,
  paymentMethodLabel,
  quotaUsedPercent,
  type BillingSummary,
  type InvoiceStatus,
  type Plan,
} from '@lumio/shared';
import {
  Icon,
  Banner,
  Button,
  Card,
  EmptyState,
  Modal,
  Progress,
  Skeleton,
  uiLocaleNow,
  useT,
  useToast,
  type MessageKey,
} from '@lumio/ui';
import type { BillingApi } from './billing.js';
import { messageOf } from './SettingsPage.js';

const INVOICE_STATUS_KEYS: Record<InvoiceStatus, MessageKey> = {
  paid: 'invoice.paid',
  pending: 'invoice.pending',
  void: 'invoice.void',
};

/** A usage bar, or a plain figure when the plan does not cap this resource. */
const UsageRow = ({
  label,
  used,
  limit,
  format,
}: {
  label: string;
  used: number;
  limit: number | null;
  format: (value: number) => string;
}) => {
  const t = useT();

  return (
    <div className="billing-usage__row">
      <div className="billing-usage__head">
        <span className="billing-usage__label">{label}</span>
        <span className="billing-usage__value">
          {format(used)}
          {limit === null ? ` · ${t('billing.unlimited')}` : ` / ${format(limit)}`}
        </span>
      </div>
      {limit === null ? null : <Progress value={quotaUsedPercent(used, limit)} label={label} />}
    </div>
  );
};

export interface BillingViewProps {
  summary: BillingSummary;
  busy: boolean;
  error: string | null;
  onChangePlan: (plan: Plan) => void;
  /** Stops the next renewal of a card subscription. */
  onCancelSubscription?: () => void;
}

/**
 * "แพ็กเกจ & การชำระเงิน" (docs/design/05-admin-ia.md 5.1, 18-deployment.md
 * 18.6-18.7). Shows the current plan, how much of each quota is used, the plans
 * to switch to, and the invoice history.
 */
export const BillingView = ({
  summary,
  busy,
  error,
  onChangePlan,
  onCancelSubscription,
}: BillingViewProps) => {
  const t = useT();

  return (
    <div className="settings-panel">
      {error ? (
        <p className="settings-error" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="settings-card">
        <div className="billing-current">
          <div className="billing-current__main">
            <span className="billing-current__icon" aria-hidden="true">
              <Icon name="sparkles" size={22} />
            </span>
            <div>
              <h2 className="settings-card__title">{t('billing.currentPlan')}</h2>
              <p className="billing-current__plan">{summary.planLabel}</p>
              <p className="billing-current__price">{formatPlanPrice(summary.price)}</p>
              {summary.subscription ? (
                <p className="billing-current__renew">
                  {summary.subscription.cancelAtPeriodEnd
                    ? t('billing.renewalEnds', {
                        date: summary.subscription.renewsAt?.slice(0, 10) ?? '',
                      })
                    : t('billing.renewsOn', {
                        date: summary.subscription.renewsAt?.slice(0, 10) ?? '',
                      })}
                </p>
              ) : null}
            </div>
          </div>
          {summary.subscription &&
          !summary.subscription.cancelAtPeriodEnd &&
          onCancelSubscription ? (
            <Button variant="ghost" size="sm" disabled={busy} onClick={onCancelSubscription}>
              {t('billing.cancelRenewal')}
            </Button>
          ) : null}
        </div>

        <div className="billing-usage">
          <UsageRow
            label={t('billing.usagePages')}
            used={summary.usage.pages}
            limit={summary.quota.pages}
            format={String}
          />
          <UsageRow
            label={t('billing.usageMedia')}
            used={summary.usage.mediaBytes}
            limit={summary.quota.mediaBytes}
            format={formatBytes}
          />
          <UsageRow
            label={t('billing.usageTeam')}
            used={summary.usage.team}
            limit={summary.quota.team}
            format={String}
          />
          <UsageRow
            label={t('billing.usageAi')}
            used={0}
            limit={summary.quota.aiPerMonth}
            format={String}
          />
        </div>
      </Card>

      <div className="billing-plans">
        {summary.plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.current ? 'billing-plan billing-plan--current' : 'billing-plan'}
          >
            <div className="billing-plan__head">
              <h3 className="billing-plan__name">{plan.label}</h3>
              <p className="billing-plan__price">{formatPlanPrice(plan.price)}</p>
            </div>
            <ul className="billing-plan__features">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Icon name="check" size={14} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {plan.credit > 0 && plan.payable !== null ? (
              <p className="billing-plan__credit">
                {t('billing.creditOff', { amount: plan.credit.toLocaleString('th-TH') })}
                {' · '}
                {t('billing.payable', { amount: plan.payable.toLocaleString('th-TH') })}
              </p>
            ) : null}
            <div className="billing-plan__footer">
              {plan.current ? (
                <p className="billing-plan__current">
                  <Icon name="check" size={14} />
                  <span>{t('billing.current')}</span>
                </p>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || plan.price === null}
                  onClick={() => onChangePlan(plan.id)}
                >
                  {plan.price === null ? t('billing.contactSales') : t('billing.choose')}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('billing.history')}</h2>
        {summary.invoices.length === 0 ? (
          <EmptyState
            illustration={<Icon name="credit-card" size={32} />}
            title={t('billing.noInvoices')}
            description={t('billing.noInvoicesHint')}
          />
        ) : (
          <ul className="settings-list">
            {summary.invoices.map((invoice) => (
              <li key={invoice.id} className="settings-row">
                <div className="settings-row__main">
                  <span className="settings-row__title">
                    {invoice.planLabel} · {invoice.currency}{' '}
                    {invoice.amount.toLocaleString('th-TH')}
                  </span>
                  <span className="settings-row__meta">
                    {invoice.periodStart.slice(0, 10)} – {invoice.periodEnd.slice(0, 10)}
                    {invoice.method
                      ? ` · ${paymentMethodLabel(invoice.method, uiLocaleNow())}`
                      : ''}
                    {invoice.credit > 0
                      ? ` · ${t('billing.invoiceCredit', {
                          amount: invoice.credit.toLocaleString('th-TH'),
                        })}`
                      : ''}
                  </span>
                </div>
                <span className="billing-invoice__status">
                  {t(INVOICE_STATUS_KEYS[invoice.status])}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export interface BillingPanelProps {
  api: BillingApi;
}

export const BillingPanel = ({ api }: BillingPanelProps) => {
  const t = useT();
  const toast = useToast();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The paid plan the owner is about to pay for, so the method can be chosen. */
  const [payingPlan, setPayingPlan] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.getSummary());
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Free plans switch right away; paid plans ask how to pay first. */
  const choosePlan = (plan: Plan): void => {
    const option = summary?.plans.find((entry) => entry.id === plan);
    if (option && option.price !== null && option.price > 0) {
      setPayingPlan(plan);
      return;
    }
    void changePlan(plan);
  };

  const changePlan = async (plan: Plan): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.changePlan(plan);
      setSummary(updated);
      toast.push({
        tone: 'success',
        title: t('billing.changed', { plan: updated.planLabel }),
      });
    } catch (changeError) {
      setError(messageOf(changeError));
    } finally {
      setBusy(false);
    }
  };

  const cancelRenewal = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setSummary(await api.cancelSubscription());
      toast.push({ tone: 'success', title: t('billing.renewalCancelled') });
    } catch (cancelError) {
      setError(messageOf(cancelError));
    } finally {
      setBusy(false);
    }
  };

  const pay = async (method: 'card' | 'promptpay'): Promise<void> => {
    if (!payingPlan) return;
    setBusy(true);
    setError(null);
    try {
      const session = await api.checkout({ plan: payingPlan, method });
      setPayingPlan(null);
      // Unused time on the old plan covered the switch, so the API changed the
      // plan without opening a payment page.
      if (session.paid) {
        await load();
        toast.push({ tone: 'success', title: t('billing.prorationCovered') });
        return;
      }
      // Demo mode answers with an in-page URL instead of a real Stripe page.
      if (session.url.startsWith('#')) {
        await load();
        toast.push({ tone: 'success', title: t('billing.demoPaid') });
        return;
      }
      window.location.assign(session.url);
    } catch (payError) {
      setError(messageOf(payError));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !summary) return <Skeleton shape="block" height={280} />;
  if (!summary) {
    return (
      <EmptyState
        tone="error"
        title={t('billing.loadError')}
        description={error ?? t('common.genericError')}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            {t('growth.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <>
      {error ? <Banner tone="warning">{error}</Banner> : null}
      <BillingView
        summary={summary}
        busy={busy}
        error={null}
        onChangePlan={choosePlan}
        onCancelSubscription={() => void cancelRenewal()}
      />

      <Modal
        open={payingPlan !== null}
        size="sm"
        title={t('billing.payTitle', {
          plan: payingPlan ? planLabelOf(summary, payingPlan) : '',
        })}
        description={t('billing.payHint')}
        onClose={() => setPayingPlan(null)}
      >
        <div className="billing-pay">
          {(() => {
            const option = summary.plans.find((entry) => entry.id === payingPlan);
            if (!option || option.credit <= 0 || option.payable === null) return null;
            return (
              <p className="settings-row__meta">
                {t('billing.creditOff', { amount: option.credit.toLocaleString('th-TH') })}
                {' · '}
                {t('billing.payable', { amount: option.payable.toLocaleString('th-TH') })}
              </p>
            );
          })()}
          <Button disabled={busy} onClick={() => void pay('card')}>
            {t('billing.payCard')}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void pay('promptpay')}>
            {t('billing.payPromptpay')}
          </Button>
          <p className="settings-row__meta">{t('billing.paySecure')}</p>
          {summary.subscription ? (
            <p className="settings-row__meta">{t('billing.prorationNote')}</p>
          ) : null}
        </div>
      </Modal>
    </>
  );
};

const planLabelOf = (summary: BillingSummary | null, plan: Plan): string =>
  summary?.plans.find((entry) => entry.id === plan)?.label ?? plan;
