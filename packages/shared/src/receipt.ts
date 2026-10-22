import {
  formatBaht,
  type OrderCustomer,
  type OrderStatus,
  type ShopPaymentMethod,
} from './commerce.js';

/**
 * Printable receipt for a paid shop order. The same data feeds the HTML page and
 * the PDF file, so the two can never disagree about an amount or an address.
 */

export interface ReceiptLine {
  title: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptInput {
  siteName: string;
  siteUrl: string;
  orderNumber: string;
  orderToken: string;
  issuedAt: string;
  status: OrderStatus;
  paymentMethod: ShopPaymentMethod;
  customer: OrderCustomer;
  items: ReceiptLine[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  trackingNumber: string | null;
  paidAt: string | null;
  note: string;
}

export interface ReceiptSourceItem {
  title: string;
  variantLabel: string | null;
  price: number;
  quantity: number;
}

export interface ReceiptSource {
  number: string;
  token: string;
  status: string;
  paymentMethod: string;
  customer: unknown;
  items: ReceiptSourceItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  trackingNumber: string | null;
  paidAt: Date | string | null;
  note: string;
  createdAt: Date | string;
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'รอชำระเงิน',
  paid: 'ชำระเงินแล้ว',
  shipped: 'จัดส่งแล้ว',
  completed: 'สำเร็จ',
  cancelled: 'ยกเลิก',
  refunded: 'คืนเงินแล้ว',
};

const methodLabels: Record<ShopPaymentMethod, string> = {
  promptpay: 'พร้อมเพย์',
  cod: 'เก็บเงินปลายทาง',
  card: 'บัตรเครดิต/เดบิต',
  bbl: 'ธนาคารกรุงเทพ',
};

const paymentLabels: Record<string, string> = {
  promptpay: 'พร้อมเพย์',
  cod: 'เก็บเงินปลายทาง',
  card: 'บัตรเครดิต/เดบิต',
  bbl: 'ธนาคารกรุงเทพ',
};

const customerOf = (value: unknown): OrderCustomer => {
  const record =
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const text = (key: string): string =>
    typeof record[key] === 'string' ? (record[key] as string) : '';
  return {
    name: text('name'),
    phone: text('phone'),
    email: null,
    address: text('address'),
    subdistrict: text('subdistrict'),
    district: text('district'),
    province: text('province'),
    postcode: text('postcode'),
  };
};

const isoDate = (value: Date | string | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const receiptFromOrder = (
  order: ReceiptSource,
  site: { name: string; url: string },
): ReceiptInput => {
  const status: OrderStatus =
    order.status === 'paid' ||
    order.status === 'shipped' ||
    order.status === 'completed' ||
    order.status === 'cancelled' ||
    order.status === 'refunded'
      ? order.status
      : 'pending';
  const method: ShopPaymentMethod =
    order.paymentMethod === 'cod' || order.paymentMethod === 'card'
      ? order.paymentMethod
      : 'promptpay';

  return {
    siteName: site.name,
    siteUrl: site.url,
    orderNumber: order.number,
    orderToken: order.token,
    issuedAt: isoDate(order.createdAt) ?? new Date(0).toISOString(),
    status,
    paymentMethod: method,
    customer: customerOf(order.customer),
    items: order.items.map((item) => ({
      title: item.title,
      variantLabel: item.variantLabel,
      quantity: item.quantity,
      unitPrice: item.price,
      lineTotal: item.price * item.quantity,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    currency: order.currency,
    trackingNumber: order.trackingNumber,
    paidAt: isoDate(order.paidAt),
    note: order.note,
  };
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const thaiDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(date);
};

const addressOf = (customer: OrderCustomer): string =>
  [customer.address, customer.subdistrict, customer.district, customer.province, customer.postcode]
    .filter((part) => part.trim().length > 0)
    .join(' ');

const statusLabel = (input: ReceiptInput): string =>
  input.status === 'pending' && input.paymentMethod !== 'cod'
    ? 'รอชำระเงิน (ใบเสร็จชั่วคราว)'
    : statusLabels[input.status];

/** Full standalone HTML document, safe to print or save as PDF from a browser. */
export const renderReceiptHtml = (
  input: ReceiptInput,
  options: { autoPrint?: boolean } = {},
): string => {
  const rows = input.items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.title)}${item.variantLabel ? `<br><span class="muted">${escapeHtml(item.variantLabel)}</span>` : ''}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatBaht(item.unitPrice)}</td>
        <td class="num">${formatBaht(item.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  const address = addressOf(input.customer);
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ใบเสร็จ ${escapeHtml(input.orderNumber)} · ${escapeHtml(input.siteName)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px; background: #f3f4f6; color: #111827;
    font-family: "Noto Sans Thai", "Sarabun", system-ui, -apple-system, sans-serif; }
  .receipt { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 16px;
    padding: 40px; box-shadow: 0 8px 30px rgba(15, 23, 42, .08); }
  header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start;
    border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 24px; }
  h1 { margin: 0; font-size: 26px; }
  .muted { color: #6b7280; font-size: 13px; }
  .meta { text-align: right; font-size: 13px; line-height: 1.7; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px;
    background: ${input.status === 'paid' || input.status === 'shipped' || input.status === 'completed' ? '#dcfce7' : '#fef3c7'};
    color: ${input.status === 'paid' || input.status === 'shipped' || input.status === 'completed' ? '#166534' : '#92400e'};
    font-weight: 600; }
  .party { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .party h2 { margin: 0 0 6px; font-size: 14px; color: #6b7280; font-weight: 600; }
  .party p { margin: 0 0 4px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
  th { font-size: 13px; color: #6b7280; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals { margin-left: auto; width: min(320px, 100%); }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #111827; margin-top: 6px; padding-top: 10px;
    font-size: 18px; font-weight: 700; }
  footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px; color: #6b7280; }
  .actions { max-width: 720px; margin: 0 auto 16px; display: flex; gap: 12px; justify-content: flex-end; }
  .actions a, .actions button { padding: 10px 18px; border-radius: 10px; border: 1px solid #111827;
    background: #111827; color: #fff; font: inherit; text-decoration: none; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .receipt { box-shadow: none; border-radius: 0;
    padding: 0; max-width: none; } .actions { display: none; } }
  @media (max-width: 560px) { .receipt { padding: 24px; } .party { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="actions">
  <a href="${escapeHtml(input.siteUrl)}/order/${encodeURIComponent(input.orderToken)}">กลับไปหน้าคำสั่งซื้อ</a>
  <button type="button" onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button>
</div>
<article class="receipt">
  <header>
    <div>
      <h1>${escapeHtml(input.siteName)}</h1>
      <p class="muted">${escapeHtml(input.siteUrl)}</p>
    </div>
    <div class="meta">
      <div><strong>ใบเสร็จรับเงิน</strong></div>
      <div>เลขที่ ${escapeHtml(input.orderNumber)}</div>
      <div>${escapeHtml(thaiDate(input.issuedAt))}</div>
      <div><span class="badge">${escapeHtml(statusLabel(input))}</span></div>
    </div>
  </header>

  <section class="party">
    <div>
      <h2>ผู้ซื้อ / ที่อยู่จัดส่ง</h2>
      <p><strong>${escapeHtml(input.customer.name)}</strong></p>
      <p>${escapeHtml(input.customer.phone)}</p>
      <p>${escapeHtml(address)}</p>
    </div>
    <div>
      <h2>การชำระเงิน</h2>
      <p>วิธีชำระ: ${escapeHtml(paymentLabels[input.paymentMethod] ?? methodLabels[input.paymentMethod])}</p>
      <p>${input.paidAt ? `ชำระเมื่อ ${escapeHtml(thaiDate(input.paidAt))}` : 'ยังไม่ชำระเงิน'}</p>
      ${input.trackingNumber ? `<p>เลขพัสดุ ${escapeHtml(input.trackingNumber)}</p>` : ''}
    </div>
  </section>

  <table>
    <thead>
      <tr><th>รายการ</th><th class="num">จำนวน</th><th class="num">ราคา/หน่วย</th><th class="num">รวม</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>ยอดสินค้า</span><span>${formatBaht(input.subtotal)} ${escapeHtml(input.currency)}</span></div>
    <div><span>ค่าจัดส่ง</span><span>${input.shippingFee === 0 ? 'ฟรี' : `${formatBaht(input.shippingFee)} ${escapeHtml(input.currency)}`}</span></div>
    <div class="grand"><span>รวมทั้งสิ้น</span><span>${formatBaht(input.total)} ${escapeHtml(input.currency)}</span></div>
  </div>

  ${input.note ? `<footer>หมายเหตุ: ${escapeHtml(input.note)}</footer>` : ''}
  <footer>เอกสารนี้ออกโดยระบบ Lumio · ${escapeHtml(input.siteName)}</footer>
</article>
${options.autoPrint ? '<script>window.print()</script>' : ''}
</body>
</html>`;
};

export const receiptFileName = (orderNumber: string): string =>
  `receipt-${orderNumber.replace(/[^A-Za-z0-9-]/g, '')}.pdf`;
