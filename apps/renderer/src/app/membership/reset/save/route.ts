import { NextResponse } from 'next/server';
import { readerResetPasswordInputSchema } from '@lumio/shared';
import { ApiRejectedError } from '../../../../lib/api';
import { resetReaderPassword } from '../../../../lib/reader';
import { requestHost } from '../../../../lib/request-host';

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/** Saves the new password; an expired token sends the visitor to request a new link. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(new URL('/membership/forgot?error=expired', request.url), 303);

  const parsed = readerResetPasswordInputSchema.safeParse({
    token: text(form, 'token'),
    password: text(form, 'password'),
  });
  if (!parsed.success) {
    const back = new URL('/membership/reset', request.url);
    back.searchParams.set('token', text(form, 'token'));
    back.searchParams.set('error', 'invalid');
    return NextResponse.redirect(back, 303);
  }

  try {
    const host = await requestHost();
    await resetReaderPassword(host, parsed.data.token, parsed.data.password);
    return NextResponse.redirect(new URL('/membership?reset=1', request.url), 303);
  } catch (error) {
    const code = error instanceof ApiRejectedError ? 'expired' : 'unavailable';
    return NextResponse.redirect(new URL(`/membership/forgot?error=${code}`, request.url), 303);
  }
}
