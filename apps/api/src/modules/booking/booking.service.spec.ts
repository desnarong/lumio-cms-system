import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BOOKING_SETTINGS,
  addDaysToDate,
  bookingStart,
  siteDateOf,
  weekdayOf,
  type BookingSettings,
} from '@lumio/shared';
import type { AuditService } from '../audit/audit.service';
import type { EmailService } from '../email/email.service';
import type { PrismaService } from '../prisma/prisma.service';
import { resolveSiteByHost } from '../public/resolve-site';
import { BookingService } from './booking.service';

vi.mock('../public/resolve-site', () => ({
  resolveSiteByHost: vi.fn(async () => ({
    id: '00000000-0000-4000-8000-0000000000a1',
    name: 'คลินิกตัวอย่าง',
    settings: {},
  })),
}));

const SITE = {
  id: '00000000-0000-4000-8000-0000000000a1',
  name: 'คลินิกตัวอย่าง',
  settings: {},
};

const SERVICE_ID = '00000000-0000-4000-8000-0000000000b1';
const BOOKING_ID = '00000000-0000-4000-8000-0000000000c1';

const DAY = 86_400_000;

/** A site-local date in the future whose weekday the calendar opens. */
const futureDate = (): string => {
  const today = siteDateOf(new Date().toISOString());
  for (let offset = 1; offset < 8; offset += 1) {
    const date = addDaysToDate(today, offset);
    if (weekdayOf(date) !== 0) return date;
  }
  return addDaysToDate(today, 7);
};

const openSettings = (overrides: Partial<BookingSettings> = {}): BookingSettings => ({
  ...DEFAULT_BOOKING_SETTINGS,
  enabled: true,
  leadHours: 0,
  ...overrides,
});

const serviceRow = (overrides: Record<string, unknown> = {}) => ({
  id: SERVICE_ID,
  siteId: SITE.id,
  name: 'ตรวจทั่วไป',
  description: '',
  durationMinutes: 60,
  price: 50000,
  currency: 'THB',
  active: true,
  sort: 0,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: new Date('2026-11-01T00:00:00Z'),
  ...overrides,
});

const bookingRow = (overrides: Record<string, unknown> = {}) => ({
  id: BOOKING_ID,
  siteId: SITE.id,
  serviceId: SERVICE_ID,
  serviceName: 'ตรวจทั่วไป',
  customerName: 'สมชาย',
  customerEmail: 'somchai@example.com',
  customerPhone: null,
  note: '',
  startsAt: bookingStart('2026-12-02', '09:00'),
  endsAt: new Date(bookingStart('2026-12-02', '09:00').getTime() + 60 * 60_000),
  status: 'pending',
  cancelHash: null,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: new Date('2026-11-01T00:00:00Z'),
  ...overrides,
});

const dbWith = (tx: Record<string, unknown>): PrismaService =>
  ({
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  }) as unknown as PrismaService;

const emailStub = () =>
  ({
    notifyEmails: vi.fn().mockResolvedValue(['owner@example.com']),
    sendForSite: vi.fn().mockResolvedValue(true),
  }) as unknown as EmailService;

const auditStub = () => ({ log: vi.fn().mockResolvedValue(undefined) }) as unknown as AuditService;

const siteTx = (settings: BookingSettings) => ({
  site: {
    findUnique: vi.fn().mockResolvedValue({ id: SITE.id, settings: { booking: settings } }),
    update: vi.fn().mockResolvedValue({ id: SITE.id, settings: { booking: settings } }),
  },
});

