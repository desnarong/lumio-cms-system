import { Injectable } from '@nestjs/common';
import type { Order, OrderItem } from '@prisma/client';
import {
  formatBaht,
  orderCustomerSchema,
  readCommerceSettings,
  receiptFileName,
  receiptFromOrder,
  type CommerceSettings,
  type OrderStatus,
} from '@lumio/shared';
import { renderReceiptPdf } from './receipt-pdf';
import { Mailer } from '../../common/mailer';

export interface OrderNoticeContext {
  siteName: string;
  ownerEmail: string | null;
  publicUrl: string;
  settings: CommerceSettings;
  order: Order & { items: OrderItem[] };
}

const customerOf = (value: unknown) => {
  const parsed = orderCustomerSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const itemsText = (order: Order & { items: OrderItem[] }): string =>
  order.items
    .map(
      (item) =>
        `- ${item.title} × ${item.quantity} = ${formatBaht(item.price * item.quantity)} บาท`,
    )
    .join('\n');

const totalsText = (order: Order): string =>
  [
    `ยอดสินค้า ${formatBaht(order.subtotal)} บาท`,
    `ค่าจัดส่ง ${order.shippingFee === 0 ? 'ฟรี' : `${formatBaht(order.shippingFee)} บาท`}`,
    `รวมทั้งสิ้น ${formatBaht(order.total)} บาท`,
  ].join('\n');

const statusText: Record<OrderStatus, string> = {
  pending: 'รอชำระเงิน',
  paid: 'ชำระเงินแล้ว',
  shipped: 'จัดส่งแล้ว',
  completed: 'สำเร็จ',
  cancelled: 'ยกเลิก',
  refunded: 'คืนเงินแล้ว',
};

/**
 * Emails the shop owner and the buyer around an order. Every message is plain
 * text and never blocks the checkout: {@link Mailer} reports failures instead of
 * throwing, so a mail outage cannot lose an order that is already stored.
 */
@Injectable()
export class OrderNotifier {
  constructor(private readonly mailer: Mailer) {}

  async created(context: OrderNoticeContext): Promise<void> {
    const { order, siteName, ownerEmail, publicUrl, settings } = context;
    const customer = customerOf(order.customer);
    const link = `${publicUrl}/order/${order.token}`;

    const instructions =
      order.paymentMethod === 'promptpay' && readCommerceSettings(settings).promptPayId
        ? `กรุณาโอน ${formatBaht(order.total)} บาท ผ่านพร้อมเพย์ ${readCommerceSettings(settings).promptPayId} แล้วรอร้านยืนยันการชำระเงิน`
        : order.paymentMethod === 'card' || order.paymentMethod === 'bbl'
          ? order.paymentUrl
            ? `ชำระเงินได้ที่ ${order.paymentUrl}`
            : 'รอร้านติดต่อกลับเพื่อส่งลิงก์ชำระเงิน'
          : order.paymentMethod === 'cod'
            ? 'ชำระเงินกับขนส่งเมื่อได้รับสินค้า'
            : 'รอร้านติดต่อกลับเพื่อยืนยันการชำระเงิน';

    if (customer?.email) {
      await this.mailer.send({
        to: customer.email,
        subject: `ได้รับคำสั่งซื้อ ${order.number} — ${siteName}`,
        text: [
          `สวัสดีคุณ ${customer.name}`,
          '',
          `เราได้รับคำสั่งซื้อ ${order.number} ของคุณแล้ว`,
          '',
          itemsText(order),
          '',
          totalsText(order),
          '',
          instructions,
          '',
          `ดูสถานะคำสั่งซื้อ: ${link}`,
          `ร้าน: ${siteName}`,
        ].join('\n'),
      });
    }

    if (ownerEmail) {
      await this.mailer.send({
        to: ownerEmail,
        subject: `คำสั่งซื้อใหม่ ${order.number} — ${formatBaht(order.total)} บาท`,
        text: [
          `มีคำสั่งซื้อใหม่จาก ${siteName}`,
          '',
          `เลขที่: ${order.number}`,
          `สถานะ: ${statusText[isOrderStatus(order.status)]}`,
          `วิธีชำระเงิน: ${order.paymentMethod === 'cod' ? 'เก็บเงินปลายทาง' : 'พร้อมเพย์'}`,
          '',
          `ผู้รับ: ${customer?.name ?? '-'}`,
          `โทร: ${customer?.phone ?? '-'}`,
          `อีเมล: ${customer?.email ?? '-'}`,
          `ที่อยู่: ${[
            customer?.address,
            customer?.subdistrict,
            customer?.district,
            customer?.province,
            customer?.postcode,
          ]
            .filter(Boolean)
            .join(' ')}`,
          ...(order.note ? ['', `หมายเหตุ: ${order.note}`] : []),
          '',
          itemsText(order),
          '',
          totalsText(order),
          '',
          `เปิดในหน้าจัดการ: ${process.env.ADMIN_ORIGIN ?? 'http://localhost:49300'}/commerce/orders`,
        ].join('\n'),
      });
    }
  }

  /** Keeps the buyer informed when the owner moves the order forward. */
  async statusChanged(context: OrderNoticeContext, status: OrderStatus): Promise<void> {
    const customer = customerOf(context.order.customer);
    if (!customer?.email) return;
    if (status === 'pending') return;

    const link = `${context.publicUrl}/order/${context.order.token}`;
    // A paid order carries its receipt, so the buyer keeps proof without
    // remembering to download it from the site.
    const receipt = status === 'paid' ? await this.receiptAttachment(context) : null;
    const extra =
      status === 'shipped' && context.order.trackingNumber
        ? `เลขพัสดุ: ${context.order.trackingNumber}`
        : status === 'cancelled'
          ? 'หากชำระเงินแล้ว ร้านจะติดต่อกลับเพื่อคืนเงิน'
          : status === 'refunded'
            ? [
                `เราคืนเงิน ${formatBaht(context.order.refundedAmount)} บาท ให้คุณแล้ว`,
                ...(context.order.refundReason ? [`เหตุผล: ${context.order.refundReason}`] : []),
                'เงินอาจใช้เวลาถึง 7 วันทำการจึงจะปรากฏในบัญชี',
              ].join('\n')
            : status === 'completed'
              ? 'ขอบคุณที่อุดหนุนร้านของเรา'
              : '';

    await this.mailer.send({
      to: customer.email,
      subject: `คำสั่งซื้อ ${context.order.number}: ${statusText[status]} — ${context.siteName}`,
      text: [
        `สวัสดีคุณ ${customer.name}`,
        '',
        `คำสั่งซื้อ ${context.order.number} เปลี่ยนสถานะเป็น “${statusText[status]}”`,
        ...(extra ? ['', extra] : []),
        '',
        `ดูรายละเอียด: ${link}`,
        `ร้าน: ${context.siteName}`,
      ].join('\n'),
      ...(receipt ? { attachments: [receipt] } : {}),
    });
  }

  /** The PDF receipt, or null when it cannot be rendered; mail still goes out. */
  private async receiptAttachment(
    context: OrderNoticeContext,
  ): Promise<{ filename: string; content: Buffer; contentType: string } | null> {
    try {
      const input = receiptFromOrder(context.order, {
        name: context.siteName,
        url: context.publicUrl,
      });
      return {
        filename: receiptFileName(input.orderNumber),
        content: await renderReceiptPdf(input),
        contentType: 'application/pdf',
      };
    } catch {
      return null;
    }
  }
}

const isOrderStatus = (value: string): OrderStatus =>
  value === 'paid' || value === 'shipped' || value === 'completed' || value === 'cancelled'
    ? value
    : 'pending';

export const publicSiteUrl = (site: {
  subdomain: string;
  settings: unknown;
  domains?: { hostname: string; isPrimary: boolean; sslStatus: string }[];
}): string => {
  const primary = site.domains?.find((domain) => domain.isPrimary && domain.sslStatus === 'active');
  if (primary) return `https://${primary.hostname}`;
  const root = process.env.PUBLIC_ROOT_DOMAIN ?? 'example.com';
  return `https://${site.subdomain}.${root}`;
};
