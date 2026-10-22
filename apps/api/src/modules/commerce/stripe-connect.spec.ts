import { describe, expect, it, vi } from 'vitest';
import {
  createConnectAccount,
  createConnectAccountLink,
  createConnectTransfer,
  fetchConnectAccount,
  sellerShare,
} from './stripe-connect';

const jsonResponse = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), { status });

describe('Stripe Connect account', () => {
  it('creates an Express account that can receive transfers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: 'acct_1' }));
    const id = await createConnectAccount(
      fetchImpl as unknown as typeof fetch,
      { siteId: 'site-1', email: 'seller@example.com' },
      'sk_test',
    );

    expect(id).toBe('acct_1');
    const body = fetchImpl.mock.calls[0]![1].body as URLSearchParams;
    expect(body.get('type')).toBe('express');
    expect(body.get('country')).toBe('TH');
    expect(body.get('email')).toBe('seller@example.com');
    expect(body.get('capabilities[transfers][requested]')).toBe('true');
    expect(body.get('metadata[siteId]')).toBe('site-1');
  });

  it('returns the onboarding link for an existing account', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ url: 'https://connect.stripe.com/x' }));
    const url = await createConnectAccountLink(
      fetchImpl as unknown as typeof fetch,
      { accountId: 'acct_1', refreshUrl: 'https://admin/refresh', returnUrl: 'https://admin/return' },
      'sk_test',
    );

    expect(url).toBe('https://connect.stripe.com/x');
    const body = fetchImpl.mock.calls[0]![1].body as URLSearchParams;
    expect(body.get('account')).toBe('acct_1');
    expect(body.get('type')).toBe('account_onboarding');
  });

  it('reads charges and payouts state, refusing an incomplete answer', async () => {
    const ok = vi.fn().mockResolvedValue(
      jsonResponse({ id: 'acct_1', charges_enabled: true, payouts_enabled: false }),
    );
    await expect(
      fetchConnectAccount(ok as unknown as typeof fetch, 'acct_1', 'sk_test'),
    ).resolves.toEqual({ id: 'acct_1', chargesEnabled: true, payoutsEnabled: false });

    const incomplete = vi.fn().mockResolvedValue(jsonResponse({ charges_enabled: true }));
    await expect(
      fetchConnectAccount(incomplete as unknown as typeof fetch, 'acct_1', 'sk_test'),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});

describe('seller transfer', () => {
  it('transfers the seller share and keeps the order number as the group', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: 'tr_1' }));
    const id = await createConnectTransfer(
      fetchImpl as unknown as typeof fetch,
      { accountId: 'acct_1', amount: 95_000, orderNumber: 'LM-261022-AB12' },
      'sk_test',
    );

    expect(id).toBe('tr_1');
    const body = fetchImpl.mock.calls[0]![1].body as URLSearchParams;
    expect(body.get('amount')).toBe('95000');
    expect(body.get('currency')).toBe('thb');
    expect(body.get('destination')).toBe('acct_1');
    expect(body.get('transfer_group')).toBe('LM-261022-AB12');
  });

  it('removes the platform commission and refuses a zero transfer', async () => {
    expect(sellerShare(100_000, 5)).toBe(95_000);
    expect(sellerShare(100_000, 0)).toBe(100_000);

    await expect(
      createConnectTransfer(vi.fn() as unknown as typeof fetch, {
        accountId: 'acct_1',
        amount: 0,
        orderNumber: 'LM-1',
      }, 'sk_test'),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('reports a Stripe failure as a conflict instead of throwing raw', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'no funds' } }, 400));
    await expect(
      createConnectTransfer(fetchImpl as unknown as typeof fetch, {
        accountId: 'acct_1',
        amount: 1_000,
        orderNumber: 'LM-1',
      }, 'sk_test'),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});
