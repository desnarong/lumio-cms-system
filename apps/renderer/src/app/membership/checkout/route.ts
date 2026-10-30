import { NextResponse } from 'next/server';
import { ContentNotFoundError } from '../../../lib/api';
import { readReaderToken, startReaderCheckout } from '../../../lib/reader';
import { requestHost } from '../../../lib/request-host';

/**
 * Starts a subscription for the chosen plan. A free plan is granted straight
 * away; a paid one redirects to Stripe's hosted page.
 */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const planId = typeof form?.get('planId') === 'string' ? String(form.get('planId')).trim() : '';
  if (planId.length === 0) {
    return NextResponse.redirect(new URL('/membership?error=plan-missing', request.url), 303);
  }

  const token = await readReaderToken();
  if (!token) {
    return NextResponse.redirect(new URL('/membership?error=sign-in#login', request.url), 303);
  }

  try {
    const host = await requestHost();
    const checkout = await startReaderCheckout(host, token, planId);
    return NextResponse.redirect(
      checkout ? checkout.url : new URL('/membership?joined=1', request.url),
      303,
    );
  } catch (error) {
    const code =
      error instanceof ContentNotFoundError ? 'plan-missing' : 'unavailable';
    return NextResponse.redirect(new URL(`/membership?error=${code}`, request.url), 303);
  }
}
