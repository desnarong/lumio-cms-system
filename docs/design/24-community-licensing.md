# 24 — Community Edition และไลเซนส์

> เป้าหมาย: เปิดโค้ดให้คนดาวน์โหลดไปใช้/โฮสต์เองได้แบบ **Community** โดยที่ฟีเจอร์ที่ขาย
> (Membership/Paywall, Block Marketplace) ยังเปิดได้เฉพาะผู้ที่มีไลเซนส์ และตรวจได้โดยไม่ต้องเรียกกลับบ้าน

## 24.1 รุ่นการใช้งาน

| รุ่น | ได้อะไร | ต้องมี |
|---|---|---|
| **Community** | ทุกอย่างใน MVP (เว็บ, เอดิเตอร์, บล็อก, คลังรูป, ฟอร์ม, SEO, ร้านค้า, สำรองข้อมูล, i18n, AI local) | ไม่ต้องมีอะไร |
| **Pro** | Community + Membership/Paywall + Block Marketplace | ไลเซนส์ที่ลงลายเซ็น (ระบุฟีเจอร์ที่ต้องการ) |

- ซอร์สของทั้งสองรุ่นอยู่ในรีโปนี้; ฟีเจอร์ที่ยังไม่สร้างจะขึ้นเป็น “ต้องมีไลเซนส์” ในหน้าตั้งค่า › ส่วนเสริม
- การตรวจไลเซนส์เป็น **ออฟไลน์** — ไม่มี telemetry ไม่มีการเรียกกลับเซิร์ฟเวอร์เรา
- คีย์ส่วนตัวสำหรับออกไลเซนส์ **ไม่อยู่ในรีโปนี้** (อยู่ในรีโปภายใน/เครื่องของผู้ออกไลเซนส์เท่านั้น)

## 24.2 รูปแบบไลเซนส์

```
lumio_lic_v1.<base64url(payload JSON)>.<base64url(Ed25519 signature)>
```

ลายเซ็นลงบนข้อความ `lumio_lic_v1.<payload>` (Ed25519, 64 ไบต์) — payload อยู่ในรูปที่อ่านได้
เพื่อให้ผู้ซื้อตรวจสอบวันหมดอายุ/ฟีเจอร์ด้วยตาได้

```json
{
  "v": 1,
  "sub": "บริษัท ตัวอย่าง จำกัด",
  "plan": "pro",
  "features": ["membership", "marketplace"],
  "seats": 5,
  "iat": 1760000000,
  "exp": 2000000000
}
```

| ฟิลด์ | ความหมาย |
|---|---|
| `v` | เวอร์ชันรูปแบบ (ปัจจุบัน 1) |
| `sub` | ชื่อผู้ถือไลเซนส์ (แสดงในแอดมิน) |
| `plan` | `pro` หรือ `business` |
| `features` | ฟีเจอร์ที่ปลดล็อก: `membership`, `marketplace` |
| `seats` | จำนวนเว็บที่ครอบคลุม; `null` = ไม่จำกัด |
| `iat` / `exp` | เวลาออก/หมดอายุ (Unix วินาที); `exp: null` = ตลอดชีพ |

## 24.3 การตั้งค่าในเครื่องที่ติดตั้ง

```bash
# ไลเซนส์ที่ซื้อมา (ไม่มี = Community)
LUMIO_LICENSE=lumio_lic_v1.xxxxx.yyyyy

# ใช้เฉพาะตอนพัฒนา: เขียนทับกุญแจสาธารณะที่ฝังมากับบิลด์
LUMIO_LICENSE_PUBLIC_KEY=
```

- กุญแจสาธารณะของผู้ออกไลเซนส์ถูกฝังใน `apps/api/src/modules/license/license.keys.ts`
  ตอน release (ไม่ใช่ค่าที่ผู้ใช้งานแก้เอง เพื่อไม่ให้สลับกุญแจแล้วปลอมไลเซนส์ได้)
- `LUMIO_LICENSE_PUBLIC_KEY` ใช้ได้เฉพาะ `NODE_ENV !== 'production'` (สำหรับทดสอบ/องค์กรที่ออกไลเซนส์เอง)
  ใน production ระบบใช้กุญแจที่ฝังมากับบิลด์เท่านั้น เพื่อไม่ให้ใครสลับกุญแจแล้วปลอมไลเซนส์
- ถ้าไม่มีกุญแจสาธารณะ ระบบจะตอบ `no_public_key` และถือเป็น Community เสมอ (ไม่ปลดล็อกอะไร)

## 24.4 API สำหรับตรวจสอบลายเซ็น

### `POST /api/v1/public/license/verify`

ไม่ต้องล็อกอิน (rate limit 60 ครั้ง/นาที) ใช้ตรวจว่าโทเคนจริงและยังไม่หมดอายุก่อนติดตั้ง
ไม่บันทึกอะไรและไม่คืนข้อมูลลับ

