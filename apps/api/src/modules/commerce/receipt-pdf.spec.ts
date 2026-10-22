import { describe, expect, it } from 'vitest';
import { renderReceiptHtml, type ReceiptInput } from '@lumio/shared';
import { renderReceiptPdf } from './receipt-pdf';

const receipt: ReceiptInput = {
  siteName: 'ร้านทดสอบ',
  siteUrl: 'https://shop.example.com',
  orderNumber: 'LM-261022-AB12',
  orderToken: 'token-1',
  issuedAt: '2026-10-22T03:00:00.000Z',
  status: 'paid',
  paymentMethod: 'promptpay',
  customer: {
    name: 'อรุณี ใจดี',
    phone: '0891234567',
    email: null,
    address: '128 นิมมาน',
    subdistrict: 'สุเทพ',
    district: 'เมือง',
    province: 'เชียงใหม่',
    postcode: '50200',
  },
  items: [
    { title: 'กาแฟคั่วกลาง', variantLabel: 'M · ดำ', quantity: 2, unitPrice: 35_000, lineTotal: 70_000 },
  ],
  subtotal: 70_000,
  shippingFee: 0,
  total: 70_000,
  currency: 'THB',
  trackingNumber: null,
  paidAt: '2026-10-22T04:00:00.000Z',
  note: 'ฝากส่งก่อนวันศุกร์',
};

describe('receipt', () => {
  it('renders printable HTML with the order and escaped customer text', () => {
    const html = renderReceiptHtml({
      ...receipt,
      customer: { ...receipt.customer, name: '<script>alert(1)</script>' },
    });

    expect(html).toContain('ใบเสร็จรับเงิน');
    expect(html).toContain('LM-261022-AB12');
    expect(html).toContain('M · ดำ');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('builds a PDF that starts with the PDF signature', async () => {
    const pdf = await renderReceiptPdf(receipt);

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1_000);
  });
});
