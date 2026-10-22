import { describe, expect, it, vi } from 'vitest';
import {
  buildStripeRefundBody,
  isStripePaymentIntent,
  refundStripePayment,
} from './stripe-refund';

describe('buildStripeRefundBody', () => {
  it('refers to the payment intent, the amount and the order number', () => {
    const body = buildStripeRefundBody({
      paymentIntent: 'pi_123',
      amount: 40_000,
      orderNumber: 'LM-261022-CD34',
    });

    expect(body.get('payment_intent')).toBe('pi_123');
    expect(body.get('amount')).toBe('40000');
    expect(body.get('metadata[orderNumber]')).toBe('LM-261022-CD34');
  });
});

describe('isStripePaymentIntent', () => {
  it('accepts the reference the webhook stores for a card charge', () => {
    expect(isStripePaymentIntent('pi_abc')).toBe(true);
    expect(isStripePaymentIntent('cs_test_abc')).toBe(false);
    expect(isStripePaymentIntent(null)).toBe(false);
  });
});

describe('refundStripePayment', () => {
  it('returns the refund id Stripe created', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 're_123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      refundStripePayment(
        fetchImpl as unknown as typeof fetch,
        { paymentIntent: 'pi_123', amount: 10_000, orderNumber: 'LM-1' },
        'sk_test_1',
      ),
    ).resolves.toBe('re_123');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/refunds',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('turns a refusal into a message the owner can act on', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'charge already refunded' } }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      refundStripePayment(
        fetchImpl as unknown as typeof fetch,
        { paymentIntent: 'pi_123', amount: 10_000, orderNumber: 'LM-1' },
        'sk_test_1',
      ),
    ).rejects.toMatchObject({
      code: 'conflict',
      message: expect.stringContaining('charge already refunded'),
    });
  });

  it('reports a network failure instead of throwing a raw error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));

    await expect(
      refundStripePayment(
        fetchImpl as unknown as typeof fetch,
        { paymentIntent: 'pi_123', amount: 10_000, orderNumber: 'LM-1' },
        'sk_test_1',
      ),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});
