import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  isSubscriptionActive,
  periodEndFor,
  type MembershipCheckout,
  type MembershipInterval,
  type ReaderForgotPasswordInput,
  type ReaderLoginInput,
  type ReaderRegisterInput,
  type ReaderResetPasswordInput,
  type ReaderSession,
  type ReaderSessionResponse,
  type ReaderSubscriptionView,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { signReaderToken } from '../../common/reader-token';
import { publicSiteUrl } from '../commerce/order-notifier';
import { EmailService } from '../email/email.service';
import { FeaturesService } from '../features/features.service';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { createReaderCheckoutSession } from './stripe-membership';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const newToken = (): string => randomBytes(32).toString('base64url');

/** A subscription row plus its plan, as the renderer and admin screens show it. */
export interface SubscriptionWithPlan {
  id: string;
  planId: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  plan: { id: string; name: string; interval: string; price: number } | null;
}

const subscriptionView = (
  subscription: SubscriptionWithPlan | null,
): ReaderSubscriptionView | null => {
  if (!subscription) return null;
  const interval =
    subscription.plan?.interval === 'year'
      ? 'year'
      : subscription.plan?.interval === 'month'
        ? 'month'
        : null;
  return {
    planId: subscription.planId,
    planName: subscription.plan?.name ?? null,
    interval,
    status:
      subscription.status === 'past_due' ||
      subscription.status === 'cancelled' ||
      subscription.status === 'expired'
        ? subscription.status
        : 'active',
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
};

/**
 * Reader accounts of one site (docs/PROGRESS.md batch A). Passwords are hashed
 * with the same Argon2 parameters as team accounts, and a reader session is a
 * signed token that names only that reader, so it can never open the admin.
 */
@Injectable()
export class ReaderService {
  private readonly logger = new Logger(ReaderService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly passwords: PasswordService,
    private readonly email: EmailService,
    private readonly features: FeaturesService,
  ) {}

  /** Memberships are a paid capability: an unlicensed site has no such pages. */
  async requireFeature(siteId: string): Promise<void> {
    if (!(await this.features.isEnabled(siteId, 'membership'))) {
      throw ApiException.notFound('ไม่พบหน้านี้');
    }
  }

  async register(siteId: string, input: ReaderRegisterInput): Promise<ReaderSessionResponse> {
    await this.requireFeature(siteId);
    if ((input.honeypot ?? '').trim().length > 0) {
      throw ApiException.validation('สมัครไม่สำเร็จ กรุณาลองอีกครั้ง');
    }

    const passwordHash = await this.passwords.hash(input.password);
    const verifyToken = newToken();
    const reader = await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.reader.findUnique({
        where: { siteId_email: { siteId, email: input.email } },
        select: { id: true },
      });
      if (existing) {
        throw ApiException.conflict('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ');
      }
      return tx.reader.create({
        data: {
          siteId,
          email: input.email,
          name: input.name?.trim() || null,
          passwordHash,
          verifyTokenHash: hashToken(verifyToken),
          verifyExpiresAt: new Date(Date.now() + VERIFY_TTL_MS),
        },
      });
    });

    await this.sendVerification(siteId, reader.email, verifyToken);
    return this.sessionResponse(siteId, reader.id, reader.email, reader.name, false);
  }

  async login(siteId: string, input: ReaderLoginInput): Promise<ReaderSessionResponse> {
    const reader = await this.db.forSite(siteId, (tx) =>
      tx.reader.findUnique({ where: { siteId_email: { siteId, email: input.email } } }),
    );
    const ok = reader ? await this.passwords.verify(input.password, reader.passwordHash) : false;
    if (!reader || !ok) {
      throw ApiException.unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    return this.sessionResponse(siteId, reader.id, reader.email, reader.name, !!reader.verifiedAt);
  }

  /** Confirms the address in the welcome email; the token is single use. */
  async verifyEmail(siteId: string, token: string): Promise<ReaderSession> {
    const hash = hashToken(token);
    const reader = await this.db.forSite(siteId, async (tx) => {
      const found = await tx.reader.findFirst({
        where: { verifyTokenHash: hash, verifyExpiresAt: { gt: new Date() } },
      });
      if (!found) return null;
      return tx.reader.update({
        where: { id: found.id },
        data: { verifiedAt: new Date(), verifyTokenHash: null, verifyExpiresAt: null },
      });
    });
    if (!reader) {
      throw ApiException.validation('ลิงก์ยืนยันอีเมลหมดอายุหรือไม่ถูกต้อง');
    }
    return this.profile(siteId, reader.id);
  }

  /**
   * Always answers the same way: whether an address has an account must not be
   * discoverable by trying it (docs/design/15-security.md).
   */
  async forgotPassword(siteId: string, input: ReaderForgotPasswordInput): Promise<void> {
    await this.requireFeature(siteId);

    const token = newToken();
    const reader = await this.db.forSite(siteId, async (tx) => {
      const found = await tx.reader.findUnique({
        where: { siteId_email: { siteId, email: input.email } },
      });
      if (!found) return null;
      return tx.reader.update({
        where: { id: found.id },
        data: {
          resetTokenHash: hashToken(token),
          resetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      });
    });

    if (!reader) return;

    const url = await this.siteUrl(siteId);
    await this.email.sendForSite(siteId, {
      to: reader.email,
      subject: 'ตั้งรหัสผ่านใหม่',
      text: [
        'มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีนี้',
        '',
        `เปิดลิงก์นี้ภายใน 1 ชั่วโมง: ${url}/membership/reset?token=${token}`,
        '',
        'ถ้าคุณไม่ได้ขอเอง ไม่ต้องทำอะไร ลิงก์จะหมดอายุเอง',
      ].join('\n'),
    });
  }

  async resetPassword(siteId: string, input: ReaderResetPasswordInput): Promise<void> {
    const hash = hashToken(input.token);
    const passwordHash = await this.passwords.hash(input.password);

    const updated = await this.db.forSite(siteId, async (tx) => {
      const found = await tx.reader.findFirst({
        where: { resetTokenHash: hash, resetExpiresAt: { gt: new Date() } },
        select: { id: true },
      });
      if (!found) return false;
      await tx.reader.update({
        where: { id: found.id },
        data: { passwordHash, resetTokenHash: null, resetExpiresAt: null },
      });
      return true;
    });

    if (!updated) {
      throw ApiException.validation('ลิงก์ตั้งรหัสผ่านหมดอายุหรือไม่ถูกต้อง');
    }
  }

  /** Current reader plus their subscription, for the site's account area. */
  async profile(siteId: string, readerId: string): Promise<ReaderSession> {
    const reader = await this.db.forSite(siteId, (tx) =>
      tx.reader.findUnique({ where: { id: readerId } }),
    );
    if (!reader || reader.siteId !== siteId) {
      throw ApiException.unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    const subscription = await this.currentSubscription(siteId, readerId);
    return {
      id: reader.id,
      email: reader.email,
      name: reader.name,
      emailVerified: !!reader.verifiedAt,
      subscription: subscriptionView(subscription),
    };
  }

  /** True while the reader holds a live paid period (fails closed). */
  async entitled(siteId: string, readerId: string): Promise<boolean> {
    const subscription = await this.currentSubscription(siteId, readerId);
    return isSubscriptionActive(subscription);
  }

  /**
   * Starts a Stripe subscription for one plan. A free plan needs no payment
   * page, so it is granted straight away.
   */
  async checkout(
    siteId: string,
    readerId: string,
    planId: string,
  ): Promise<MembershipCheckout | null> {
    await this.requireFeature(siteId);

    const plan = await this.db.forSite(siteId, (tx) =>
      tx.membershipPlan.findFirst({ where: { id: planId, siteId, status: 'active' } }),
    );
    if (!plan) throw ApiException.notFound('ไม่พบแพ็กเกจนี้');

    if (plan.price <= 0) {
      await this.grantFreePlan(siteId, readerId, plan);
      return null;
    }

    const reader = await this.db.forSite(siteId, (tx) =>
      tx.reader.findUnique({ where: { id: readerId }, select: { email: true } }),
    );
    if (!reader) throw ApiException.unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');

    const interval: MembershipInterval = plan.interval === 'year' ? 'year' : 'month';
    const session = await createReaderCheckoutSession(fetch, {
      siteId,
      readerId,
      planId: plan.id,
      planName: plan.name,
      interval,
      price: plan.price,
      currency: plan.currency,
      siteUrl: await this.siteUrl(siteId),
      email: reader.email,
    });
    return { url: session.url };
  }

  private async grantFreePlan(
    siteId: string,
    readerId: string,
    plan: { id: string; interval: string },
  ): Promise<void> {
    const interval: MembershipInterval = plan.interval === 'year' ? 'year' : 'month';
    await this.db.forSite(siteId, (tx) =>
      tx.readerSubscription.create({
        data: {
          siteId,
          readerId,
          planId: plan.id,
          status: 'active',
          currentPeriodEnd: periodEndFor(interval),
        },
      }),
    );
  }

  private async currentSubscription(
    siteId: string,
    readerId: string,
  ): Promise<SubscriptionWithPlan | null> {
    const subscription = await this.db.forSite(siteId, (tx) =>
      tx.readerSubscription.findFirst({
        where: { readerId },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { id: true, name: true, interval: true, price: true } } },
      }),
    );
    if (!subscription) return null;
    return {
      id: subscription.id,
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      plan: subscription.plan,
    };
  }

  private async sessionResponse(
    siteId: string,
    readerId: string,
    email: string,
    name: string | null,
    emailVerified: boolean,
  ): Promise<ReaderSessionResponse> {
    const { token } = signReaderToken(readerId, siteId);
    const subscription = await this.currentSubscription(siteId, readerId);
    return {
      token,
      reader: {
        id: readerId,
        email,
        name,
        emailVerified,
        subscription: subscriptionView(subscription),
      },
    };
  }

  private async sendVerification(siteId: string, email: string, token: string): Promise<void> {
    try {
      const url = await this.siteUrl(siteId);
      await this.email.sendForSite(siteId, {
        to: email,
        subject: 'ยืนยันอีเมลของคุณ',
        text: [
          'ขอบคุณที่สมัครสมาชิก',
          '',
          `ยืนยันอีเมลได้ที่: ${url}/membership/verify?token=${token}`,
          '',
          'ลิงก์นี้ใช้ได้ภายใน 24 ชั่วโมง',
        ].join('\n'),
      });
    } catch (error) {
      // A mail outage must not lose a freshly created account.
      this.logger.warn(`ส่งอีเมลยืนยันไม่สำเร็จ: ${String(error)}`);
    }
  }

  /** Public origin of a site, from its verified domain or its free subdomain. */
  private async siteUrl(siteId: string): Promise<string> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, include: { domains: true } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return publicSiteUrl(site);
  }
}
