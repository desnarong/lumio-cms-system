import { NextResponse } from 'next/server';
import { bookingInputFromForm, createBooking } from '../../../lib/booking';
import { ApiRejectedError, ApiUnavailableError } from '../../../lib/api';
import { requestHost } from '../../../lib/request-host';

/** Plain HTML form target for the public booking page. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.redirect(new URL('/booking?error=details', request.url), 303);
  }

  const input = bookingInputFromForm(form);
  if (!input) {
    return NextResponse.redirect(new URL('/booking?error=details', request.url), 303);
  }

  try {
    const host = await requestHost();
    const created = await createBooking(host, input);
    return NextResponse.redirect(
      new URL(`/booking/${encodeURIComponent(created.token)}`, request.url),
      303,
    );
  } catch (error) {
    const code =
      error instanceof ApiRejectedError
        ? error.status === 409
          ? 'slot'
          : 'details'
        : error instanceof ApiUnavailableError
          ? 'unavailable'
          : 'unavailable';
    return NextResponse.redirect(new URL(`/booking?error=${code}`, request.url), 303);
  }
}
