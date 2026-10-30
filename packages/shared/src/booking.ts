import { z } from 'zod';

/**
 * Appointment booking (docs/PROGRESS.md "งานนอก MVP"). A site publishes a list
 * of services, opening hours and how long one slot is; a visitor picks a free
 * slot, and the owner confirms it. All times are the site's wall clock in
 * Thailand (UTC+7), stored as an absolute instant, so a slot read back from the
 * database is the same slot the visitor picked.
 */

/** Thailand does not observe daylight saving, so a fixed offset is correct. */
export const BOOKING_UTC_OFFSET_MINUTES = 420;
const OFFSET_MS = BOOKING_UTC_OFFSET_MINUTES * 60_000;

export const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const isBookingStatus = (value: unknown): value is BookingStatus =>
  typeof value === 'string' && (BOOKING_STATUSES as readonly string[]).includes(value);

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { th: string; en: string }> = {
  pending: { th: 'รอยืนยัน', en: 'Pending' },
  confirmed: { th: 'ยืนยันแล้ว', en: 'Confirmed' },
  completed: { th: 'เสร็จสิ้น', en: 'Completed' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled' },
  no_show: { th: 'ไม่มา', en: 'No show' },
};

/** Statuses that still hold a slot on the calendar. */
export const BOOKING_ACTIVE_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed'];

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const isBookingTime = (value: string): boolean => timePattern.test(value);

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export const isBookingDate = (value: string): boolean =>
  datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

export const bookingDayInputSchema = z.object({
  /** 0 = Sunday … 6 = Saturday, matching `Date#getUTCDay()`. */
  weekday: z.number().int().min(0).max(6),
  open: z.boolean(),
  start: z.string().regex(timePattern, 'เวลาเปิดต้องอยู่ในรูป HH:MM'),
  end: z.string().regex(timePattern, 'เวลาปิดต้องอยู่ในรูป HH:MM'),
});

export const bookingSettingsSchema = z.object({
  /** False hides the booking page and refuses new bookings. */
  enabled: z.boolean(),
  /** Short paragraph above the form. */
  intro: z.string().trim().max(600),
  /** Line shown after a booking is sent. */
  successMessage: z.string().trim().max(300),
  days: z.array(bookingDayInputSchema).length(7),
  /** Length of one appointment slot in minutes. */
  slotMinutes: z.number().int().min(15).max(240),
  /** How many bookings one slot accepts. */
  maxPerSlot: z.number().int().min(1).max(50),
  /** A visitor cannot book a slot sooner than this many hours from now. */
  leadHours: z.number().int().min(0).max(720),
  /** How many days ahead the calendar opens. */
  advanceDays: z.number().int().min(1).max(365),
});
export type BookingSettings = z.infer<typeof bookingSettingsSchema>;

export const bookingServiceInputSchema = z.object({
  name: z.string().trim().min(1, 'กรุณาตั้งชื่อบริการ').max(120),
  description: z.string().trim().max(500).default(''),
  durationMinutes: z.number().int().min(15).max(480),
  /** Price in satang; 0 means free. */
  price: z.number().int().min(0).max(10_000_000),
  active: z.boolean().default(true),
  sort: z.number().int().min(0).max(999).default(0),
});
export type BookingServiceInput = z.infer<typeof bookingServiceInputSchema>;

export const updateBookingServiceInputSchema = bookingServiceInputSchema.partial();
export type UpdateBookingServiceInput = z.infer<typeof updateBookingServiceInputSchema>;

export const bookingServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  durationMinutes: z.number().int(),
  price: z.number().int(),
  currency: z.string(),
  active: z.boolean(),
  sort: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BookingService = z.infer<typeof bookingServiceSchema>;

export const bookingInputSchema = z.object({
  serviceId: z.string().uuid('ไม่พบบริการนี้'),
  /** Site-local date, `YYYY-MM-DD`. */
  date: z.string().regex(datePattern, 'วันที่ไม่ถูกต้อง'),
  /** Site-local start time, `HH:MM`. */
  time: z.string().regex(timePattern, 'เวลาไม่ถูกต้อง'),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(120),
  email: z.string().trim().toLowerCase().email('อีเมลไม่ถูกต้อง').max(200).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  note: z.string().trim().max(500).default(''),
  /** Hidden field no person fills in; a filled one is dropped silently. */
  honeypot: z.string().max(200).optional(),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

export const bookingStatusInputSchema = z.object({ status: z.enum(BOOKING_STATUSES) });
export type BookingStatusInput = z.infer<typeof bookingStatusInputSchema>;

export const bookingSchema = z.object({
  id: z.string(),
  serviceId: z.string().nullable(),
  /** Service name captured when booked, so deleting a service keeps history. */
  serviceName: z.string(),
  customerName: z.string(),
  customerEmail: z.string().nullable(),
  customerPhone: z.string().nullable(),
  note: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum(BOOKING_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Booking = z.infer<typeof bookingSchema>;

export const bookingListSchema = z.object({
  items: z.array(bookingSchema),
  total: z.number().int(),
});
export type BookingList = z.infer<typeof bookingListSchema>;

export const bookingListQuerySchema = z.object({
  /** `YYYY-MM-DD`; when present only that site-local day is returned. */
  date: z.string().regex(datePattern).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

/** One slot of one day, as the public form sees it. */
export const bookingSlotSchema = z.object({
  time: z.string(),
  /** False when full, in the past, or inside the lead time. */
  available: z.boolean(),
});
export type BookingSlot = z.infer<typeof bookingSlotSchema>;

export const bookingDaySchema = z.object({
  date: z.string(),
  /** Thai short label such as "จ. 3 พ.ย." */
  label: z.string(),
  slots: z.array(bookingSlotSchema),
});
export type BookingDay = z.infer<typeof bookingDaySchema>;

export const publicBookingSchema = z.object({
  enabled: z.boolean(),
  intro: z.string(),
  successMessage: z.string(),
  services: z.array(bookingServiceSchema.pick({ id: true, name: true, description: true, durationMinutes: true, price: true, currency: true })),
  days: z.array(bookingDaySchema),
});
export type PublicBooking = z.infer<typeof publicBookingSchema>;

export const publicBookingCreatedSchema = z.object({
  /** Signed token the confirmation page uses to show and cancel one booking. */
  token: z.string(),
  booking: bookingSchema.pick({
    id: true,
    serviceName: true,
    customerName: true,
    startsAt: true,
    endsAt: true,
    status: true,
  }),
});
export type PublicBookingCreated = z.infer<typeof publicBookingCreatedSchema>;

export const bookingCancelInputSchema = z.object({ token: z.string().trim().min(10).max(300) });
export type BookingCancelInput = z.infer<typeof bookingCancelInputSchema>;

const pad = (value: number): string => String(value).padStart(2, '0');

/** An instant shifted into the site's wall clock (UTC+7). */
export const toSiteTime = (date: Date): Date => new Date(date.getTime() + OFFSET_MS);

/** `2026-11-03` + `09:30` → the instant that slot starts. */
export const bookingStart = (date: string, time: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(
    Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0) - OFFSET_MS,
  );
};

/** ISO instant → `YYYY-MM-DD` in the site's wall clock. */
export const siteDateOf = (iso: string): string => {
  const local = toSiteTime(new Date(iso));
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
};

/** ISO instant → `HH:MM` in the site's wall clock. */
export const siteTimeOf = (iso: string): string => {
  const local = toSiteTime(new Date(iso));
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
};

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const THAI_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

/** `2026-11-03` → "จ. 3 พ.ย." */
export const bookingDateLabel = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  const weekday = THAI_DAYS[parsed.getUTCDay()] ?? '';
  const month = THAI_MONTHS[parsed.getUTCMonth()] ?? '';
  return `${weekday} ${parsed.getUTCDate()} ${month}`.trim();
};

/** `2026-11-03T02:30:00.000Z` → "อ. 3 พ.ย. 09:30–10:00" in the site's clock. */
export const bookingRangeLabel = (
  startsAt: string,
  endsAt: string,
  locale: 'th' | 'en' = 'th',
): string => {
  const date = siteDateOf(startsAt);
  const start = siteTimeOf(startsAt);
  const end = siteTimeOf(endsAt);
  if (locale === 'en') return `${date} ${start}–${end}`;
  return `${bookingDateLabel(date)} ${start}–${end}`;
};

/** Adds minutes to `HH:MM`, or null when the result would pass midnight. */
export const addMinutesToTime = (time: string, minutes: number): string | null => {
  if (!isBookingTime(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  const total = (hour ?? 0) * 60 + (minute ?? 0) + minutes;
  if (total >= 24 * 60) return null;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  enabled: false,
  intro: 'เลือกบริการและเวลาที่สะดวก แล้วรอการยืนยันจากเรา',
  successMessage: 'ได้รับคำขอจองแล้ว เราจะติดต่อกลับเพื่อยืนยัน',
  days: [
    { weekday: 0, open: false, start: '09:00', end: '18:00' },
    { weekday: 1, open: true, start: '09:00', end: '18:00' },
    { weekday: 2, open: true, start: '09:00', end: '18:00' },
    { weekday: 3, open: true, start: '09:00', end: '18:00' },
    { weekday: 4, open: true, start: '09:00', end: '18:00' },
    { weekday: 5, open: true, start: '09:00', end: '18:00' },
    { weekday: 6, open: true, start: '09:00', end: '12:00' },
  ],
  slotMinutes: 60,
  maxPerSlot: 1,
  leadHours: 2,
  advanceDays: 30,
};

/** The stored object merged over the defaults; a broken shape falls back. */
export const mergeBookingSettings = (value: unknown): BookingSettings => {
  const parsed = bookingSettingsSchema.partial().safeParse(value ?? {});
  if (!parsed.success) return { ...DEFAULT_BOOKING_SETTINGS };
  const input = parsed.data;
  return {
    ...DEFAULT_BOOKING_SETTINGS,
    ...input,
    days: input.days ?? DEFAULT_BOOKING_SETTINGS.days,
  };
};

/** Slots one open day offers, before checking what is already booked. */
export const slotTimesForDay = (settings: BookingSettings, weekday: number): string[] => {
  const day = settings.days.find((entry) => entry.weekday === weekday);
  if (!day || !day.open) return [];
  if (!isBookingTime(day.start) || !isBookingTime(day.end)) return [];
  const [startHour, startMinute] = day.start.split(':').map(Number);
  const [endHour, endMinute] = day.end.split(':').map(Number);
  const start = (startHour ?? 0) * 60 + (startMinute ?? 0);
  const end = (endHour ?? 0) * 60 + (endMinute ?? 0);
  if (end <= start) return [];
  const times: string[] = [];
  for (let cursor = start; cursor + settings.slotMinutes <= end; cursor += settings.slotMinutes) {
    times.push(`${pad(Math.floor(cursor / 60))}:${pad(cursor % 60)}`);
  }
  return times;
};

/** Weekday of a `YYYY-MM-DD` string (0 = Sunday). */
export const weekdayOf = (date: string): number =>
  new Date(`${date}T00:00:00.000Z`).getUTCDay();

/** `YYYY-MM-DD` for a day `offset` days after `date`. */
export const addDaysToDate = (date: string, offset: number): string => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + offset);
  return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`;
};

export interface SlotAvailability {
  /** Site-local date being built. */
  date: string;
  /** Bookings already taken, as `HH:MM` in the site's clock. */
  taken: readonly string[];
  now?: Date;
}

/**
 * Slots of one day with their availability. A slot disappears when it starts
 * inside the lead time or when the day already has `maxPerSlot` bookings.
 */
export const slotsForDate = (
  settings: BookingSettings,
  { date, taken, now = new Date() }: SlotAvailability,
): BookingSlot[] => {
  const counts = new Map<string, number>();
  for (const time of taken) counts.set(time, (counts.get(time) ?? 0) + 1);
  const earliest = now.getTime() + settings.leadHours * 3_600_000;

  return slotTimesForDay(settings, weekdayOf(date)).map((time) => ({
    time,
    available:
      (counts.get(time) ?? 0) < settings.maxPerSlot &&
      bookingStart(date, time).getTime() >= earliest,
  }));
};

/** Calendar days the public form shows, bounded by `advanceDays`. */
export const bookableDates = (
  settings: BookingSettings,
  from: string,
  now: Date = new Date(),
): string[] => {
  const dates: string[] = [];
  for (let offset = 0; offset < settings.advanceDays; offset += 1) {
    const date = addDaysToDate(from, offset);
    if (slotTimesForDay(settings, weekdayOf(date)).length === 0) continue;
    const lastSlot = slotTimesForDay(settings, weekdayOf(date)).at(-1);
    if (!lastSlot) continue;
    if (bookingStart(date, lastSlot).getTime() < now.getTime()) continue;
    dates.push(date);
  }
  return dates;
};

/** Whether one requested slot could still be booked (before counting others). */
export const isSlotBookable = (
  settings: BookingSettings,
  date: string,
  time: string,
  now: Date = new Date(),
): boolean => {
  if (!settings.enabled) return false;
  if (!isBookingDate(date) || !isBookingTime(time)) return false;
  const times = slotTimesForDay(settings, weekdayOf(date));
  if (!times.includes(time)) return false;
  return bookingStart(date, time).getTime() >= now.getTime() + settings.leadHours * 3_600_000;
};
