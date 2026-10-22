import { existsSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { formatBaht, type ReceiptInput } from '@lumio/shared';

/**
 * Renders the same receipt the HTML page shows, as a downloadable PDF. The
 * Thai font ships with the API so the document does not depend on a font being
 * installed on the server, and no headless browser is needed.
 */

const FONT_CANDIDATES = [
  join(process.cwd(), 'assets', 'fonts', 'NotoSansThai.ttf'),
  join(process.cwd(), '..', '..', 'apps', 'api', 'assets', 'fonts', 'NotoSansThai.ttf'),
  join(__dirname, '..', '..', '..', 'assets', 'fonts', 'NotoSansThai.ttf'),
];

const fontPath = (): string => {
  const found = FONT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('ไม่พบฟอนต์สำหรับใบเสร็จ (assets/fonts/NotoSansThai.ttf)');
  return found;
};

const thaiDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(date);
};

const statusText = (input: ReceiptInput): string => {
  if (input.status === 'pending' && input.paymentMethod !== 'cod')
    return 'รอชำระเงิน (ใบเสร็จชั่วคราว)';
  return (
    {
      pending: 'รอชำระเงิน',
      paid: 'ชำระเงินแล้ว',
      shipped: 'จัดส่งแล้ว',
      completed: 'สำเร็จ',
      cancelled: 'ยกเลิก',
      refunded: 'คืนเงินแล้ว',
    } as const
  )[input.status];
};

const methodText = (input: ReceiptInput): string =>
  (
    ({
      promptpay: 'พร้อมเพย์',
      cod: 'เก็บเงินปลายทาง',
      card: 'บัตรเครดิต/เดบิต',
      bbl: 'ธนาคารกรุงเทพ',
    }) as const
  )[input.paymentMethod];

const addressOf = (input: ReceiptInput): string =>
  [
    input.customer.address,
    input.customer.subdistrict,
    input.customer.district,
    input.customer.province,
    input.customer.postcode,
  ]
    .filter((part) => part.trim().length > 0)
    .join(' ');

export const renderReceiptPdf = (input: ReceiptInput): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        info: { Title: `ใบเสร็จ ${input.orderNumber}` },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.registerFont('thai', fontPath());
      doc.font('thai');
      doc.fontSize(20).text(input.siteName, { continued: false });
      doc.fontSize(9).fillColor('#6b7280').text(input.siteUrl);
      doc.moveDown(0.4);
      doc.fillColor('#111827').fontSize(16).text('ใบเสร็จรับเงิน', { align: 'right' });
      doc
        .fontSize(9)
        .fillColor('#374151')
        .text(`เลขที่ ${input.orderNumber}`, { align: 'right' })
        .text(thaiDate(input.issuedAt), { align: 'right' })
        .text(`สถานะ: ${statusText(input)}`, { align: 'right' });
      doc.moveDown(0.8);

      doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor('#111827').lineWidth(1.2).stroke();
      doc.moveDown(0.8);

      const left = 48;
      const right = 290;
      const top = doc.y;
      doc.fontSize(10).fillColor('#6b7280').text('ผู้ซื้อ / ที่อยู่จัดส่ง', left, top);
      doc
        .fontSize(10)
        .fillColor('#111827')
        .text(input.customer.name, left, top + 16);
      doc.text(input.customer.phone, left, top + 32);
      doc.text(addressOf(input), left, top + 48, { width: 220 });

      doc.fontSize(10).fillColor('#6b7280').text('การชำระเงิน', right, top);
      doc.fillColor('#111827').text(`วิธีชำระ: ${methodText(input)}`, right, top + 16);
      doc.text(
        input.paidAt ? `ชำระเมื่อ ${thaiDate(input.paidAt)}` : 'ยังไม่ชำระเงิน',
        right,
        top + 32,
      );
      if (input.trackingNumber) doc.text(`เลขพัสดุ ${input.trackingNumber}`, right, top + 48);

      doc.y = top + 96;
      doc.moveDown(0.4);

      const columns = { item: 48, qty: 330, unit: 390, total: 470 };
      const headerY = doc.y;
      doc.fontSize(9).fillColor('#6b7280');
      doc.text('รายการ', columns.item, headerY);
      doc.text('จำนวน', columns.qty, headerY, { width: 50, align: 'right' });
      doc.text('ราคา/หน่วย', columns.unit, headerY, { width: 70, align: 'right' });
      doc.text('รวม', columns.total, headerY, { width: 77, align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor('#d1d5db').lineWidth(0.6).stroke();
      doc.moveDown(0.4);

      for (const item of input.items) {
        const rowY = doc.y;
        doc.fontSize(10).fillColor('#111827');
        doc.text(item.title, columns.item, rowY, { width: 260 });
        if (item.variantLabel) {
          doc
            .fontSize(8)
            .fillColor('#6b7280')
            .text(item.variantLabel, columns.item, doc.y, { width: 260 });
        }
        const afterItem = doc.y;
        doc.fontSize(10).fillColor('#111827');
        doc.text(String(item.quantity), columns.qty, rowY, { width: 50, align: 'right' });
        doc.text(formatBaht(item.unitPrice), columns.unit, rowY, { width: 70, align: 'right' });
        doc.text(formatBaht(item.lineTotal), columns.total, rowY, { width: 77, align: 'right' });
        doc.y = Math.max(afterItem, rowY + 14);
        doc.moveDown(0.35);
      }

      doc.moveDown(0.4);
      const totalsY = doc.y;
      doc.fontSize(10).fillColor('#374151');
      doc.text('ยอดสินค้า', 330, totalsY, { width: 120, align: 'right' });
      doc.text(`${formatBaht(input.subtotal)} ${input.currency}`, 455, totalsY, {
        width: 92,
        align: 'right',
      });
      doc.text('ค่าจัดส่ง', 330, totalsY + 16, { width: 120, align: 'right' });
      doc.text(
        input.shippingFee === 0 ? 'ฟรี' : `${formatBaht(input.shippingFee)} ${input.currency}`,
        455,
        totalsY + 16,
        { width: 92, align: 'right' },
      );
      doc.fontSize(13).fillColor('#111827');
      doc.text('รวมทั้งสิ้น', 330, totalsY + 38, { width: 120, align: 'right' });
      doc.text(`${formatBaht(input.total)} ${input.currency}`, 455, totalsY + 38, {
        width: 92,
        align: 'right',
      });
      doc
        .moveTo(330, totalsY + 34)
        .lineTo(547, totalsY + 34)
        .strokeColor('#111827')
        .lineWidth(1)
        .stroke();

      doc.y = totalsY + 80;
      if (input.note) {
        doc.fontSize(9).fillColor('#6b7280').text(`หมายเหตุ: ${input.note}`);
      }
      doc
        .fontSize(8)
        .fillColor('#6b7280')
        .text(`เอกสารนี้ออกโดยระบบ Lumio · ${input.siteName}`, 48, 780, { width: 499 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
