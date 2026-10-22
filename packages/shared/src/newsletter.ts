import { z } from 'zod';
import { paginationQuerySchema } from './site.js';

/**
 * Newsletter subscribers (docs/design/05-admin-ia.md "เติบโต › Newsletter",
 * 11-data-model.md `subscribers`). The screen lets the owner see who follows the
 * site, add someone by hand, and export the list.
 */

export const SUBSCRIBER_STATUSES = ['active', 'unsubscribed'] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

export const isSubscriberStatus = (value: unknown): value is SubscriberStatus =>
  typeof value === 'string' && (SUBSCRIBER_STATUSES as readonly string[]).includes(value);

export const SUBSCRIBER_STATUS_LABELS: Record<SubscriberStatus, string> = {
  active: 'กำลังติดตาม',
  unsubscribed: 'ยกเลิกรับข่าว',
};

export const subscriberSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.enum(SUBSCRIBER_STATUSES),
  createdAt: z.string(),
});
export type Subscriber = z.infer<typeof subscriberSchema>;

export const subscriberListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(SUBSCRIBER_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
});
export type SubscriberListQuery = z.infer<typeof subscriberListQuerySchema>;

export const createSubscriberInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('อีเมลไม่ถูกต้อง'),
});
export type CreateSubscriberInput = z.infer<typeof createSubscriberInputSchema>;

export const updateSubscriberInputSchema = z.object({
  status: z.enum(SUBSCRIBER_STATUSES),
});
export type UpdateSubscriberInput = z.infer<typeof updateSubscriberInputSchema>;

/** The list response also carries the totals the header shows. */
export const subscriberListSchema = z.object({
  items: z.array(subscriberSchema),
  cursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
});
export type SubscriberList = z.infer<typeof subscriberListSchema>;

/**
 * Export payload. The CSV travels inside the JSON envelope so the admin can save
 * it as a file without the API having to special-case a raw response.
 */
export const subscriberExportSchema = z.object({
  filename: z.string(),
  content: z.string(),
});
export type SubscriberExport = z.infer<typeof subscriberExportSchema>;

const csvCell = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * Renders the subscriber list as CSV. A UTF-8 BOM is prepended so Thai text opens
 * correctly in Excel, and every cell is escaped, so an email can never break the file.
 */
export const subscribersToCsv = (subscribers: Subscriber[]): string => {
  const header = ['email', 'สถานะ', 'วันที่สมัคร'].join(',');
  const rows = subscribers.map((subscriber) =>
    [
      csvCell(subscriber.email),
      csvCell(SUBSCRIBER_STATUS_LABELS[subscriber.status]),
      csvCell(subscriber.createdAt),
    ].join(','),
  );
  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`;
};
