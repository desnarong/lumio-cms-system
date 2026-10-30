import { describe, expect, it } from 'vitest';
import {
  BOOKING_HONEYPOT_FIELD,
  bookingInputFromForm,
  bookingIsPast,
  formText,
} from './lib/booking';
import type { Booking } from '@lumio/shared';

const form = (values: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  serviceId: 'service-1',
  serviceName: 'ตรวจทั่วไป',
  customerName: 'สมชาย',
  customerEmail: null,
  customerPhone: '0812345678',
  note: '',
  startsAt: new Date(Date.now() + 3_600_000).toISOString(),
  endsAt: new Date(Date.now() + 5_400_000).toISOString(),
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('public booking form', () => {
  it('reads the service, slot and contact details', () => {
    const input = bookingInputFromForm(
      form({
        serviceId: '00000000-0000-4000-8000-0000000000b1',
        slot: '2026-12-02|09:30',
        name: 'สมชาย',
        phone: '0812345678',
        note: ' ขอช่วงเช้า ',
      }),
    );

    expect(input).toMatchObject({
      date: '2026-12-02',
      time: '09:30',
      name: 'สมชาย',
      note: 'ขอช่วงเช้า',
    });
  });

  it('rejects a slot that is not in the expected shape', () => {
    const input = bookingInputFromForm(
      form({ serviceId: 'not-a-uuid', slot: '', name: '', phone: '' }),
    );

    expect(input).toBeNull();
  });

  it('passes the honeypot through so the API can drop spam', () => {
    const input = bookingInputFromForm(
      form({
        serviceId: '00000000-0000-4000-8000-0000000000b1',
        slot: '2026-12-02|09:30',
        name: 'บอท',
        phone: '0812345678',
        [BOOKING_HONEYPOT_FIELD]: 'https://spam.example',
      }),
    );

    expect(input?.honeypot).toBe('https://spam.example');
  });

  it('trims form values and ignores missing fields', () => {
    const data = form({ a: '  x  ' });
    expect(formText(data, 'a')).toBe('x');
    expect(formText(data, 'missing')).toBe('');
  });

  it('knows when an appointment already started', () => {
    expect(bookingIsPast(booking(), new Date())).toBe(false);
    expect(
      bookingIsPast(booking({ startsAt: new Date(Date.now() - 60_000).toISOString() })),
    ).toBe(true);
  });
});