```http
POST /api/v1/public/license/verify
{ "token": "lumio_lic_v1...." }

200
{
  "data": {
    "edition": "pro",
    "valid": true,
    "plan": "pro",
    "subject": "บริษัท ตัวอย่าง จำกัด",
    "features": ["membership"],
    "seats": 5,
    "issuedAt": "2025-10-09T08:53:20.000Z",
    "expiresAt": "2033-05-18T03:33:20.000Z",
    "reason": "ok"
  }
}
```

`reason` ที่เป็นไปได้: `ok`, `missing`, `malformed`, `bad_signature`, `expired`, `no_public_key`

### `GET /api/v1/license`

ต้องล็อกอินและเป็นสมาชิกเว็บ (ทุก role) คืนสถานะเดียวกันของไลเซนส์ที่ติดตั้งอยู่ ไม่คืนโทเคน

## 24.5 ผลต่อ feature flags

- `membership` และ `marketplace` เป็นฟีเจอร์ที่ `requiresLicense: true` และ **ปิดเป็นค่าเริ่มต้น**
- `GET/PATCH /v1/features` จะคืน `lockedByLicense: true` จนกว่าไลเซนส์จะระบุฟีเจอร์นั้น
- พยายามเปิดฟีเจอร์ที่ยังไม่ได้รับสิทธิ์ → `409` พร้อมข้อความภาษาคน
- เมื่อซื้อไลเซนส์แล้ว ผู้ดูแลเว็บยังต้องเปิดสวิตช์ใน ตั้งค่า › ส่วนเสริม อีกครั้ง (ค่าเริ่มต้นคือปิด)

## 24.6 การออกไลเซนส์ (ฝั่งผู้ขาย — ไม่อยู่ในรีโปนี้)

```bash
# ครั้งเดียว: สร้างกุญแจคู่ แล้วฝังกุญแจสาธารณะลง license.keys.ts ตอน build
node scripts/license-keygen.mjs ./lumio-license-private.pem

# ออกไลเซนส์ให้ลูกค้า (token พิมพ์ออกทาง stdout)
node scripts/license-issue.mjs --key ./lumio-license-private.pem \
  --sub "บริษัท ตัวอย่าง จำกัด" --features membership,marketplace --seats 5 --days 365
```

```js
// สคริปต์ภายใน (เก็บไว้นอกรีโป): sign ไม่ใช่ verify
import { createPrivateKey, sign } from 'node:crypto';
const payload = { v: 1, sub, plan: 'pro', features: ['membership'], seats: 5, iat, exp };
const segment = Buffer.from(JSON.stringify(payload)).toString('base64url');
const signingInput = `lumio_lic_v1.${segment}`;
const signature = sign(null, Buffer.from(signingInput), createPrivateKey(privateKeyPem));
const token = `${signingInput}.${signature.toString('base64url')}`;
```

## 24.7 ตรวจลายเซ็นของ webhook (for integrators)

Webhook ของร้านค้า (`order.created` / `order.paid` / `order.status` / `order.refunded`) ส่ง
`x-lumio-timestamp` และ `x-lumio-signature: sha256=<hex>` ของ `<timestamp>.<raw body>`
ใช้ตัวช่วยใน SDK (ทำงานได้ทั้งเบราว์เซอร์และเซิร์ฟเวอร์ เพราะใช้ Web Crypto):

```ts
import { verifyLumioSignature } from '@lumio/sdk';

app.post('/lumio-webhook', async (req, res) => {
  const ok = await verifyLumioSignature({
    secret: process.env.LUMIO_WEBHOOK_SECRET!,
    timestamp: req.header('x-lumio-timestamp') ?? '',
    body: rawBody, // ต้องเป็น body ดิบ ห้าม JSON.stringify ใหม่
    header: req.header('x-lumio-signature') ?? '',
  });
  if (!ok) return res.status(401).send('bad signature');
  // ...
});
```

- ค่าเริ่มต้นปฏิเสธของที่เก่ากว่า 5 นาที (`toleranceSeconds`)
- ฝั่งผู้รับควรตอบ 2xx เร็ว ๆ; ระบบส่งซ้ำไม่เกิน 3 ครั้งเมื่อ timeout/5xx

## 24.8 สิ่งที่ยังไม่ทำ

- Membership/Paywall และ Block Marketplace ยังไม่ถูกสร้าง (ดู `docs/PROGRESS.md` หัวข้อ “งานถัดไป”)
- ยังไม่มีหน้าจอแอดมินสำหรับวางไลเซนส์ (ติดตั้งผ่าน env ก่อน) — ถ้าต้องการ ให้เพิ่มหน้าตั้งค่า › ไลเซนส์
  พร้อม `GET/PATCH /v1/license` แบบเขียนไฟล์ใน `.lumio-data/`

---

[← Security review](23-security-review.md) · [กลับสารบัญ](README.md)
