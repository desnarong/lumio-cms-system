import { describe, expect, it } from 'vitest';
import { createDemoBookingApi } from './api.js';

describe('demo booking backend', () => {
  it('starts with two services and an open calendar', async () => {
    const api = createDemoBookingApi();

    await expect(api.settings()).resolves.toMatchObject({ enabled: true });
    await expect(api.services()).resolves.toHaveLength(2);
  });

  it('creates a service and shows it in the list', async () => {
    const api = createDemoBookingApi();

    const created = await api.createService({
      name: 'ทำฟัน',
      description: '',
      durationMinutes: 45,
      price: 150000,
      active: true,
      sort: 2,
    });

    expect((await api.services()).some((service) => service.id === created.id)).toBe(true);
  });

  it('moves a booking between statuses', async () => {
    const api = createDemoBookingApi();
    const list = await api.bookings();

    const first = list.items[0];
    expect(first).toBeDefined();
    const confirmed = await api.setStatus(first?.id ?? '', 'confirmed');

    expect(confirmed.status).toBe('confirmed');
  });

  it('filters bookings by status and date', async () => {
    const api = createDemoBookingApi();

    await expect(api.bookings({ status: 'completed' })).resolves.toMatchObject({ total: 0 });
  });
});
