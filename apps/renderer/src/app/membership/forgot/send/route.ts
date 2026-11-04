import { NextResponse } from 'next/server';
import { forgotReaderPassword } from '../../../../lib/reader';
import { requestHost } from '../../../../lib/request-host';
import { publicUrl } from '../../../../lib/public-url';

/** Always answers "sent", even for an unknown address (docs/design/15-security.md). */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const email = typeof form?.get('email') === 'string' ? String(form.get('email')).trim() : '';
  if (email.length === 0) {
    return NextResponse.redirect(publicUrl('/membership/forgot?error=invalid', request), 303);
  }

  try {
    const host = await requestHost();
    await forgotReaderPassword(host, email);
  } catch {
    return NextResponse.redirect(publicUrl('/membership/forgot?error=unavailable', request), 303);
  }
  return NextResponse.redirect(publicUrl('/membership/forgot?sent=1', request), 303);
}
