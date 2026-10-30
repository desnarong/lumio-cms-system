import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { EmailService } from '../email/email.service';
import type { FeaturesService } from '../features/features.service';
import type { PasswordService } from '../auth/password.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ReaderService } from './reader.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000c1';
const READER_ID = '00000000-0000-4000-8000-0000000000d1';
const PLAN_ID = '00000000-0000-4000-8000-0000000000e1';

interface ReaderRow {
  id: string;
  siteId: string;
  email: string;
  name: string | null;
  passwordHash: string;
  verifiedAt: Date | null;
  verifyTokenHash: string | null;
  verifyExpiresAt: Date | null;
  resetTokenHash: string | null;
  resetExpiresAt: Date | null;
}

interface SubscriptionRow {
  id: string;
  siteId: string;
  readerId: string;
  planId: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

interface PlanRow {
  id: string;
  siteId: string;
  name: string;
  interval: string;
  price: number;
  currency: string;
  status: string;
}

interface Harness {
  service: ReaderService;
  readers: ReaderRow[];
  subscriptions: SubscriptionRow[];
  plans: PlanRow[];
  send: Mock;
}

const harness = (options: { enabled?: boolean } = {}): Harness => {
  const readers: ReaderRow[] = [];
  const subscriptions: SubscriptionRow[] = [];
  const plans: PlanRow[] = [
    {
      id: PLAN_ID,
      siteId: SITE_ID,
      name: 'สมาชิกตอบแทน',
      interval: 'month',
      price: 19900,
      currency: 'THB',
      status: 'active',
    },
  ];
  const send = vi.fn().mockResolvedValue(true);

  const tx = {
    reader: {
      findUnique: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.id) return readers.find((row) => row.id === where.id) ?? null;
        const key = where.siteId_email as { siteId: string; email: string };
        return readers.find((row) => row.siteId === key.siteId && row.email === key.email) ?? null;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.verifyTokenHash) {
          return (
            readers.find(
              (row) =>
                row.verifyTokenHash === where.verifyTokenHash &&
                (row.verifyExpiresAt?.getTime() ?? 0) > Date.now(),
            ) ?? null
          );
        }
        if (where.resetTokenHash) {
          return (
            readers.find(
              (row) =>
                row.resetTokenHash === where.resetTokenHash &&
                (row.resetExpiresAt?.getTime() ?? 0) > Date.now(),
            ) ?? null
          );
        }
        return null;
      },
      create: async ({ data }: { data: Partial<ReaderRow> }) => {
        const row: ReaderRow = {
          id: READER_ID,
          siteId: SITE_ID,
          email: data.email ?? '',
          name: data.name ?? null,
          passwordHash: data.passwordHash ?? '',
          verifiedAt: null,
          verifyTokenHash: data.verifyTokenHash ?? null,
          verifyExpiresAt: data.verifyExpiresAt ?? null,
          resetTokenHash: null,
          resetExpiresAt: null,
        };
        readers.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<ReaderRow> }) => {
        const row = readers.find((item) => item.id === where.id);
        if (!row) throw new Error('missing reader');
        Object.assign(row, data);
        return row;
      },
    },
    readerSubscription: {
      findFirst: async ({ where }: { where: { readerId: string } }) => {
        const rows = subscriptions
          .filter((row) => row.readerId === where.readerId)
          .sort((a, b) => b.id.localeCompare(a.id));
        return rows[0] ?? null;
      },
      create: async ({ data }: { data: Partial<SubscriptionRow> }) => {
        const row: SubscriptionRow = {
          id: `sub-${subscriptions.length + 1}`,
          siteId: SITE_ID,
          readerId: data.readerId ?? '',
          planId: data.planId ?? null,
          status: data.status ?? 'active',
          currentPeriodEnd: data.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: false,
        };
        subscriptions.push(row);
        return row;
      },
    },
    membershipPlan: {
      findFirst: async ({ where }: { where: { id: string; status?: string } }) =>
        plans.find(
          (row) => row.id === where.id && (!where.status || row.status === where.status),
        ) ?? null,
      findMany: async () => plans.filter((row) => row.status === 'active'),
    },
    site: {
      findUnique: async () => ({
        id: SITE_ID,
        subdomain: 'baandoi',
        settings: {},
        domains: [],
      }),
    },
  };

  const db = {
    forSite: async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx),
  } as unknown as PrismaService;

  const passwords = {
    hash: async (plain: string) => `hashed:${plain}`,
    verify: async (plain: string, hashed: string) => hashed === `hashed:${plain}`,
  } as unknown as PasswordService;

  const features = {
    isEnabled: async () => options.enabled ?? true,
  } as unknown as FeaturesService;

  return {
    service: new ReaderService(db, passwords, { sendForSite: send } as unknown as EmailService, features),
    readers,
    subscriptions,
    plans,
    send,
  };
};

