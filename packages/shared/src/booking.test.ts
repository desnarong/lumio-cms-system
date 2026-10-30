import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BOOKING_SETTINGS,
  addDaysToDate,
  bookingDateLabel,
  bookingRangeLabel,
  bookingStart,
  bookableDates,
  isSlotBookable,
  mergeBookingSettings,
  siteDateOf,
  siteTimeOf,
  slotTimesForDay,
  slotsForDate,
  weekdayOf,
} from './booking.js';

const settings = {
  ...DEFAULT_BOOKING_SETTINGS,
  enabled: true,
  leadHours: 0,
  slotMinutes: 60,
  days: DEFAULT_BOOKING_SETTINGS.days.map((day) =>
    day.weekday === 0 ? { ...day, open: false } : { ...day, open: true, start: '09:00', end: '12:00' },
  ),
};

describe('booking times', () => {
  it('turns a site-local date and time into an instant in Thailand time', () => {
    expect(bookingStart('2026-11-03', '09:30').toISOString()).toBe('2026-11-03T02:30:00.000Z');
  });

  it('reads an instant back in the site wall clock', () => {
    expect(siteDateOf('2026-11-03T02:30:00.000Z')).toBe('2026-11-03');
    expect(siteTimeOf('2026-11-03T02:30:00.000Z')).toBe('09:30');
  });

  it('labels a day and a range in Thai', () => {
    expect(weekdayOf('2026-11-03')).toBe(2);
    expect(bookingDateLabel('2026-11-03')).toBe('อ. 3 พ.ย.');
    expect(bookingRangeLabel('2026-11-03T02:30:00.000Z', '2026-11-03T03:30:00.000Z')).toBe(
      'อ. 3 พ.ย. 09:30–10:30',
    );
  });
});

describe('booking calendar', () => {
  it('builds slots of an open day and skips a closed one', () => {
    expect(slotTimesForDay(settings, 1)).toEqual(['09:00', '10:00', '11:00']);
    expect(slotTimesForDay(settings, 0)).toEqual([]);
  });

  it('marks a slot taken when the day is full', () => {
    const slots = slotsForDate(settings, {
      date: '2026-11-03',
      taken: ['09:00'],
      now: new Date('2026-11-01T00:00:00Z'),
    });

    expect(slots.find((slot) => slot.time === '09:00')?.available).toBe(false);
    expect(slots.find((slot) => slot.time === '10:00')?.available).toBe(true);
  });

  it('respects the lead time', () => {
    const withLead = { ...settings, leadHours: 24 };
    const now = new Date('2026-11-02T20:00:00Z');

    expect(isSlotBookable(withLead, '2026-11-03', '09:00', now)).toBe(false);
    expect(isSlotBookable(withLead, '2026-11-04', '09:00', now)).toBe(true);
  });

  it('offers only days the calendar opens', () => {
    const dates = bookableDates(
      { ...settings, advanceDays: 7 },
      '2026-11-01',
      new Date('2026-11-01T00:00:00Z'),
    );

    expect(dates).not.toContain('2026-11-01');
    expect(dates).toContain('2026-11-03');
  });

  it('falls back to the defaults when the stored settings are broken', () => {
    expect(mergeBookingSettings({ slotMinutes: 'เร็ว' })).toEqual(DEFAULT_BOOKING_SETTINGS);
    expect(mergeBookingSettings({ enabled: true }).enabled).toBe(true);
    expect(addDaysToDate('2026-12-31', 1)).toBe('2027-01-01');
  });
});
