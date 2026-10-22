import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { formatBaht } from '@lumio/shared';
import { ShopShell } from '../../../components/ShopShell';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { loadOrderOrNull } from '../../../lib/shop';

export const metadata: Metadata = {
  title: 'คำสั่งซื้อของคุณ',
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอชำระเงิน',
  paid: 'ชำระเงินแล้ว',
  shipped: 'จัดส่งแล้ว',
  completed: 'สำเร็จ',
  cancelled: 'ยกเลิก',
  refunded: 'คืนเงินแล้ว',
};

const formatDateTime = (iso: string): string => {
  const [date, time] = iso.split('T');
  const [year, month, day] = (date ?? '').split('-');
  return year && month && day ? `${day}/${month}/${year} ${(time ?? '').slice(0, 5)}` : '';
};

export interface OrderPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ slip?: string }>;
}

const SLIP_NOTICE: Record<string, string> = {
  verified: 'ได้รับสลิปแล้ว ยอดเงินตรงกับคำสั่งซื้อ ระบบยืนยันการชำระเงินให้ทันที',
  review: 'ได้รับสลิปแล้ว ร้านจะตรวจสอบและยืนยันการชำระเงินให้เร็วที่สุด',
  error: 'ส่งสลิปไม่สำเร็จ กรุณาตรวจสอบยอดเงินและเลขอ้างอิง แล้วลองอีกครั้ง',
  'too-large': 'ไฟล์สลิปใหญ่เกิน 4MB กรุณาย่อรูปแล้วลองใหม่',
  type: 'สลิปต้องเป็นรูป JPG, PNG หรือ WebP',
};

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const { token } = await params;
  const { slip: slipNotice } = await searchParams;
  const found = await loadOrderOrNull(host, token, locale);
  if (!found) notFound();

  const { order, payment } = found;
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  const receiptBase = apiBase
    ? `${apiBase}/api/v1/public/${encodeURIComponent(host)}/shop/orders/${encodeURIComponent(order.token)}`
    : null;
  const slipRejected = order.slip?.status === 'rejected';
  const canUploadSlip =
    order.status === 'pending' &&
    order.paymentMethod === 'promptpay' &&
    (!order.slip || slipRejected);
  const qr =
    payment.promptPayPayload && order.status === 'pending'
      ? await QRCode.toString(payment.promptPayPayload, {
          type: 'svg',
          margin: 1,
          width: 240,
          color: { dark: '#111827', light: '#ffffff' },
        }).catch(() => null)
      : null;

  return (
    <ShopShell chrome={found} path={`/order/${order.token}`}>
      <header className="shop-hero">
        <h1 className="shop-hero__title">คำสั่งซื้อ {order.number}</h1>
        <p className="shop-hero__subtitle">
          {STATUS_LABEL[order.status] ?? order.status} · สั่งเมื่อ {formatDateTime(order.createdAt)}
        </p>
      </header>

      {order.status === 'refunded' ? (
        <p className="shop-notice">
          ร้านคืนเงิน {formatBaht(order.refundedAmount)} บาท ให้คุณแล้ว
          {order.refundReason ? ` — ${order.refundReason}` : ''}
          <br />
          เงินอาจใช้เวลาถึง 7 วันทำการจึงจะปรากฏในบัญชี
        </p>
      ) : null}

      {slipNotice && SLIP_NOTICE[slipNotice] ? (
        <p className="shop-notice">{SLIP_NOTICE[slipNotice]}</p>
      ) : null}

      {order.status === 'pending' && qr ? (
        <section className="shop-payment" aria-labelledby="payment-heading">
          <h2 className="shop-section-title" id="payment-heading">
            ชำระเงินด้วยพร้อมเพย์
          </h2>
          <div className="shop-payment__qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="shop-payment__amount">ยอดที่ต้องชำระ {formatBaht(order.total)} บาท</p>
          <p className="shop-payment__hint">
            สแกน QR ด้วยแอปธนาคาร แล้วรอร้านยืนยันการชำระเงิน ระบบจะแสดงสถานะใหม่ในหน้านี้
          </p>
          {payment.promptPayId ? (
            <p className="shop-payment__id">พร้อมเพย์ {payment.promptPayId}</p>
          ) : null}
        </section>
      ) : order.status === 'pending' && order.paymentUrl ? (
        <section className="shop-payment">
          <h2 className="shop-section-title">
            {order.paymentMethod === 'bbl' ? 'ชำระเงินผ่านธนาคารกรุงเทพ' : 'ชำระเงินด้วยบัตร'}
          </h2>
          <p className="shop-payment__hint">
            {order.paymentMethod === 'bbl'
              ? 'ชำระด้วยบัตรหรือ QR บนหน้าจ่ายเงินของธนาคาร แล้วกลับมาที่หน้านี้เพื่อดูสถานะ'
              : 'ชำระผ่านหน้าจ่ายเงินที่ปลอดภัยของ Stripe แล้วกลับมาที่หน้านี้เพื่อดูสถานะ'}
          </p>
          <a className="shop-button" href={order.paymentUrl}>
            เปิดหน้าชำระเงิน
          </a>
        </section>
      ) : order.status === 'pending' ? (
        <p className="shop-notice">
          ร้านจะติดต่อกลับเพื่อยืนยันคำสั่งซื้อและการชำระเงินด้วยวิธีที่คุณเลือก
        </p>
      ) : null}

      {order.slip && order.slip.status !== 'rejected' ? (
        <p className="shop-notice">
          {order.slip.status === 'verified'
            ? 'ร้านได้รับสลิปและยืนยันการชำระเงินแล้ว'
            : 'ร้านได้รับสลิปแล้ว กำลังตรวจสอบการชำระเงิน'}{' '}
          (อ้างอิง {order.slip.reference})
        </p>
      ) : null}

      {canUploadSlip ? (
        <section className="shop-payment" aria-labelledby="slip-heading">
          <h2 className="shop-section-title" id="slip-heading">
            แนบสลิปการโอน
          </h2>
          <p className="shop-payment__hint">
            อัปโหลดสลิปเพื่อให้ร้านตรวจสอบเร็วขึ้น ถ้ายอดเงินตรงกับคำสั่งซื้อ ระบบจะยืนยันให้ทันที
          </p>
          <form
            className="shop-slip"
            action={`/order/${order.token}/slip`}
            method="post"
            encType="multipart/form-data"
          >
            <label className="shop-field">
              <span>ยอดที่โอน (บาท)</span>
              <input
                name="amount"
                required
                inputMode="decimal"
                defaultValue={(order.total / 100).toFixed(2)}
              />
            </label>
            <label className="shop-field">
              <span>เลขอ้างอิงจากสลิป</span>
              <input name="reference" required minLength={4} maxLength={60} />
            </label>
            <label className="shop-field">
              <span>รูปสลิป (JPG, PNG, WebP ไม่เกิน 4MB)</span>
              <input name="slip" type="file" accept="image/jpeg,image/png,image/webp" required />
            </label>
            <button className="shop-button" type="submit">
              ส่งสลิปให้ร้าน
            </button>
          </form>
        </section>
      ) : null}

      <div className="shop-order">
        <section className="shop-order__card">
          <h2 className="shop-section-title">รายการสินค้า</h2>
          <ul className="shop-order__items">
            {order.items.map((item, index) => (
              <li key={`${item.productId ?? item.title}-${item.variantId ?? index}`}>
                <span>
                  {item.title}
                  {item.variantLabel ? ` (${item.variantLabel})` : ''} × {item.quantity}
                </span>
                <span>{formatBaht(item.lineTotal)} บาท</span>
              </li>
            ))}
          </ul>
          <dl className="shop-summary__list">
            <div>
              <dt>ยอดสินค้า</dt>
              <dd>{formatBaht(order.subtotal)} บาท</dd>
            </div>
            <div>
              <dt>ค่าจัดส่ง</dt>
              <dd>{order.shippingFee === 0 ? 'ฟรี' : `${formatBaht(order.shippingFee)} บาท`}</dd>
            </div>
            <div className="shop-summary__grand">
              <dt>รวมทั้งสิ้น</dt>
              <dd>{formatBaht(order.total)} บาท</dd>
            </div>
          </dl>
          {receiptBase && ['paid', 'shipped', 'completed'].includes(order.status) ? (
            <div className="shop-order__receipt">
              <a
                className="shop-button shop-button--ghost"
                href={`${receiptBase}/receipt`}
                target="_blank"
                rel="noreferrer"
              >
                เปิดใบเสร็จ
              </a>
              <a className="shop-link-button" href={`${receiptBase}/receipt.pdf`}>
                ดาวน์โหลด PDF
              </a>
            </div>
          ) : null}
        </section>

        <section className="shop-order__card">
          <h2 className="shop-section-title">ข้อมูลจัดส่ง</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          {order.trackingNumber ? <p>เลขพัสดุ {order.trackingNumber}</p> : null}
          <p className="shop-payment__hint">
            เก็บหน้านี้ไว้เพื่อตรวจสอบสถานะคำสั่งซื้อ อย่าแชร์ลิงก์ให้ผู้อื่น
          </p>
        </section>
      </div>
    </ShopShell>
  );
}
