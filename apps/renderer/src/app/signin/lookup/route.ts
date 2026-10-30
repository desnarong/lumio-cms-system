import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ORDER_HONEYPOT_FIELD, orderLookupInputSchema } from '@lumio/shared';
import {
  SAVED_ORDERS_COOKIE,
  parseSavedOrders,
  rememberOrder,
  savedOrdersCookie,
} from '../../../lib/customer';
import { ApiUnavailableError } from '../../../lib/api';
import { requestHost } from '../../../lib/request-host';
import { lookupOrder } from '../../../lib/shop';

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * Plain HTML form target for the storefront sign-in. The order number and the
 * phone or email used at checkout are checked by the API, which returns the
 * order only to somebody who knows both; the renderer then remembers the link
 * on this device.
 */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.redirect(new URL('/signin?error=invalid', request.url), 303);
  }

  const parsed = orderLookupInputSchema.safeParse({
    number: text(form, 'number'),
    contact: text(form, 'contact'),
    honeypot: text(form, ORDER_HONEYPOT_FIELD),
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL('/signin?error=invalid', request.url), 303);
  }

  try {
    const host = await requestHost();
    const order = await lookupOrder(host, parsed.data);
    const response = NextResponse.redirect(
      new URL(`/order/${encodeURIComponent(order.token)}`, request.url),
      303,
    );
    const store = await cookies();
    const saved = rememberOrder(parseSavedOrders(store.get(SAVED_ORDERS_COOKIE)?.value), {
      number: order.number,
      token: order.token,
      createdAt: order.createdAt,
    });
    response.cookies.set(savedOrdersCookie(saved));
    return response;
  } catch (error) {
    const code = error instanceof ApiUnavailableError ? 'unavailable' : 'not-found';
    return NextResponse.redirect(new URL(`/signin?error=${code}`, request.url), 303);
  }
}
