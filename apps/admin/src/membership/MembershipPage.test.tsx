import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MessagesProvider } from '@lumio/ui';
import type {
  MembershipPlan,
  MembershipReader,
  MembershipReaderList,
  MembershipSummary,
} from '@lumio/shared';
import { MembershipView, type MembershipViewProps } from './MembershipPage.js';

const plan = (overrides: Partial<MembershipPlan> = {}): MembershipPlan => ({
  id: 'plan-1',
  name: 'สมาชิกตอบแทน',
  description: 'อ่านทุกบทความ',
  interval: 'month',
  price: 19900,
  currency: 'THB',
  status: 'active',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

const reader = (overrides: Partial<MembershipReader> = {}): MembershipReader => ({
  id: 'reader-1',
  email: 'reader@example.com',
  name: 'สมชาย',
  emailVerified: true,
  joinedAt: '2026-10-20T00:00:00.000Z',
  subscription: {
    planId: 'plan-1',
    planName: 'สมาชิกตอบแทน',
    interval: 'month',
    status: 'active',
    currentPeriodEnd: '2026-11-20T00:00:00.000Z',
    cancelAtPeriodEnd: false,
  },
  ...overrides,
});

const summary: MembershipSummary = {
  readers: 3,
  activeMembers: 2,
  mrr: 26500,
  currency: 'THB',
  plans: 1,
};

const render = (overrides: Partial<MembershipViewProps> = {}): string => {
  const readers: MembershipReaderList = { items: [reader()], total: 1 };
  const props: MembershipViewProps = {
    summary,
    plans: [plan()],
    readers,
    canManage: true,
    busy: false,
    error: null,
    query: '',
    onQueryChange: vi.fn(),
    onAddPlan: vi.fn(),
    onEditPlan: vi.fn(),
    onDeletePlan: vi.fn(),
    onToggleRenewal: vi.fn(),
    ...overrides,
  };

  return renderToStaticMarkup(
    <MessagesProvider locale="th">
      <MembershipView {...props} />
    </MessagesProvider>,
  );
};

describe('MembershipView', () => {
  it('shows members, accounts and monthly revenue', () => {
    const html = render();
    expect(html).toContain('สมาชิกที่ใช้งานอยู่');
    expect(html).toContain('฿265');
    expect(html).toContain('฿199');
  });

  it('lists a reader with their plan and the renewal date', () => {
    const html = render();
    expect(html).toContain('สมชาย');
    expect(html).toContain('reader@example.com');
    expect(html).toContain('20/11/2026');
  });

  it('offers "stop renewing" only to someone who may manage the site', () => {
    expect(render()).toContain('หยุดต่ออายุ');
    expect(render({ canManage: false })).not.toContain('หยุดต่ออายุ');
  });

  it('says a reader without a plan has none', () => {
    const html = render({
      readers: { items: [reader({ subscription: null })], total: 1 },
    });
    expect(html).toContain('ยังไม่เลือกแพ็กเกจ');
  });

  it('explains an empty list instead of showing an empty table', () => {
    const html = render({ readers: { items: [], total: 0 } });
    expect(html).toContain('ยังไม่มีผู้อ่านสมัครสมาชิก');
  });
});
