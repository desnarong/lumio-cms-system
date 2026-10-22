import { describe, expect, it } from 'vitest';
import {
  findPlan,
  formatBytes,
  prorationCreditFor,
  prorationNote,
  prorationQuote,
  quotaExceededMessage,
} from './index.js';

describe('quotaExceededMessage', () => {
  it('names the limit and what to do next, in Thai', () => {
    expect(quotaExceededMessage('pages', 3)).toContain('แพ็กเกจนี้มีได้ 3 หน้า');
    expect(quotaExceededMessage('team', 2)).toContain('ทีมได้ 2 คน');
    expect(quotaExceededMessage('mediaBytes', 2 * 1024 * 1024 * 1024)).toContain(
      formatBytes(2 * 1024 * 1024 * 1024),
    );
  });

  it('speaks the admin language when asked', () => {
    expect(quotaExceededMessage('pages', 3, 'en')).toContain('This plan includes 3 pages');
    expect(quotaExceededMessage('team', 2, 'en')).toContain('2 team members');
    expect(quotaExceededMessage('mediaBytes', 1024, 'en')).toContain('Media storage is full');
  });
});

describe('plan quotas used by the guard', () => {
  it('caps the free plan and leaves pro pages unlimited', () => {
    expect(findPlan('free').quota).toMatchObject({ pages: 3, team: 1 });
    expect(findPlan('pro').quota.pages).toBeNull();
  });
});

describe('proration', () => {
  const periodStart = new Date('2026-10-01T00:00:00.000Z');
  const periodEnd = new Date('2026-10-31T00:00:00.000Z');

  it('credits the unused half of the paid period', () => {
    const credit = prorationCreditFor({
      price: 500,
      periodStart,
      periodEnd,
      now: new Date('2026-10-16T00:00:00.000Z'),
    });
    expect(credit).toBeGreaterThan(240);
    expect(credit).toBeLessThanOrEqual(250);
  });

  it('credits nothing once the period has ended or the plan is free', () => {
    expect(
      prorationCreditFor({ price: 500, periodStart, periodEnd, now: periodEnd }),
    ).toBe(0);
    expect(
      prorationCreditFor({ price: 0, periodStart, periodEnd, now: periodStart }),
    ).toBe(0);
  });

  it('never asks for less than zero and never credits more than the new price', () => {
    expect(prorationQuote(199, 499)).toEqual({ credit: 199, payable: 0 });
    expect(prorationQuote(499, 100)).toEqual({ credit: 100, payable: 399 });
    expect(prorationQuote(null, 100)).toEqual({ credit: 0, payable: null });
  });

  it('explains the credit in the admin language', () => {
    expect(prorationNote(120)).toContain('฿120');
    expect(prorationNote(120, 'en')).toContain('฿120');
    expect(prorationNote(120, 'en')).toContain('taken off');
  });
});
