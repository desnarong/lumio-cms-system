import {
  BILLING_CURRENCY,
  findPlan,
  planFeatures,
  PLAN_DEFINITIONS,
  planLabel,
  type BillingSubscription,
  type BillingSummary,
  type CheckoutInput,
  type CheckoutSession,
  type Invoice,
  type Plan,
} from '@lumio/shared';
import { translateNow, uiLocaleNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';
import { readAdminLocale } from '../shell/locale-preference.js';

/** Plan, usage and invoices (docs/design/05-admin-ia.md "ตั้งค่า › แพ็กเกจ & การชำระเงิน"). */
export interface BillingApi {
  getSummary(): Promise<BillingSummary>;
  changePlan(plan: Plan): Promise<BillingSummary>;
  /** Opens a Stripe Checkout (card or PromptPay) for a paid plan. */
  checkout(input: CheckoutInput): Promise<CheckoutSession>;
  /** Stops the next renewal; the paid period stays. */
  cancelSubscription(): Promise<BillingSummary>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpBillingApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

/** Talks to `/api/v1/billing` (owner only). */
export const createHttpBillingApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpBillingApiConfig): BillingApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = getAccessToken?.() ?? null;
    const siteId = getSiteId?.() ?? null;

    const response = await doFetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(siteId ? { 'x-site-id': siteId } : {}),
        'x-locale': readAdminLocale(),
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as Envelope<T> | ErrorEnvelope | null;

    if (!response.ok) {
      const error = payload as ErrorEnvelope | null;
      throw new ApiError(
        error?.error ?? 'internal_error',
        error?.message ?? translateNow('api.networkError'),
        response.status,
      );
    }

    return (payload as Envelope<T>).data;
  };

  return {
    getSummary: () => request<BillingSummary>('/billing'),
    changePlan: (plan) =>
      request<BillingSummary>('/billing/plan', { method: 'PATCH', body: JSON.stringify({ plan }) }),
    checkout: (input) =>
      request<CheckoutSession>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    cancelSubscription: () =>
      request<BillingSummary>('/billing/cancel', { method: 'POST', body: '{}' }),
  };
};

const demoInvoice = (
  plan: string,
  status: Invoice['status'],
  monthsAgo: number,
  method: Invoice['method'] = null,
): Invoice => {
  const issued = new Date();
  issued.setMonth(issued.getMonth() - monthsAgo);
  const periodEnd = new Date(issued);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  return {
    id: `demo-invoice-${plan}-${monthsAgo}`,
    plan,
    planLabel: planLabel(plan),
    amount: findPlan(plan).price ?? 0,
    currency: BILLING_CURRENCY,
    status,
    periodStart: issued.toISOString(),
    periodEnd: periodEnd.toISOString(),
    issuedAt: issued.toISOString(),
    paidAt: status === 'paid' ? issued.toISOString() : null,
    method,
    credit: 0,
  };
};

/** In-memory billing so the screen works before the API is up. */
export const createDemoBillingApi = (): BillingApi => {
  let plan: Plan = 'pro';
  let invoices: Invoice[] = [demoInvoice('pro', 'paid', 1, 'card')];
  const renewsAt = (): string => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next.toISOString();
  };
  let subscription: BillingSubscription | null = {
    renewsAt: renewsAt(),
    cancelAtPeriodEnd: false,
    method: 'card',
  };

  const summary = (): BillingSummary => {
    const locale = uiLocaleNow();
    const definition = findPlan(plan);
    return {
      plan,
      planLabel: planLabel(plan, locale),
      price: definition.price,
      currency: BILLING_CURRENCY,
      quota: definition.quota,
      usage: { pages: 8, mediaBytes: 420 * 1024 * 1024, team: 3 },
      plans: PLAN_DEFINITIONS.map((entry) => ({
        id: entry.id,
        label: planLabel(entry.id, locale),
        price: entry.price,
        currency: BILLING_CURRENCY,
        quota: entry.quota,
        features: planFeatures(entry.id, locale),
        current: entry.id === plan,
        credit: 0,
        payable: entry.price,
      })),
      invoices: invoices.map((invoice) => ({
        ...invoice,
        planLabel: planLabel(invoice.plan, locale),
      })),
      subscription: plan === 'free' ? null : subscription,
    };
  };

  return {
    getSummary: async () => summary(),
    changePlan: async (next) => {
      const definition = findPlan(next);
      if (definition.price === null) {
        throw new ApiError('conflict', translateNow('billing.salesOnly'), 409);
      }
      if (definition.price > 0) {
        throw new ApiError('conflict', translateNow('billing.payFirst'), 409);
      }
      if (next === plan) {
        throw new ApiError('conflict', translateNow('billing.alreadyOn'), 409);
      }
      plan = next;
      subscription = null;
      return summary();
    },

    /** Demo payments succeed instantly; the panel detects the in-page URL. */
    checkout: async ({ plan: next, method }): Promise<CheckoutSession> => {
      const definition = findPlan(next);
      if (definition.price === null) {
        throw new ApiError('conflict', translateNow('billing.salesOnly'), 409);
      }
      if (definition.price === 0) {
        throw new ApiError('conflict', translateNow('billing.freeNoPayment'), 409);
      }
      if (next === plan) {
        throw new ApiError('conflict', translateNow('billing.alreadyOn'), 409);
      }
      plan = next;
      // Cards renew automatically; PromptPay is a one-time payment.
      subscription =
        method === 'card'
          ? { renewsAt: renewsAt(), cancelAtPeriodEnd: false, method: 'card' }
          : null;
      invoices = [demoInvoice(next, 'paid', 0, method), ...invoices];
      return {
        url: '#demo-checkout',
        sessionId: 'demo-' + Date.now().toString(36),
        invoiceId: invoices[0]?.id ?? 'demo-invoice',
        method,
        paid: false,
      };
    },

    cancelSubscription: async (): Promise<BillingSummary> => {
      if (!subscription) {
        throw new ApiError('conflict', translateNow('billing.noAutoRenew'), 409);
      }
      subscription = { ...subscription, cancelAtPeriodEnd: true };
      return summary();
    },
  };
};
