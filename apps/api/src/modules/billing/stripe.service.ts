import { Injectable } from '@nestjs/common';
import {
  cancelStripeSubscription,
  cancelStripeSubscriptionNow,
  createStripeCheckout,
  stripeConfigured,
  type CanceledSubscription,
  type CheckoutRequest,
  type StripeSession,
} from './stripe';

/** Thin injectable around the pure Stripe helpers, so services can be stubbed. */
@Injectable()
export class StripeService {
  configured(): boolean {
    return stripeConfigured();
  }

  createCheckout(request: CheckoutRequest): Promise<StripeSession> {
    return createStripeCheckout(globalThis.fetch.bind(globalThis), request);
  }

  cancel(subscriptionId: string): Promise<CanceledSubscription> {
    return cancelStripeSubscription(globalThis.fetch.bind(globalThis), subscriptionId);
  }

  cancelNow(subscriptionId: string): Promise<void> {
    return cancelStripeSubscriptionNow(globalThis.fetch.bind(globalThis), subscriptionId);
  }
}
