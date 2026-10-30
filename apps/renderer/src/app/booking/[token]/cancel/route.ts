import { NextResponse } from 'next/server';
import { cancelBooking } from '../../../../lib/booking';
import { requestHost } from '../../../../lib/request-host';

/** Cancels one booking from its confirmation page; the token is the credential. */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  const target = `/booking/${encodeURIComponent(token)}`;
  try {
    const host = await requestHost();
    await cancelBooking(host, token);
    return NextResponse.redirect(new URL(`${target}?cancelled=1`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`${target}?error=1`, request.url), 303);
  }
}
