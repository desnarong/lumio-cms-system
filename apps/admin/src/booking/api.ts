import type {
  Booking,
  BookingList,
  BookingListQuery,
  BookingService,
  BookingServiceInput,
  BookingSettings,
  BookingStatus,
  UpdateBookingServiceInput,
} from '@lumio/shared';
import { DEFAULT_BOOKING_SETTINGS } from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

/** Services, calendar and appointments of one site. */
export interface BookingApi {
  settings(): Promise<BookingSettings>;
  updateSettings(input: BookingSettings): Promise<BookingSettings>;
  services(): Promise<BookingService[]>;
  createService(input: BookingServiceInput): Promise<BookingService>;
  updateService(serviceId: string, input: UpdateBookingServiceInput): Promise<BookingService>;
  deleteService(serviceId: string): Promise<void>;
  bookings(query?: BookingListQuery): Promise<BookingList>;
  setStatus(bookingId: string, status: BookingStatus): Promise<Booking>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

const queryString = (query: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text.length > 0 ? `?${text}` : '';
};

export interface HttpBookingApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

export const createHttpBookingApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpBookingApiConfig): BookingApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const send = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = getAccessToken?.() ?? null;
    const siteId = getSiteId?.() ?? null;
    const response = await doFetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(siteId ? { 'x-site-id': siteId } : {}),
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | Envelope<T>
      | ErrorEnvelope
      | null;

    if (!response.ok) {
      const error = payload as ErrorEnvelope | null;
      throw new ApiError(
        error?.error ?? 'internal_error',
        error?.message ?? translateNow('api.networkError'),
        response.status,
      );
    }
    return (payload as Envelope<T>).data;
  };

  return {
    settings: () => send<BookingSettings>('/booking/settings'),
    updateSettings: (input) =>
      send<BookingSettings>('/booking/settings', { method: 'PUT', body: JSON.stringify(input) }),
    services: async () =>
      (await send<{ items: BookingService[] }>('/booking/services')).items,
    createService: (input) =>
      send<BookingService>('/booking/services', { method: 'POST', body: JSON.stringify(input) }),
    updateService: (serviceId, input) =>
      send<BookingService>(`/booking/services/${serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteService: async (serviceId) => {
      await send(`/booking/services/${serviceId}`, { method: 'DELETE' });
    },
    bookings: (query = {}) =>
      send<BookingList>(`/booking/bookings${queryString(query as Record<string, unknown>)}`),
    setStatus: (bookingId, status) =>
      send<Booking>(`/booking/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  };
};

/** In-memory booking backend so the screen works before the API is up. */
export const createDemoBookingApi = (): BookingApi => {
  let settings: BookingSettings = { ...DEFAULT_BOOKING_SETTINGS, enabled: true };
  const services: BookingService[] = [
    {
      id: 'demo-service-1',
      name: 'ตรวจทั่วไป',
      description: 'ปรึกษาและตรวจเบื้องต้น 30 นาที',
      durationMinutes: 30,
      price: 0,
      currency: 'THB',
      active: true,
      sort: 0,
      createdAt: new Date('2026-10-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2026-10-01T00:00:00Z').toISOString(),
    },
    {
      id: 'demo-service-2',
      name: 'นวดแผนไทย',
      description: 'นวดคลายกล้ามเนื้อ 60 นาที',
      durationMinutes: 60,
      price: 90000,
      currency: 'THB',
      active: true,
      sort: 1,
      createdAt: new Date('2026-10-02T00:00:00Z').toISOString(),
      updatedAt: new Date('2026-10-02T00:00:00Z').toISOString(),
    },
  ];
  const booked: Booking[] = [
    {
      id: 'demo-booking-1',
      serviceId: 'demo-service-1',
      serviceName: 'ตรวจทั่วไป',
      customerName: 'สมชาย ใจดี',
      customerEmail: 'somchai@example.com',
      customerPhone: '0812345678',
      note: 'ขอตรวจช่วงเช้า',
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000 + 1_800_000).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  let counter = 2;

  return {
    settings: async () => ({ ...settings }),
    updateSettings: async (input) => {
      settings = { ...input };
      return { ...settings };
    },
    services: async () => [...services],
    createService: async (input) => {
      counter += 1;
      const now = new Date().toISOString();
      const service: BookingService = {
        id: `demo-service-${counter}`,
        ...input,
        currency: 'THB',
        createdAt: now,
        updatedAt: now,
      };
      services.push(service);
      return service;
    },
    updateService: async (serviceId, input) => {
      const service = services.find((entry) => entry.id === serviceId);
      if (!service) throw new Error('ไม่พบบริการนี้');
      Object.assign(service, input, { updatedAt: new Date().toISOString() });
      return service;
    },
    deleteService: async (serviceId) => {
      const index = services.findIndex((entry) => entry.id === serviceId);
      if (index >= 0) services.splice(index, 1);
    },
    bookings: async (query = {}) => {
      const items = booked.filter(
        (entry) =>
          (!query.status || entry.status === query.status) &&
          (!query.date || entry.startsAt.slice(0, 10) === query.date),
      );
      return { items, total: items.length };
    },
    setStatus: async (bookingId, status) => {
      const booking = booked.find((entry) => entry.id === bookingId);
      if (!booking) throw new Error('ไม่พบรายการจองนี้');
      booking.status = status;
      booking.updatedAt = new Date().toISOString();
      return booking;
    },
  };
};
