import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  bankCredentialsReady,
  bankSettingsSchema,
  bblGatewayReady,
  bblTransferQuerySchema,
  isOrderStatus,
  maskAccountNumber,
  readBankSettings,
  updateBankSettingsInputSchema,
  type BankConnection,
  type BankMode,
  type BankSettings,
  type BblTransferList,
  type BblTransferQuery,
  type OrderStatus,
  type SlipVerification,
  type UpdateBankSettingsInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { encryptSecret } from '../../common/secret-box';
import { PrismaService } from '../prisma/prisma.service';
import { bblConfigForSite } from './bbl-settings';
import { checkBblConnection, lookupBblTransfers, verifyBblTransfer } from './bbl';

const DAY_MS = 24 * 60 * 60 * 1000;

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const orderStatusOf = (value: string): OrderStatus => (isOrderStatus(value) ? value : 'pending');

/** Explicit pick, because `??` would turn `accountNumber: null` into the old value. */
const pick = <T>(next: T | undefined, current: T): T => (next === undefined ? current : next);

const modeFor = (
  settings: Pick<BankSettings, 'clientId' | 'clientSecret' | 'sandbox'>,
): BankMode => {
  if (!bankCredentialsReady(settings)) return 'not_configured';
  return settings.sandbox ? 'sandbox' : 'live';
};

/**
 * Links one shop to its Bangkok Bank receiving account and uses the bank's API
 * as the source of truth for transfers (docs/design/03-scope.md 3.3).
 *
 * The owner enters the Client ID/Secret their bank issued on the commerce
 * settings screen; the secret is encrypted on the way in and never returned.
 * Everything lives in `sites.settings.banking`, so no migration is needed and the
 * tenant boundary stays the one every other query already uses.
 */
@Injectable()
export class BankingService {
  constructor(private readonly db: PrismaService) {}

  async connection(siteId: string): Promise<BankConnection> {
    return this.connectionFor(await this.settingsFor(siteId));
  }

