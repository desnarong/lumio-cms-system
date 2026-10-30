import { randomBytes, createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { Booking as BookingRow, BookingService as ServiceRow, Prisma, Site } from '@prisma/client';
import {
  addDaysToDate,
  bookingStart,
  bookingDateLabel,
  bookableDates,
  isBookingStatus,
  mergeBookingSettings,
  siteDateOf,
  siteTimeOf,
  slotTimesForDay,
  slotsForDate,
  weekdayOf,
  type Booking,
  type BookingInput,
  type BookingList,
  type BookingListQuery,
  type BookingService as BookingServiceView,
  type BookingServiceInput,
  type BookingSettings,
  type BookingStatus,
  type PublicBooking,
  type PublicBookingCreated,
  type UpdateBookingServiceInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSiteByHost } from '../public/resolve-site';

const MAX_DAYS_SHOWN = 14;

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

const statusOf = (value: string): BookingStatus =>
  isBookingStatus(value) ? value : 'pending';

const toService = (row: ServiceRow): BookingServiceView => ({
  id: row.id,
  name: row.name,
  description: row.description,
  durationMinutes: row.durationMinutes,
  price: row.price,
  currency: row.currency,
  active: row.active,
  sort: row.sort,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  serviceId: row.serviceId,
  serviceName: row.serviceName,
  customerName: row.customerName,
  customerEmail: row.customerEmail,
  customerPhone: row.customerPhone,
  note: row.note,
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
  status: statusOf(row.status),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** Active bookings that still hold their slot. */
const HOLDING: BookingStatus[] = ['pending', 'confirmed', 'completed'];

/** Two time ranges of one day overlap when each starts before the other ends. */
const overlaps = (startA: number, endA: number, startB: number, endB: number): boolean =>
  startA < endB && startB < endA;

/**
 * Appointment booking (docs/PROGRESS.md "งานนอก MVP"). One shared calendar per
 * site: services differ in length, but a slot is free only when no other active
 * booking overlaps it.
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  /* ------------------------------------------------------------- settings */

  async settings(siteId: string): Promise<BookingSettings> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return mergeBookingSettings(asRecord(site.settings).booking);
  }

  async updateSettings(
    siteId: string,
    input: BookingSettings,
    actorId: string,
  ): Promise<BookingSettings> {
    const stored = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      const settings = { ...asRecord(site.settings), booking: input };
      const updated = await tx.site.update({
        where: { id: siteId },
        data: { settings: settings as Prisma.InputJsonValue },
      });
      return mergeBookingSettings(asRecord(updated.settings).booking);
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'booking.settings.update',
      target: siteId,
      meta: { enabled: input.enabled, slotMinutes: input.slotMinutes },
    });
    return stored;
  }

  /* ------------------------------------------------------------- services */

  async listServices(siteId: string): Promise<BookingServiceView[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.bookingService.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }] }),
    );
    return rows.map(toService);
  }

  async createService(
    siteId: string,
    input: BookingServiceInput,
    actorId: string,
  ): Promise<BookingServiceView> {
    const row = await this.db.forSite(siteId, (tx) =>
      tx.bookingService.create({
        data: {
          siteId,
          name: input.name,
          description: input.description,
          durationMinutes: input.durationMinutes,
          price: input.price,
          active: input.active,
          sort: input.sort,
        },
      }),
    );
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'booking.service.create',
      target: row.id,
      meta: { name: row.name },
    });
    return toService(row);
  }

  async updateService(
    siteId: string,
    serviceId: string,
    input: UpdateBookingServiceInput,
    actorId: string,
  ): Promise<BookingServiceView> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.bookingService.findUnique({ where: { id: serviceId } });
      if (!current) throw ApiException.notFound('ไม่พบบริการนี้');
      return tx.bookingService.update({
        where: { id: serviceId },
        data: {
          name: input.name ?? undefined,
          description: input.description ?? undefined,
          durationMinutes: input.durationMinutes ?? undefined,
          price: input.price ?? undefined,
          active: input.active ?? undefined,
          sort: input.sort ?? undefined,
        },
      });
    });
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'booking.service.update',
      target: serviceId,
      meta: { fields: Object.keys(input) },
    });
    return toService(row);
  }

  async deleteService(siteId: string, serviceId: string, actorId: string): Promise<void> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.bookingService.findUnique({ where: { id: serviceId } });
      if (!current) throw ApiException.notFound('ไม่พบบริการนี้');
      await tx.bookingService.delete({ where: { id: serviceId } });
      return current;
    });
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'booking.service.delete',
      target: serviceId,
      meta: { name: row.name },
    });
  }

  /* ------------------------------------------------------------- bookings */

  async listBookings(siteId: string, query: BookingListQuery): Promise<BookingList> {
    const limit = query.limit ?? 50;
    const range = query.date
      ? {
          startsAt: {
            gte: bookingStart(query.date, '00:00'),
            lt: bookingStart(addDaysToDate(query.date, 1), '00:00'),
          },
        }
      : {};

    const [rows, total] = await this.db.forSite(siteId, async (tx) =>
      Promise.all([
        tx.booking.findMany({
          where: {
            ...range,
            ...(query.status ? { status: query.status } : {}),
          },
          orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
          take: limit,
        }),
        tx.booking.count({
          where: { ...range, ...(query.status ? { status: query.status } : {}) },
        }),
      ]),
    );

    return { items: rows.map(toBooking), total };
  }

  async setStatus(
    siteId: string,
    bookingId: string,
    status: BookingStatus,
    actorId: string,
  ): Promise<Booking> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!current) throw ApiException.notFound('ไม่พบรายการจองนี้');
      return tx.booking.update({ where: { id: bookingId }, data: { status } });
    });
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'booking.status.update',
      target: bookingId,
      meta: { status },
    });
    return toBooking(row);
  }

  /* --------------------------------------------------------------- public */

  /** What the public booking page needs, or an empty calendar when closed. */
  async publicView(host: string): Promise<PublicBooking> {
    const site = await resolveSiteByHost(this.db, host);
    const [settings, services] = await Promise.all([
      this.settings(site.id),
      this.listServices(site.id),
    ]);
    const open = services.filter((service) => service.active);

    if (!settings.enabled || !this.featureOpen(site) || open.length === 0) {
      return {
        enabled: false,
        intro: settings.intro,
        successMessage: settings.successMessage,
        services: [],
        days: [],
      };
    }

    const now = new Date();
    const today = siteDateOf(now.toISOString());
    const dates = bookableDates(settings, today, now).slice(0, MAX_DAYS_SHOWN);
    const days = await this.buildDays(site.id, settings, dates, open, now);

    return {
      enabled: true,
      intro: settings.intro,
      successMessage: settings.successMessage,
      services: open.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        currency: service.currency,
      })),
      days,
    };
  }

  /** Slots of the public calendar; re-checked when a visitor picks one. */
  private async buildDays(
    siteId: string,
    settings: BookingSettings,
    dates: string[],
    services: BookingServiceView[],
    now: Date,
  ): Promise<PublicBooking['days']> {
    if (dates.length === 0) return [];
    const first = dates[0] as string;
    const last = dates[dates.length - 1] as string;
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.booking.findMany({
        where: {
          status: { in: HOLDING },
          startsAt: { gte: bookingStart(first, '00:00'), lt: bookingStart(addDaysToDate(last, 1), '00:00') },
        },
        select: { startsAt: true, endsAt: true },
      }),
    );

    // The calendar is shared, so a slot is shown when the shortest service fits;
    // the exact length is checked again when the visitor actually books.
    const shortest = Math.min(...services.map((service) => service.durationMinutes));
    return dates.map((date) => {
      const taken = rows
        .filter((row) => siteDateOf(row.startsAt.toISOString()) === date)
        .map((row) => siteTimeOf(row.startsAt.toISOString()));
      const fits = slotsForDate(settings, { date, taken, now }).filter((slot) => {
        const start = bookingStart(date, slot.time).getTime();
        const end = start + shortest * 60_000;
        return !rows.some((row) =>
          overlaps(start, end, row.startsAt.getTime(), row.endsAt.getTime()),
        );
      });
      return {
        date,
        label: bookingDateLabel(date),
        slots: fits.map((slot) => ({ time: slot.time, available: slot.available })),
      };
    });
  }

  async book(host: string, input: BookingInput): Promise<PublicBookingCreated> {
    if (input.honeypot && input.honeypot.trim().length > 0) {
      throw ApiException.validation('คำขอไม่ถูกต้อง');
    }
    if (!input.email && !input.phone) {
      throw ApiException.validation('กรุณาให้เบอร์โทรหรืออีเมลเพื่อติดต่อกลับ');
    }
    if (!input.email) {
      // The schema allows an empty string; store null so the column reads as "unknown".
      input = { ...input, email: undefined };
    }

    const site = await resolveSiteByHost(this.db, host);
    if (!this.featureOpen(site)) throw ApiException.notFound('เว็บนี้ยังไม่เปิดรับการจอง');
    const settings = await this.settings(site.id);
    if (!settings.enabled) throw ApiException.notFound('เว็บนี้ยังไม่เปิดรับการจอง');

    const service = await this.db.forSite(site.id, (tx) =>
      tx.bookingService.findUnique({ where: { id: input.serviceId } }),
    );
    if (!service || !service.active) throw ApiException.notFound('ไม่พบบริการนี้');

    const startsAt = bookingStart(input.date, input.time);
    if (!slotTimesForDay(settings, weekdayOf(input.date)).includes(input.time)) {
      throw ApiException.validation('เวลานี้ไม่อยู่ในตารางเปิดให้บริการ');
    }
    if (startsAt.getTime() < Date.now() + settings.leadHours * 3_600_000) {
      throw ApiException.validation('เวลานี้ใกล้เกินไป กรุณาเลือกเวลาอื่น');
    }
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

    const token = randomBytes(24).toString('base64url');
    const created = await this.db.forSite(site.id, async (tx) => {
      const sameDay = await tx.booking.findMany({
        where: {
          status: { in: HOLDING },
          startsAt: {
            gte: bookingStart(input.date, '00:00'),
            lt: bookingStart(addDaysToDate(input.date, 1), '00:00'),
          },
        },
        select: { startsAt: true, endsAt: true },
      });
      const overlapping = sameDay.filter((row) =>
        overlaps(startsAt.getTime(), endsAt.getTime(), row.startsAt.getTime(), row.endsAt.getTime()),
      );
      if (overlapping.length >= settings.maxPerSlot) {
        throw ApiException.conflict('เวลานี้มีคนจองแล้ว กรุณาเลือกเวลาอื่น');
      }

      return tx.booking.create({
        data: {
          siteId: site.id,
          serviceId: service.id,
          serviceName: service.name,
          customerName: input.name,
          customerEmail: input.email ?? null,
          customerPhone: input.phone ?? null,
          note: input.note,
          startsAt,
          endsAt,
          status: 'pending',
          cancelHash: sha256(token),
        },
      });
    });

    await this.notifyNewBooking(site, created, service);
    return {
      token,
      booking: {
        id: created.id,
        serviceName: created.serviceName,
        customerName: created.customerName,
        startsAt: created.startsAt.toISOString(),
        endsAt: created.endsAt.toISOString(),
        status: statusOf(created.status),
      },
    };
  }

  async bookingByToken(host: string, token: string): Promise<Booking> {
    const site = await resolveSiteByHost(this.db, host);
    const row = await this.db.forSite(site.id, (tx) =>
      tx.booking.findUnique({ where: { cancelHash: sha256(token) } }),
    );
    if (!row) throw ApiException.notFound('ไม่พบรายการจองนี้');
    return toBooking(row);
  }

  async cancelByToken(host: string, token: string): Promise<Booking> {
    const site = await resolveSiteByHost(this.db, host);
    const row = await this.db.forSite(site.id, async (tx) => {
      const current = await tx.booking.findUnique({ where: { cancelHash: sha256(token) } });
      if (!current) throw ApiException.notFound('ไม่พบรายการจองนี้');
      if (current.status === 'cancelled') return current;
      if (current.startsAt.getTime() < Date.now()) {
        throw ApiException.validation('เลยเวลานัดแล้ว กรุณาติดต่อร้านโดยตรง');
      }
      return tx.booking.update({ where: { id: current.id }, data: { status: 'cancelled' } });
    });

    await this.audit.log({
      siteId: site.id,
      action: 'booking.cancel',
      target: row.id,
      meta: { by: 'visitor' },
    });
    return toBooking(row);
  }

  /** The site's booking switch; platform kill switch included. */
  private featureOpen(site: Site): boolean {
    const flags = asRecord(asRecord(site.settings).flags);
    return flags.booking !== false;
  }

  /** Tells the owner by mail; a mail outage never loses the booking. */
  private async notifyNewBooking(
    site: Site,
    row: BookingRow,
    service: ServiceRow,
  ): Promise<void> {
    try {
      const recipients = await this.email.notifyEmails(site.id);
      if (recipients.length === 0) return;
      const when = `${siteDateOf(row.startsAt.toISOString())} ${siteTimeOf(row.startsAt.toISOString())}`;
      await Promise.all(
        recipients.map((to) =>
          this.email.sendForSite(site.id, {
            to,
            subject: `มีนัดใหม่: ${service.name} (${when})`,
            text: [
              `มีลูกค้าจองคิวใหม่บนเว็บ ${site.name}`,
              '',
              `บริการ: ${service.name}`,
              `เวลา: ${when} (${service.durationMinutes} นาที)`,
              `ชื่อ: ${row.customerName}`,
              row.customerPhone ? `โทร: ${row.customerPhone}` : '',
              row.customerEmail ? `อีเมล: ${row.customerEmail}` : '',
              row.note ? `หมายเหตุ: ${row.note}` : '',
            ]
              .filter((line) => line.length > 0)
              .join('\n'),
            ...(row.customerEmail ? { replyTo: row.customerEmail } : {}),
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`แจ้งเตือนนัดใหม่ไม่สำเร็จ: ${String(error)}`);
    }
  }
}
