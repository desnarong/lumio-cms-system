import { describe, expect, it } from 'vitest';
import {
  formatMembershipPrice,
  intervalDays,
  intervalLabel,
  isPaywalled,
  isSubscriptionActive,
  membershipPlanInputSchema,
  readerForgotPasswordInputSchema,
  readerLoginInputSchema,
  readerRegisterInputSchema,
  readerResetPasswordInputSchema,
  periodEndFor,
} from './membership.js';

describe('membership plans', () => {
  it('keeps prices in satang and defaults to active', () => {
    const plan = membershipPlanInputSchema.parse({
      name: 'สมาชิก premium',
      interval: 'month',
      price: 129_00,
    });
    expect(plan.price).toBe(12_900);
    expect(plan.status).toBe('active');
    expect(plan.description).toBe('');
  });

  it('rejects a fractional price and an unknown interval', () => {
    expect(() =>
      membershipPlanInputSchema.parse({ name: 'x', interval: 'month', price: 10.5 }),
    ).toThrow();
    expect(() =>
      membershipPlanInputSchema.parse({ name: 'x', interval: 'week', price: 100 }),
    ).toThrow();
  });

  it('formats a satang price as baht', () => {
    expect(formatMembershipPrice(129_000)).toBe('฿1,290');
    expect(formatMembershipPrice(99_50)).toBe('฿99.50');
    expect(formatMembershipPrice(0)).toBe('฿0');
  });

  it('labels periods in Thai and knows its own length', () => {
    expect(intervalLabel('month')).toBe('รายเดือน');
    expect(intervalLabel('year')).toBe('รายปี');
    expect(intervalDays('month')).toBe(30);
    expect(intervalDays('year')).toBe(365);
  });
});

describe('reader input', () => {
  it('lowercases the email so one person cannot hold two accounts', () => {
    const input = readerRegisterInputSchema.parse({
      email: '  Somchai@Example.COM ',
      password: 'a-good-password',
    });
    expect(input.email).toBe('somchai@example.com');
  });

  it('refuses a short password and a malformed email', () => {
    expect(() => readerRegisterInputSchema.parse({ email: 'a@b.co', password: 'short' })).toThrow();
    expect(() => readerLoginInputSchema.parse({ email: 'nope', password: 'x' })).toThrow();
    expect(() => readerForgotPasswordInputSchema.parse({ email: 'nope' })).toThrow();
  });

  it('requires a long enough reset token', () => {
    expect(() =>
      readerResetPasswordInputSchema.parse({ token: 'short', password: 'a-good-password' }),
    ).toThrow();
  });
});

describe('access decisions', () => {
  const now = new Date('2026-10-30T00:00:00Z');

  it('opens members-only pages for an active paid period', () => {
    expect(
      isSubscriptionActive({ status: 'active', currentPeriodEnd: '2026-11-30T00:00:00Z' }, now),
    ).toBe(true);
  });

  it('fails closed for lapsed, cancelled, past-due and unknown periods', () => {
    expect(
      isSubscriptionActive({ status: 'active', currentPeriodEnd: '2026-10-01T00:00:00Z' }, now),
    ).toBe(false);
    expect(
      isSubscriptionActive({ status: 'cancelled', currentPeriodEnd: '2026-11-30T00:00:00Z' }, now),
    ).toBe(false);
    expect(
      isSubscriptionActive({ status: 'past_due', currentPeriodEnd: '2026-11-30T00:00:00Z' }, now),
    ).toBe(false);
    expect(isSubscriptionActive({ status: 'active', currentPeriodEnd: null }, now)).toBe(false);
    expect(isSubscriptionActive(null, now)).toBe(false);
  });

  it('locks only members pages for a reader without a membership', () => {
    expect(isPaywalled('members', false)).toBe(true);
    expect(isPaywalled('members', true)).toBe(false);
    expect(isPaywalled('public', false)).toBe(false);
    expect(isPaywalled(null, false)).toBe(false);
  });

  it('predicts the end of a period when Stripe gives none', () => {
    expect(periodEndFor('month', now).toISOString()).toBe('2026-11-29T00:00:00.000Z');
    expect(periodEndFor('year', now).toISOString()).toBe('2027-10-30T00:00:00.000Z');
  });
});