const registration = {
  email: 'reader@example.com',
  password: 'a-good-password',
};

beforeEach(() => {
  vi.stubEnv('READER_SECRET', 'a-test-secret-at-least-16-chars');
  vi.stubEnv('PUBLIC_ROOT_DOMAIN', 'example.com');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ReaderService', () => {
  it('creates an account, welcomes it and signs the reader in', async () => {
    const all = harness();
    const session = await all.service.register(SITE_ID, registration);

    expect(session.reader.email).toBe('reader@example.com');
    expect(session.reader.subscription).toBeNull();
    expect(session.token.split('.')).toHaveLength(2);
    expect(all.send).toHaveBeenCalledWith(
      SITE_ID,
      expect.objectContaining({ to: 'reader@example.com' }),
    );
  });

  it('refuses a second account on the same address', async () => {
    const all = harness();
    await all.service.register(SITE_ID, registration);
    await expect(all.service.register(SITE_ID, registration)).rejects.toThrow(/มีบัญชีอยู่แล้ว/);
  });

  it('refuses to sell memberships while the site has the feature off', async () => {
    const all = harness({ enabled: false });
    await expect(all.service.register(SITE_ID, registration)).rejects.toThrow(/ไม่พบหน้านี้/);
  });

  it('signs in with the right password and refuses the wrong one', async () => {
    const all = harness();
    await all.service.register(SITE_ID, registration);

    const session = await all.service.login(SITE_ID, registration);
    expect(session.reader.email).toBe('reader@example.com');

    await expect(
      all.service.login(SITE_ID, { email: registration.email, password: 'wrong-password' }),
    ).rejects.toThrow(/อีเมลหรือรหัสผ่านไม่ถูกต้อง/);
  });

  it('treats an unknown address as having no membership', async () => {
    const all = harness();
    expect(await all.service.entitled(SITE_ID, READER_ID)).toBe(false);
  });

  it('counts an active paid period and ignores a lapsed one', async () => {
    const all = harness();
    await all.service.register(SITE_ID, registration);
    all.subscriptions.push({
      id: 'sub-1',
      siteId: SITE_ID,
      readerId: READER_ID,
      planId: PLAN_ID,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      cancelAtPeriodEnd: false,
    });
    expect(await all.service.entitled(SITE_ID, READER_ID)).toBe(true);

    all.subscriptions[0]!.currentPeriodEnd = new Date(Date.now() - 86_400_000);
    expect(await all.service.entitled(SITE_ID, READER_ID)).toBe(false);
  });

  it('grants a free plan without sending the reader to Stripe', async () => {
    const all = harness();
    all.plans[0]!.price = 0;
    await all.service.register(SITE_ID, registration);

    const checkout = await all.service.checkout(SITE_ID, READER_ID, PLAN_ID);
    expect(checkout).toBeNull();
    expect(all.subscriptions).toHaveLength(1);
    expect(await all.service.entitled(SITE_ID, READER_ID)).toBe(true);
  });

  it('answers "sent" for an unknown address instead of revealing it', async () => {
    const all = harness();
    await expect(
      all.service.forgotPassword(SITE_ID, { email: 'nobody@example.com' }),
    ).resolves.toBeUndefined();
    expect(all.send).not.toHaveBeenCalled();
  });

  it('rejects a reset token that has already expired', async () => {
    const all = harness();
    await all.service.register(SITE_ID, registration);
    all.readers[0]!.resetTokenHash = 'stale';
    all.readers[0]!.resetExpiresAt = new Date(Date.now() - 1000);

    await expect(
      all.service.resetPassword(SITE_ID, { token: 'x'.repeat(32), password: 'another-password' }),
    ).rejects.toThrow(/หมดอายุ/);
  });
});
