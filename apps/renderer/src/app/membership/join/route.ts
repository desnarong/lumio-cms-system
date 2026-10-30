import { NextResponse } from 'next/server';
import { readerRegisterInputSchema } from '@lumio/shared';
import { ApiRejectedError } from '../../../lib/api';
import { readerCookie, registerReader } from '../../../lib/reader';
import { requestHost } from '../../../lib/request-host';

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * Creates a reader account and signs them in. The API decides whether the email
 * is already taken, so the redirect carries the reason back to the form.
 */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(new URL('/membership?error=invalid', request.url), 303);

  const parsed = readerRegisterInputSchema.safeParse({
    email: text(form, 'email'),
    password: text(form, 'password'),
    name: text(form, 'name') || undefined,
    honeypot: text(form, 'honeypot'),
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL('/membership?error=invalid', request.url), 303);
  }

  try {
    const host = await requestHost();
    const session = await registerReader(host, parsed.data);
    const response = NextResponse.redirect(new URL('/membership?joined=1', request.url), 303);
    response.cookies.set(readerCookie(session.token));
    return response;
  } catch (error) {
    const code = error instanceof ApiRejectedError && error.status === 409 ? 'exists' : 'unavailable';
    return NextResponse.redirect(new URL(`/membership?error=${code}`, request.url), 303);
  }
}
