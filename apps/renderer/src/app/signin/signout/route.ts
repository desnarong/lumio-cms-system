import { NextResponse } from 'next/server';
import { SAVED_ORDERS_COOKIE } from '../../../lib/customer';

/** Forgets every order remembered on this device. */
export async function POST(request: Request): Promise<Response> {
  const response = NextResponse.redirect(new URL('/signin', request.url), 303);
  response.cookies.set({ name: SAVED_ORDERS_COOKIE, value: '', maxAge: 0, path: '/' });
  return response;
}
