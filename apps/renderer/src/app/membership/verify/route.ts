import { NextResponse } from 'next/server';
import { verifyReaderEmail } from '../../../lib/reader';
import { requestHost } from '../../../lib/request-host';

/**
 * Target of the link in the welcome email. It never renders a page of its own:
 * it confirms the address and returns to the membership screen.
 */
export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (token.length < 20) {
    return NextResponse.redirect(new URL('/membership?error=expired', request.url), 303);
  }

  try {
    const host = await requestHost();
    await verifyReaderEmail(host, token);
    return NextResponse.redirect(new URL('/membership?verified=1', request.url), 303);
  } catch {
    return NextResponse.redirect(new URL('/membership?error=expired', request.url), 303);
  }
}
