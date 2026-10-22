import { describe, expect, it } from 'vitest';
import {
  commandItemSchema,
  filterCommands,
  findPlan,
  formatBytes,
  formatPlanPrice,
  groupCommands,
  isOverQuota,
  PLAN_DEFINITIONS,
  planLabel,
  quotaUsedPercent,
  requiredScopeFor,
  type CommandItem,
} from './index.js';

const command = (overrides: Partial<CommandItem> = {}): CommandItem => ({
  id: 'c1',
  label: 'หน้าเว็บ',
  group: 'goto',
  keywords: [],
  ...overrides,
});

describe('command palette matching', () => {
  const items: CommandItem[] = [
    command({ id: 'pages', label: 'หน้าเว็บ', keywords: ['pages'] }),
    command({ id: 'posts', label: 'บทความ', keywords: ['posts'] }),
    command({ id: 'create', label: 'เพิ่มหน้าใหม่', group: 'action' }),
    command({ id: 'settings', label: 'ตั้งค่า', group: 'goto' }),
  ];

  it('keeps the given order for an empty query', () => {
    expect(filterCommands(items, '').map((item) => item.id)).toEqual([
      'pages',
      'posts',
      'create',
      'settings',
    ]);
  });

  it('matches Thai labels', () => {
    expect(filterCommands(items, 'หน้า').map((item) => item.id)).toEqual(['pages', 'create']);
  });

  it('matches keyword aliases', () => {
    expect(filterCommands(items, 'posts').map((item) => item.id)).toEqual(['posts']);
  });

  it('matches as a subsequence when the letters are spread out', () => {
    expect(filterCommands(items, 'ตงค').map((item) => item.id)).toEqual(['settings']);
  });

  it('returns nothing when there is no match', () => {
    expect(filterCommands(items, 'zzz')).toEqual([]);
  });

  it('groups the results under their section labels', () => {
    const sections = groupCommands(filterCommands(items, ''));
    expect(sections.map((section) => section.group)).toEqual(['goto', 'action']);
    expect(sections[0]?.label).toBe('ไปที่');
  });

  it('defaults keywords to an empty list when parsing an item', () => {
    expect(commandItemSchema.parse({ id: 'x', label: 'x', group: 'goto' }).keywords).toEqual([]);
  });
});

describe('plan table', () => {
  it('has the plans from the deployment doc', () => {
    expect(PLAN_DEFINITIONS.map((plan) => plan.id)).toEqual([
      'free',
      'starter',
      'pro',
      'business',
      'agency',
    ]);
  });

  it('falls back to free for an unknown plan', () => {
    expect(planLabel('nope')).toBe('ฟรี');
    expect(findPlan('pro').label).toBe('โปร');
  });

  it('formats prices for the screen', () => {
    expect(formatPlanPrice(0)).toBe('ฟรี');
    expect(formatPlanPrice(499)).toBe('฿499 / เดือน');
    expect(formatPlanPrice(null)).toBe('ติดต่อฝ่ายขาย');
  });

  it('formats bytes and quotas', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
    expect(quotaUsedPercent(5, 10)).toBe(50);
    expect(quotaUsedPercent(5, null)).toBe(0);
    expect(quotaUsedPercent(20, 10)).toBe(100);
    expect(isOverQuota(10, 10)).toBe(true);
    expect(isOverQuota(1, null)).toBe(false);
  });
});

describe('app bridge scopes', () => {
  it('maps each method to the scope it needs', () => {
    expect(requiredScopeFor('contents.list')).toBe('contents:read');
    expect(requiredScopeFor('forms.list')).toBe('forms:read');
    expect(requiredScopeFor('media.list')).toBe('media:read');
    expect(requiredScopeFor('analytics.summary')).toBe('analytics:read');
    expect(requiredScopeFor('db.query')).toBeNull();
  });
});
