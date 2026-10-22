import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { decryptSecret } from '../../common/secret-box';
import { CommerceService } from '../commerce/commerce.service';
import { PrismaService } from '../prisma/prisma.service';
import { BankingService } from './banking.service';
import { verifyBblWebhook } from './bbl-gateway';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BblWebhookResult {
  received: true;
  /** Null when the payment id does not belong to any order. */
  orderNumber: string | null;
  paid: boolean;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * Turns a signed BBL callback into an order status (docs/design/03-scope.md 3.3).
 * The site id inside the payload only selects which shop secret to verify with;
 * nothing is trusted until the HMAC matches. The amount is checked against the
 * stored order, so the bank page can never charge less than the order total.
 */
@Injectable()
export class BblGatewayService {
  constructor(
    private readonly db: PrismaService,
    private readonly banking: BankingService,
    private readonly commerce: CommerceService,
  ) {}

  async handleWebhook(payload: Buffer, signature: string | undefined): Promise<BblWebhookResult> {
    const siteId = this.siteIdOf(payload);
    const settings = await this.banking.settingsFor(siteId);
    if (settings.webhookSecret.length === 0) {
      throw ApiException.conflict(
        'ร้านนี้ยังไม่ได้ตั้งค่า Webhook Secret ของธนาคารกรุงเทพ จึงยืนยันการชำระเงินไม่ได้',
      );
    }

    const event = verifyBblWebhook(payload, signature, decryptSecret(settings.webhookSecret));

    const order = await this.db.forSite(siteId, (tx) =>
      tx.order.findFirst({
        where: { provider: 'bbl', providerRef: event.paymentId },
        select: { id: true, number: true, status: true, total: true, paymentMethod: true },
      }),
    );

    if (!order) {
      await this.audit(siteId, event.paymentId, {
        provider: 'bbl',
        status: event.status,
        result: 'unknown_payment',
      });
      return { received: true, orderNumber: null, paid: false };
    }

    const amountMatches = event.amount === order.total;
    const paid = event.status === 'paid' && amountMatches && order.paymentMethod === 'bbl';
    if (paid && order.status === 'pending') {
      await this.commerce.markOrderPaidByNumber(siteId, order.number, event.paymentId);
    }

    await this.audit(siteId, order.id, {
      provider: 'bbl',
      status: event.status,
      amount: event.amount,
      amountMatches,
      transactionId: event.transactionId ?? null,
    });

    return { received: true, orderNumber: order.number, paid };
  }

  /** The payload is parsed only to find the shop; the signature is checked next. */
  private siteIdOf(payload: Buffer): string {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.toString());
    } catch {
      throw ApiException.validation('เนื้อหาการแจ้งเตือนอ่านไม่ได้');
    }
    const siteId = asRecord(parsed).siteId;
    if (typeof siteId !== 'string' || !UUID_PATTERN.test(siteId)) {
      throw ApiException.validation('การแจ้งเตือนไม่ได้ระบุเว็บที่ต้องการ');
    }
    return siteId;
  }

  private async audit(
    siteId: string,
    target: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    await this.db.forSite(siteId, (tx) =>
      tx.auditLog.create({
        data: {
          siteId,
          action: 'order.payment.webhook',
          target,
          meta: meta as Prisma.InputJsonValue,
        },
      }),
    );
  }
}
