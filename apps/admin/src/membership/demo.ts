import type {
  MembershipPlan,
  MembershipPlanInput,
  MembershipReader,
  MembershipReaderList,
  MembershipSummary,
} from '@lumio/shared';
import type { MembershipApi } from './api.js';

const PLAN_SEED: MembershipPlan[] = [
  {
    id: 'demo-plan-month',
    name: 'สมาชิกตอบแทน',
    description: 'อ่านทุกบทความไม่จำกัด',
    interval: 'month',
    price: 19900,
    currency: 'THB',
    status: 'active',
    createdAt: new Date('2026-10-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-01T00:00:00Z').toISOString(),
  },
  {
    id: 'demo-plan-year',
    name: 'สมาชิกตอบแทน รายปี',
    description: 'จ่ายครั้งเดียวอ่านได้ทั้งปี',
    interval: 'year',
    price: 199000,
    currency: 'THB',
    status: 'active',
    createdAt: new Date('2026-10-02T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-02T00:00:00Z').toISOString(),
  },
];

const READER_SEED: MembershipReader[] = [
  {
    id: 'demo-reader-1',
    email: 'somchai@example.com',
    name: 'สมชาย',
    emailVerified: true,
    joinedAt: new Date('2026-10-20T03:00:00Z').toISOString(),
    subscription: {
      planId: 'demo-plan-month',
      planName: 'สมาชิกตอบแทน',
      interval: 'month',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 12 * 86_400_000).toISOString(),
      cancelAtPeriodEnd: false,
    },
  },
  {
    id: 'demo-reader-2',
    email: 'malee@example.com',
    name: 'มาลี',
    emailVerified: true,
    joinedAt: new Date('2026-10-22T03:00:00Z').toISOString(),
    subscription: {
      planId: 'demo-plan-year',
      planName: 'สมาชิกตอบแทน รายปี',
      interval: 'year',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 200 * 86_400_000).toISOString(),
      cancelAtPeriodEnd: true,
    },
  },
  {
    id: 'demo-reader-3',
    email: 'anan@example.com',
    name: null,
    emailVerified: false,
    joinedAt: new Date('2026-10-25T03:00:00Z').toISOString(),
    subscription: null,
  },
];

const summaryOf = (plans: MembershipPlan[], readers: MembershipReader[]): MembershipSummary => {
  const active = readers.filter((reader) => reader.subscription?.status === 'active');
  const mrr = active.reduce((sum, reader) => {
    const plan = plans.find((item) => item.id === reader.subscription?.planId);
    if (!plan) return sum;
    return sum + (plan.interval === 'year' ? Math.round(plan.price / 12) : plan.price);
  }, 0);
  return {
    readers: readers.length,
    activeMembers: active.length,
    mrr,
    currency: 'THB',
    plans: plans.length,
  };
};

/** In-memory membership backend so the screen works before the API is up. */
export const createDemoMembershipApi = (): MembershipApi => {
  const plans = [...PLAN_SEED];
  const readers = [...READER_SEED];
  let counter = 0;

  const list = (): MembershipReaderList => ({ items: readers, total: readers.length });

  return {
    plans: async () => [...plans],
    createPlan: async (input: MembershipPlanInput) => {
      counter += 1;
      const now = new Date().toISOString();
      const plan: MembershipPlan = {
        id: `demo-plan-${counter}`,
        name: input.name,
        description: input.description,
        interval: input.interval,
        price: input.price,
        currency: 'THB',
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };
      plans.push(plan);
      return plan;
    },
    updatePlan: async (planId, input) => {
      const plan = plans.find((item) => item.id === planId);
      if (!plan) throw new Error('ไม่พบแพ็กเกจนี้');
      Object.assign(plan, input, { updatedAt: new Date().toISOString() });
      return plan;
    },
    deletePlan: async (planId) => {
      const index = plans.findIndex((item) => item.id === planId);
      if (index >= 0) plans.splice(index, 1);
    },
    readers: async () => list(),
    summary: async () => summaryOf(plans, readers),
    setRenewal: async (readerId, cancel) => {
      const reader = readers.find((item) => item.id === readerId);
      const subscription = reader?.subscription;
      if (!reader || !subscription) throw new Error('ไม่พบการเป็นสมาชิกนี้');
      subscription.cancelAtPeriodEnd = cancel;
      return subscription;
    },
  };
};
