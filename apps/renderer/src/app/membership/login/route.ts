import { NextResponse } from 'next/server';
import { readerLoginInputSchema } from '@lumio/shared';
import { ApiRejectedError } from '../../../lib/api';
import { loginReader, readerCookie } from '../../../lib/reader';
import { requestHost } from '../../../lib/request-host';
import { publicUrl } from '../../../lib/public-url';

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/** Signs a reader in; a wrong password comes back as `?error=sign-in`. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(publicUrl('/membership?error=invalid', request), 303);

  const parsed = readerLoginInputSchema.safeParse({
    email: text(form, 'email'),
    password: text(form, 'password'),
  });
  if (!parsed.success) {
    return NextResponse.redirect(publicUrl('/membership?error=invalid', request), 303);
  }

  try {
    const host = await requestHost();
    const session = await loginReader(host, parsed.data);
    const response = NextResponse.redirect(publicUrl('/membership', request), 303);
    response.cookies.set(readerCookie(session.token));
    return response;
  } catch (error) {
    const code =
      error instanceof ApiRejectedError && error.status === 401 ? 'sign-in' : 'unavailable';
    return NextResponse.redirect(publicUrl(`/membership?error=${code}`, request), 303);
  }
}
