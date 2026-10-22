import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  BILLING_CURRENCY,
  findPlan,
  PLAN_DEFINITIONS,
  type BillingSummary,
} from '@lumio/shared';
import { BillingView } from './BillingPanel.js';

const summary = (): BillingSummary => {
  const definition = findPlan('pro');
  return {
    plan: 'pro',
    planLabel: definition.label,
    price: definition.price,
    currency: BILLING_CURRENCY,
    quota: definition.quota,
    usage: { pages: 12, mediaBytes: 3 * 1024 * 1024 * 1024, team: 4 },
    plans: PLAN_DEFINITIONS.map((plan) => ({
      id: plan.id,
      label: plan.label,
      price: plan.price,
      currency: BILLING_CURRENCY,
      quota: plan.quota,
      features: plan.features,
      current: plan.id === 'pro',
      credit: 0,
      payable: plan.price,
    })),
    invoices: [
      {
        id: 'inv1',
        plan: 'pro',
        planLabel: 'โปร',
        amount: 499,
        currency: 'THB',
        status: 'paid',
        periodStart: '2026-09-21T00:00:00.000Z',
        periodEnd: '2026-10-21T00:00:00.000Z',
        issuedAt: '2026-09-21T00:00:00.000Z',
        paidAt: '2026-09-21T00:00:00.000Z',
        method: 'card',
        credit: 0,
      },
    ],
    subscription: { renewsAt: '2026-10-21T00:00:00.000Z', cancelAtPeriodEnd: false, method: 'card' },
  };
};

const render = (overrides: Partial<BillingSummary> = {}): string =>
  renderToStaticMarkup(
    <BillingView
      summary={{ ...summary(), ...overrides }}
      busy={false}
      error={null}
      onChangePlan={vi.fn()}
      onCancelSubscription={vi.fn()}
    />,
  );

describe('BillingView renewal', () => {
  it('shows the next renewal and offers to stop it', () => {
    const html = render();

    expect(html).toContain('ต่ออายุอัตโนมัติครั้งถัดไป 2026-10-21');
    expect(html).toContain('ยกเลิกการต่ออายุ');
  });

  it('says when the paid period ends after a cancellation', () => {
    const html = render({
      subscription: {
        renewsAt: '2026-10-21T00:00:00.000Z',
        cancelAtPeriodEnd: true,
        method: 'card',
      },
    });

    expect(html).toContain('จะสิ้นสุดการต่ออายุหลัง 2026-10-21');
    expect(html).not.toContain('ยกเลิกการต่ออายุ');
  });

  it('stays quiet for a one-time PromptPay payment', () => {
    const html = render({ subscription: null });

    expect(html).not.toContain('ต่ออายุอัตโนมัติ');
    expect(html).not.toContain('ยกเลิกการต่ออายุ');
  });
});

describe('BillingView', () => {
  it('shows the current plan and how much of each quota is used', () => {
    const html = render();
    expect(html).toContain('แพ็กเกจปัจจุบัน');
    expect(html).toContain('โปร');
    expect(html).toContain('฿499 / เดือน');
    expect(html).toContain('หน้าเว็บ');
    expect(html).toContain('ไม่จำกัด');
    expect(html).toContain('3 GB');
  });

  it('marks the plan in use and offers the others', () => {
    const html = render();
    expect(html).toContain('แพ็กเกจที่ใช้อยู่');
    expect(html).toContain('เลือกแพ็กเกจนี้');
    expect(html).toContain('ติดต่อฝ่ายขาย');
  });

  it('lists the payment history with a status', () => {
    const html = render();
    expect(html).toContain('ประวัติการชำระเงิน');
    expect(html).toContain('ชำระแล้ว');
    expect(html).toContain('THB 499');
  });
});
describe('BillingView proration', () => {
  it('shows the credit and what is left to pay for a switch', () => {
    const plans = summary().plans.map((plan) =>
      plan.id === 'business' ? { ...plan, credit: 120, payable: 1170 } : plan,
    );
    const html = render({ plans });

    expect(html).toContain('หักส่วนที่เหลือของแพ็กเกจเดิม ฿120');
    expect(html).toContain('ชำระครั้งนี้ ฿1,170');
  });

  it('does not invent a credit for the plan already in use', () => {
    const html = render();
    expect(html).not.toContain('หักส่วนที่เหลือของแพ็กเกจเดิม');
  });
});
