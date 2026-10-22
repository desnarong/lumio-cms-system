import { NextResponse } from 'next/server';
import { withCartItem } from '../../../lib/cart';
import { cartCookie, readCart } from '../../../lib/shop';

/** Changes or removes one cart line; `quantity=0` removes it. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(new URL('/cart', request.url), 303);

  const productId = String(form.get('productId') ?? '');
  const variantId = String(form.get('variantId') ?? '') || null;
  const quantity = Number(form.get('quantity') ?? 0);
  const items = withCartItem(await readCart(), productId, Number.isFinite(quantity) ? quantity : 0, {
    replace: true,
    variantId,
  });

  const response = NextResponse.redirect(new URL('/cart', request.url), 303);
  response.cookies.set(cartCookie(items));
  return response;
}
