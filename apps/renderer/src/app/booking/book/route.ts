import { NextResponse } from 'next/server';
import { bookingInputFromForm, createBooking } from '../../../lib/booking';
import { ApiRejectedError, ApiUnavailableError } from '../../../lib/api';
import { requestHost } from '../../../lib/request-host';
import { publicUrl } from '../../../lib/public-url';

/** Plain HTML form target for the public booking page. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.redirect(publicUrl('/booking?error=details', request), 303);
  }

  const input = bookingInputFromForm(form);
  if (!input) {
    return NextResponse.redirect(publicUrl('/booking?error=details', request), 303);
  }

  try {
    const host = await requestHost();
    const created = await createBooking(host, input);
    return NextResponse.redirect(
      publicUrl(`/booking/${encodeURIComponent(created.token)}`, request),
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
    return NextResponse.redirect(publicUrl(`/booking?error=${code}`, request), 303);
  }
}
