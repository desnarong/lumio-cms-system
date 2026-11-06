import { describe, expect, it } from 'vitest';
import {
  addMonths,
  monthStart,
  partitionMonth,
  partitionName,
  partitionRange,
  planPartitions,
} from './pageview-partitions';

const NOW = new Date('2026-11-06T17:30:00Z');
const utc = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

describe('pageview partition names', () => {
  it('names a partition after its UTC month', () => {
    expect(partitionName(NOW)).toBe('pageviews_p2026_11');
    // 23:30 on the last day of the month is still that month in UTC.
    expect(partitionName(new Date('2026-12-31T23:30:00Z'))).toBe('pageviews_p2026_12');
  });

  it('parses its own names and nothing else', () => {
    expect(partitionMonth('pageviews_p2026_01')).toEqual(utc('2026-01-01'));
    expect(partitionMonth('pageviews_default')).toBeNull();
    expect(partitionMonth('pageviews_p2026_13')).toBeNull();
    expect(partitionMonth('pageviews_p2026_01"; DROP TABLE users; --')).toBeNull();
  });

  it('covers exactly one month, across the year boundary', () => {
    expect(partitionRange(utc('2026-12-15'))).toEqual({
      name: 'pageviews_p2026_12',
      from: utc('2026-12-01'),
      to: utc('2027-01-01'),
    });
    expect(addMonths(monthStart(NOW), -12)).toEqual(utc('2025-11-01'));
  });
});

describe('planPartitions', () => {
  it('creates the current month and the months ahead on an empty install', () => {
    const plan = planPartitions({
      now: NOW,
      retentionMonths: 13,
      aheadMonths: 2,
      existing: [],
      defaultMonths: [],
    });
    expect(plan.create.map((range) => range.name)).toEqual([
      'pageviews_p2026_11',
      'pageviews_p2026_12',
      'pageviews_p2027_01',
    ]);
    expect(plan.drop).toEqual([]);
    expect(plan.cutoff).toEqual(utc('2025-11-01'));
  });

  it('gives kept months already in the default their own partition, oldest first', () => {
    const plan = planPartitions({
      now: NOW,
      retentionMonths: 13,
      aheadMonths: 0,
      existing: [],
      defaultMonths: [utc('2026-10-01'), utc('2026-03-01'), utc('2024-01-01')],
    });
    // 2024-01 is past the cutoff: its rows are deleted, not partitioned.
    expect(plan.create.map((range) => range.name)).toEqual([
      'pageviews_p2026_03',
      'pageviews_p2026_10',
      'pageviews_p2026_11',
    ]);
  });

  it('skips partitions that already exist', () => {
    const plan = planPartitions({
      now: NOW,
      retentionMonths: 13,
      aheadMonths: 1,
      existing: ['pageviews_p2026_11', 'pageviews_p2026_12'],
      defaultMonths: [],
    });
    expect(plan.create).toEqual([]);
  });

  it('drops only whole months older than the retention window', () => {
    const plan = planPartitions({
      now: NOW,
      retentionMonths: 3,
      aheadMonths: 0,
      existing: [
        'pageviews_p2026_07',
        'pageviews_p2026_08',
        'pageviews_p2026_09',
        'pageviews_p2026_10',
        'pageviews_p2026_11',
        'pageviews_default',
      ],
      defaultMonths: [],
    });
    expect(plan.cutoff).toEqual(utc('2026-09-01'));
    expect(plan.drop).toEqual(['pageviews_p2026_07', 'pageviews_p2026_08']);
  });

  it('never plans to drop the current month, even with a tiny window', () => {
    const plan = planPartitions({
      now: NOW,
      retentionMonths: 0,
      aheadMonths: 0,
      existing: ['pageviews_p2026_11'],
      defaultMonths: [],
    });
    expect(plan.drop).toEqual([]);
  });
});
