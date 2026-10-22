import { NextResponse } from 'next/server';
import { safeNextPath, withCartItem } from '../../../lib/cart';
import { cartCookie, readCart } from '../../../lib/shop';

/**
 * Plain HTML form target, so the shop works with no JavaScript at all. The cart
 * lives in an httpOnly cookie and every price is recalculated from the API.
 */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const fallback = new URL('/cart', request.url);

  if (!form) return NextResponse.redirect(fallback, 303);

  const productId = String(form.get('productId') ?? '');
  const quantity = Number(form.get('quantity') ?? 1);
  const next = safeNextPath(
    typeof form.get('next') === 'string' ? String(form.get('next')) : null,
    '/cart',
  );

  const variantId = String(form.get('variantId') ?? '') || null;
  const items = withCartItem(await readCart(), productId, Number.isFinite(quantity) ? quantity : 1, {
    variantId,
  });
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(cartCookie(items));
  return response;
}
