import {
  bookingInputSchema,
  type Booking,
  type BookingInput,
  type PublicBooking,
  type PublicBookingCreated,
} from '@lumio/shared';
import { ApiUnavailableError } from './api';
import { getPublicApi } from './content';

/** Hidden field no person fills in; the API drops a request that has it. */
export const BOOKING_HONEYPOT_FIELD = 'website';

export const loadBookingPage = (host: string): Promise<PublicBooking> =>
  getPublicApi().getBooking(host);

export const createBooking = (host: string, input: BookingInput): Promise<PublicBookingCreated> =>
  getPublicApi().createBooking(host, input);

export const loadBooking = (host: string, token: string): Promise<Booking> =>
  getPublicApi().bookingByToken(host, token);

export const cancelBooking = (host: string, token: string): Promise<Booking> =>
  getPublicApi().cancelBooking(host, token);

/** Form value as trimmed text, whatever the browser sent. */
export const formText = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * Reads the plain HTML booking form. The slot field carries `date|time` so one
 * select can offer every open day without any JavaScript.
 */
export const bookingInputFromForm = (form: FormData): BookingInput | null => {
  const [date, time] = formText(form, 'slot').split('|');
  const parsed = bookingInputSchema.safeParse({
    serviceId: formText(form, 'serviceId'),
    date: date ?? '',
    time: time ?? '',
    name: formText(form, 'name'),
    phone: formText(form, 'phone'),
    email: formText(form, 'email'),
    note: formText(form, 'note'),
    honeypot: formText(form, BOOKING_HONEYPOT_FIELD),
  });
  return parsed.success ? parsed.data : null;
};

/** A booking is stale once the page has already passed its start. */
export const bookingIsPast = (booking: Booking, now: Date = new Date()): boolean =>
  new Date(booking.startsAt).getTime() < now.getTime();

export { ApiUnavailableError };
