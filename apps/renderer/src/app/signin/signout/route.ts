import { NextResponse } from 'next/server';
import { SAVED_ORDERS_COOKIE } from '../../../lib/customer';
import { publicUrl } from '../../../lib/public-url';

/** Forgets every order remembered on this device. */
export async function POST(request: Request): Promise<Response> {
  const response = NextResponse.redirect(publicUrl('/signin', request), 303);
  response.cookies.set({ name: SAVED_ORDERS_COOKIE, value: '', maxAge: 0, path: '/' });
  return response;
}
