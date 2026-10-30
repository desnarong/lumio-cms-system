import { describe, expect, it } from 'vitest';
import {
  SAVED_ORDERS_MAX,
  parseSavedOrders,
  rememberOrder,
  savedOrderDate,
  savedOrdersCookie,
  serializeSavedOrders,
  type SavedOrder,
} from './customer';

const order = (number: string, token = `token-${number}`): SavedOrder => ({
  number,
  token,
  createdAt: '2026-10-22T03:00:00.000Z',
});

describe('parseSavedOrders', () => {
  it('reads back what it wrote', () => {
    expect(parseSavedOrders(serializeSavedOrders([order('LM-261022-AB12CD')]))).toEqual([
      order('LM-261022-AB12CD'),
    ]);
  });

  it('treats a missing, empty or broken cookie as no orders', () => {
    expect(parseSavedOrders(undefined)).toEqual([]);
    expect(parseSavedOrders('')).toEqual([]);
    expect(parseSavedOrders('not json')).toEqual([]);
    expect(parseSavedOrders('{"number":"LM-1"}')).toEqual([]);
  });

  it('drops entries that are not complete orders', () => {
    const value = JSON.stringify([
      order('LM-261022-AB12CD'),
      { number: 'LM-261022-ZZ99' },
      null,
      'nope',
    ]);
    expect(parseSavedOrders(value)).toHaveLength(1);
  });

  it('never returns more than the cap', () => {
    const many = Array.from({ length: SAVED_ORDERS_MAX + 5 }, (_, index) =>
      order(`LM-261022-AB1${index}`),
    );
    expect(parseSavedOrders(JSON.stringify(many))).toHaveLength(SAVED_ORDERS_MAX);
  });
});

describe('rememberOrder', () => {
  it('puts the newest order first', () => {
    const next = rememberOrder([order('LM-261022-AAAA')], order('LM-261022-BBBB'));
    expect(next.map((entry) => entry.number)).toEqual(['LM-261022-BBBB', 'LM-261022-AAAA']);
  });

  it('replaces the same order instead of listing it twice', () => {
    const next = rememberOrder([order('LM-261022-AAAA')], order('LM-261022-AAAA'));
    expect(next).toHaveLength(1);
  });

  it('forgets the oldest once the cap is reached', () => {
    const full = Array.from({ length: SAVED_ORDERS_MAX }, (_, index) =>
      order(`LM-261022-AB1${index}`),
    );
    const next = rememberOrder(full, order('LM-261022-NEWW'));
    expect(next).toHaveLength(SAVED_ORDERS_MAX);
    expect(next[0]?.number).toBe('LM-261022-NEWW');
    expect(next.some((entry) => entry.number === full[full.length - 1]?.number)).toBe(false);
  });
});

describe('savedOrdersCookie', () => {
  it('stays httpOnly, site-wide and out of scripts', () => {
    const cookie = savedOrdersCookie([order('LM-261022-AB12CD')]);
    expect(cookie).toMatchObject({
      name: 'lumio_orders',
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
    expect(cookie.maxAge).toBeGreaterThan(0);
  });
});

describe('savedOrderDate', () => {
  it('shows the day the order was placed', () => {
    expect(savedOrderDate('2026-10-22T03:00:00.000Z')).toBe('22/10/2026');
    expect(savedOrderDate('')).toBe('');
  });
});