describe('BookingService', () => {
  it('falls back to the default calendar when the site never saved one', async () => {
    const bookings = new BookingService(
      dbWith({ site: { findUnique: vi.fn().mockResolvedValue({ id: SITE.id, settings: {} }) } }),
      auditStub(),
      emailStub(),
    );

    await expect(bookings.settings(SITE.id)).resolves.toMatchObject({
      enabled: false,
      slotMinutes: DEFAULT_BOOKING_SETTINGS.slotMinutes,
      days: DEFAULT_BOOKING_SETTINGS.days,
    });
  });

  it('refuses a booking while the site has the calendar closed', async () => {
    const bookings = new BookingService(
      dbWith({
        site: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: SITE.id, settings: { booking: openSettings({ enabled: false }) } }),
        },
      }),
      auditStub(),
      emailStub(),
    );

    await expect(
      bookings.book('clinic.example.com', {
        serviceId: SERVICE_ID,
        date: futureDate(),
        time: '09:00',
        name: 'สมชาย',
        phone: '0812345678',
        note: '',
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('stores a booking, returns its token and mails the owner', async () => {
    const date = futureDate();
    const create = vi.fn().mockImplementation(async ({ data }) =>
      bookingRow({ ...data, id: BOOKING_ID, startsAt: data.startsAt, endsAt: data.endsAt }),
    );
    const email = emailStub();
    const bookings = new BookingService(
      dbWith({
        ...siteTx(openSettings()),
        bookingService: { findUnique: vi.fn().mockResolvedValue(serviceRow()) },
        booking: { findMany: vi.fn().mockResolvedValue([]), create },
      }),
      auditStub(),
      email,
    );

    const created = await bookings.book('clinic.example.com', {
      serviceId: SERVICE_ID,
      date,
      time: '09:00',
      name: 'สมชาย',
      phone: '0812345678',
      email: '',
      note: '',
    });

    expect(created.token.length).toBeGreaterThan(20);
    expect(created.booking).toMatchObject({ serviceName: 'ตรวจทั่วไป', status: 'pending' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          siteId: SITE.id,
          startsAt: bookingStart(date, '09:00'),
        }),
      }),
    );
    expect(email.sendForSite).toHaveBeenCalled();
  });

  it('refuses a slot another booking already holds', async () => {
    const date = futureDate();
    const start = bookingStart(date, '09:00');
    const bookings = new BookingService(
      dbWith({
        ...siteTx(openSettings({ maxPerSlot: 1 })),
        bookingService: { findUnique: vi.fn().mockResolvedValue(serviceRow()) },
        booking: {
          findMany: vi.fn().mockResolvedValue([
            { startsAt: start, endsAt: new Date(start.getTime() + DAY / 24) },
          ]),
        },
      }),
      auditStub(),
      emailStub(),
    );

    await expect(
      bookings.book('clinic.example.com', {
        serviceId: SERVICE_ID,
        date,
        time: '09:00',
        name: 'สมชาย',
        phone: '0812345678',
        note: '',
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('cancels one booking by its confirmation token', async () => {
    const update = vi.fn().mockImplementation(async ({ data }) => bookingRow({ ...data }));
    const bookings = new BookingService(
      dbWith({
        booking: {
          findUnique: vi.fn().mockResolvedValue(bookingRow({ startsAt: new Date(Date.now() + DAY) })),
          update,
        },
      }),
      auditStub(),
      emailStub(),
    );

    const cancelled = await bookings.cancelByToken('clinic.example.com', 'token-value-1234567890');

    expect(cancelled.status).toBe('cancelled');
    expect(update).toHaveBeenCalledWith({ where: { id: BOOKING_ID }, data: { status: 'cancelled' } });
  });

  it('hides the calendar while the booking add-on is switched off', async () => {
    vi.mocked(resolveSiteByHost).mockResolvedValueOnce({
      id: SITE.id,
      name: SITE.name,
      settings: { flags: { booking: false } },
    } as never);
    const bookings = new BookingService(
      dbWith({
        site: {
          findUnique: vi.fn().mockResolvedValue({
            id: SITE.id,
            settings: { booking: openSettings(), flags: { booking: false } },
          }),
        },
        bookingService: { findMany: vi.fn().mockResolvedValue([serviceRow()]) },
        booking: { findMany: vi.fn().mockResolvedValue([]) },
      }),
      auditStub(),
      emailStub(),
    );

    await expect(bookings.publicView('clinic.example.com')).resolves.toMatchObject({
      enabled: false,
      days: [],
    });
  });
});
