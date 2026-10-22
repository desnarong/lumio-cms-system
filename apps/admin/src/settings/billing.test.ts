import { describe, expect, it } from 'vitest';
import { ApiError } from '../api-error.js';
import { createDemoBillingApi } from './billing.js';

describe('createDemoBillingApi', () => {
  it('starts on the pro plan with one paid invoice', async () => {
    const summary = await createDemoBillingApi().getSummary();
    expect(summary.plan).toBe('pro');
    expect(summary.plans.find((plan) => plan.current)?.id).toBe('pro');
    expect(summary.invoices[0]?.status).toBe('paid');
  });

  it('moves to the free plan without charging anything', async () => {
    const api = createDemoBillingApi();

    const summary = await api.changePlan('free');

    expect(summary.plan).toBe('free');
    expect(summary.invoices[0]?.plan).toBe('pro');
  });

  it('takes a payment for a paid plan through the checkout', async () => {
    const api = createDemoBillingApi();

    const session = await api.checkout({ plan: 'starter', method: 'promptpay' });
    const summary = await api.getSummary();

    expect(session).toMatchObject({ method: 'promptpay' });
    expect(session.url.startsWith('#')).toBe(true);
    expect(summary.plan).toBe('starter');
    expect(summary.invoices[0]).toMatchObject({
      plan: 'starter',
      amount: 199,
      status: 'paid',
      method: 'promptpay',
    });
  });

  it('refuses a paid plan change without payment', async () => {
    const api = createDemoBillingApi();
    await expect(api.changePlan('starter')).rejects.toBeInstanceOf(ApiError);
  });

  it('keeps renewing card payments and stops when asked', async () => {
    const api = createDemoBillingApi();
    await api.checkout({ plan: 'starter', method: 'card' });

    const before = await api.getSummary();
    expect(before.subscription).toMatchObject({ cancelAtPeriodEnd: false, method: 'card' });

    const after = await api.cancelSubscription();
    expect(after.subscription).toMatchObject({ cancelAtPeriodEnd: true });
  });

  it('treats PromptPay as a one-time payment with nothing to renew', async () => {
    const api = createDemoBillingApi();
    await api.checkout({ plan: 'starter', method: 'promptpay' });

    const summary = await api.getSummary();
    expect(summary.subscription).toBeNull();
    await expect(api.cancelSubscription()).rejects.toBeInstanceOf(ApiError);
  });

  it('refuses the agency plan and the plan already in use', async () => {
    const api = createDemoBillingApi();
    await expect(api.changePlan('agency')).rejects.toBeInstanceOf(ApiError);
    await expect(api.changePlan('pro')).rejects.toBeInstanceOf(ApiError);
  });
});