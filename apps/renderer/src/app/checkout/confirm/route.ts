import { NextResponse } from 'next/server';
import { createOrderInputSchema, ORDER_HONEYPOT_FIELD } from '@lumio/shared';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { createOrder, readCart } from '../../../lib/shop';

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/** Receives the checkout form, creates the order server-side and shows its token. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const failure = NextResponse.redirect(new URL('/checkout?error=1', request.url), 303);
  if (!form) return failure;

  const items = await readCart();
  if (items.length === 0) return NextResponse.redirect(new URL('/cart', request.url), 303);

  const parsed = createOrderInputSchema.safeParse({
    items,
    paymentMethod: text(form, 'paymentMethod'),
    note: text(form, 'note'),
    honeypot: text(form, ORDER_HONEYPOT_FIELD),
    customer: {
      name: text(form, 'name'),
      phone: text(form, 'phone'),
      email: text(form, 'email') || null,
      address: text(form, 'address'),
      subdistrict: text(form, 'subdistrict'),
      district: text(form, 'district'),
      province: text(form, 'province'),
      postcode: text(form, 'postcode'),
    },
  });
  if (!parsed.success) return failure;

  try {
    const host = await requestHost();
    const locale = await requestLocale();
    const created = await createOrder(host, parsed.data, locale);
    const target =
      created.payment.redirectUrl ?? `/order/${encodeURIComponent(created.order.token)}`;
    const response = NextResponse.redirect(new URL(target, request.url), 303);
    response.cookies.set({ name: 'lumio_cart', value: '', maxAge: 0, path: '/' });
    return response;
  } catch {
    return failure;
  }
}
