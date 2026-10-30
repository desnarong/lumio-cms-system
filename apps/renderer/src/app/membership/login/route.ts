import { NextResponse } from 'next/server';
import { readerLoginInputSchema } from '@lumio/shared';
import { ApiRejectedError } from '../../../lib/api';
import { loginReader, readerCookie } from '../../../lib/reader';
import { requestHost } from '../../../lib/request-host';

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/** Signs a reader in; a wrong password comes back as `?error=sign-in`. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(new URL('/membership?error=invalid', request.url), 303);

  const parsed = readerLoginInputSchema.safeParse({
    email: text(form, 'email'),
    password: text(form, 'password'),
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL('/membership?error=invalid', request.url), 303);
  }

  try {
    const host = await requestHost();
    const session = await loginReader(host, parsed.data);
    const response = NextResponse.redirect(new URL('/membership', request.url), 303);
    response.cookies.set(readerCookie(session.token));
    return response;
  } catch (error) {
    const code = error instanceof ApiRejectedError && error.status === 401 ? 'sign-in' : 'unavailable';
    return NextResponse.redirect(new URL(`/membership?error=${code}`, request.url), 303);
  }
}