  async updateSettings(
    siteId: string,
    input: UpdateBankSettingsInput,
    actorId: string,
  ): Promise<BankConnection> {
    const parsed = updateBankSettingsInputSchema.parse(input);

    const next = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { settings: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const settings = asRecord(site.settings);
      const current = readBankSettings(settings.banking);

      const clientId = pick(parsed.clientId, current.clientId).trim();
      const clientSecret =
        parsed.clientSecret !== undefined && parsed.clientSecret.length > 0
          ? encryptSecret(parsed.clientSecret)
          : current.clientSecret;
      const apiKey =
        parsed.apiKey === undefined
          ? current.apiKey
          : parsed.apiKey === null || parsed.apiKey.length === 0
            ? ''
            : encryptSecret(parsed.apiKey);
      const webhookSecret =
        parsed.webhookSecret !== undefined && parsed.webhookSecret.length > 0
          ? encryptSecret(parsed.webhookSecret)
          : current.webhookSecret;
      const baseUrl = pick(parsed.baseUrl, current.baseUrl).trim();
      const sandbox = pick(parsed.sandbox, current.sandbox);
      const accountNumber = pick(parsed.accountNumber, current.accountNumber);

      const linking = accountNumber !== null && accountNumber !== current.accountNumber;
      if (linking && (clientId.length === 0 || clientSecret.length === 0)) {
        throw ApiException.validation(
          'กรอก Client ID และ Client Secret ของธนาคารกรุงเทพก่อนผูกบัญชีรับเงิน',
        );
      }

      const credentialsChanged =
        clientId !== current.clientId ||
        clientSecret !== current.clientSecret ||
        apiKey !== current.apiKey ||
        baseUrl !== current.baseUrl ||
        sandbox !== current.sandbox;
      const unlinked = accountNumber === null;

      const saved = bankSettingsSchema.parse({
        provider: 'bbl',
        accountNumber,
        accountName: pick(parsed.accountName, current.accountName),
        autoVerifySlips: pick(parsed.autoVerifySlips, current.autoVerifySlips),
        clientId,
        clientSecret,
        apiKey,
        webhookSecret,
        baseUrl,
        sandbox,
        connectedAt: linking ? new Date().toISOString() : unlinked ? null : current.connectedAt,
        connectedBy: linking ? actorId : unlinked ? null : current.connectedBy,
        lastCheckedAt: linking || unlinked || credentialsChanged ? null : current.lastCheckedAt,
      });

      await tx.site.update({
        where: { id: siteId },
        data: { settings: asJson({ ...settings, banking: saved }) },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'banking.settings.update',
          target: siteId,
          meta: {
            provider: 'bbl',
            accountNumber: saved.accountNumber ? maskAccountNumber(saved.accountNumber) : null,
            autoVerifySlips: saved.autoVerifySlips,
            mode: modeFor(saved),
            baseUrl: saved.baseUrl,
            sandbox: saved.sandbox,
          },
        },
      });

      return saved;
    });

    return this.connectionFor(next);
  }

  /** Asks BBL for a token, so a wrong secret fails here instead of at checkout. */
  async testConnection(siteId: string, actorId: string): Promise<BankConnection> {
    const current = await this.settingsFor(siteId);
    const mode = await checkBblConnection(
      globalThis.fetch.bind(globalThis),
      bblConfigForSite(current),
    );
    const checkedAt = new Date().toISOString();

    const saved: BankSettings = { ...current, lastCheckedAt: checkedAt };
    await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { settings: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      await tx.site.update({
        where: { id: siteId },
        data: { settings: asJson({ ...asRecord(site.settings), banking: saved }) },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'banking.test',
          target: siteId,
          meta: { provider: 'bbl', mode },
        },
      });
    });

    return this.connectionFor(saved);
  }

  /** Recent incoming transfers, for matching an order the bank never confirmed. */
  async transfers(siteId: string, query: BblTransferQuery): Promise<BblTransferList> {
    const parsed = bblTransferQuerySchema.parse(query);
    const settings = await this.settingsFor(siteId);
    if (!settings.accountNumber) {
      throw ApiException.conflict('ยังไม่ได้ผูกบัญชีธนาคารกรุงเทพของร้านนี้');
    }

    const now = new Date();
    const items = await lookupBblTransfers(
      globalThis.fetch.bind(globalThis),
      {
        accountNumber: settings.accountNumber,
        from: parsed.from ? new Date(parsed.from) : new Date(now.getTime() - DAY_MS),
        to: parsed.to ? new Date(parsed.to) : now,
        limit: parsed.limit,
      },
      bblConfigForSite(settings),
    );

    return {
      provider: 'bbl',
      accountNumber: maskAccountNumber(settings.accountNumber),
      items,
    };
  }

  /**
   * Re-checks one order's slip with the bank. A verified transfer confirms the
   * order immediately; anything else is only audited, so the shop can still
   * reject the slip or confirm it by hand (that decision is undoable later).
   */
  async verifySlip(siteId: string, orderId: string, actorId: string): Promise<SlipVerification> {
    const settings = await this.settingsFor(siteId);
    if (!settings.accountNumber) {
      throw ApiException.conflict('ยังไม่ได้ผูกบัญชีธนาคารกรุงเทพของร้านนี้');
    }

    const order = await this.db.forSite(siteId, (tx) =>
      tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
    );
    if (!order) throw ApiException.notFound('ไม่พบคำสั่งซื้อนี้');
    const slip = order.slips[0];
    if (!slip) throw ApiException.notFound('ยังไม่มีสลิปของคำสั่งซื้อนี้');

    const verification = await verifyBblTransfer(
      globalThis.fetch.bind(globalThis),
      {
        accountNumber: settings.accountNumber,
        reference: slip.reference,
        amount: order.total,
      },
      bblConfigForSite(settings),
    );

    const confirms = verification.status === 'verified' && order.status === 'pending';
    if (confirms) {
      await this.db.forSite(siteId, async (tx) => {
        await tx.paymentSlip.update({
          where: { id: slip.id },
          data: {
            status: 'verified',
            note: verification.message,
            reviewedBy: actorId,
            reviewedAt: new Date(),
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'paid', paidAt: order.paidAt ?? new Date() },
        });
        await tx.auditLog.create({
          data: {
            siteId,
            userId: actorId,
            action: 'order.status',
            target: order.id,
            meta: {
              from: 'pending',
              to: 'paid',
              reason: 'bbl_api_verified',
              reference: slip.reference,
            },
          },
        });
      });
    } else {
      await this.db.forSite(siteId, (tx) =>
        tx.auditLog.create({
          data: {
            siteId,
            userId: actorId,
            action: 'banking.slip.verify',
            target: order.id,
            meta: {
              provider: 'bbl',
              result: verification.status,
              reference: slip.reference,
              amount: order.total,
            },
          },
        }),
      );
    }

    return {
      orderId: order.id,
      slipId: slip.id,
      orderStatus: confirms ? 'paid' : orderStatusOf(order.status),
      ...verification,
    };
  }

  /** Public so the gateway callback can read the shop secret before verifying. */
  async settingsFor(siteId: string): Promise<BankSettings> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return readBankSettings(asRecord(site.settings).banking);
  }

  private connectionFor(settings: BankSettings): BankConnection {
    const mode = modeFor(settings);
    const credentials = bankCredentialsReady(settings);
    const connected = bblGatewayReady(settings);

    const message = connected
      ? 'เชื่อมต่อ Payment Gateway ของธนาคารกรุงเทพแล้ว ลูกค้าจ่ายเงินผ่านธนาคารได้'
      : credentials
        ? 'กรอก Client ID และ Client Secret แล้ว แต่ยังขาด Webhook Secret สำหรับยืนยันการชำระเงิน'
        : 'ยังไม่ได้เชื่อมต่อ Payment Gateway ของธนาคารกรุงเทพ';

    return {
      provider: 'bbl',
      connected,
      mode,
      accountNumber: settings.accountNumber ? maskAccountNumber(settings.accountNumber) : null,
      accountName: settings.accountName,
      autoVerifySlips: settings.autoVerifySlips,
      clientId: settings.clientId,
      hasClientSecret: settings.clientSecret.length > 0,
      hasWebhookSecret: settings.webhookSecret.length > 0,
      apiKeySet: settings.apiKey.length > 0,
      baseUrl: settings.baseUrl,
      sandbox: settings.sandbox,
      connectedAt: settings.connectedAt,
      lastCheckedAt: settings.lastCheckedAt,
      message,
    };
  }
}
