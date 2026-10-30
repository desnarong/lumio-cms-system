# 24 — Community Edition และไลเซนส์

> เป้าหมาย: เปิดโค้ดให้คนดาวน์โหลดไปใช้/โฮสต์เองได้แบบ **Community** โดยที่ฟีเจอร์ที่ขาย
> (Membership/Paywall, Block Marketplace) ยังเปิดได้เฉพาะผู้ที่มีไลเซนส์ และตรวจได้โดยไม่ต้องเรียกกลับบ้าน

## 24.1 รุ่นการใช้งาน

| รุ่น | ได้อะไร | ต้องมี |
|---|---|---|
| **Community** | ทุกอย่างใน MVP (เว็บ, เอดิเตอร์, บล็อก, คลังรูป, ฟอร์ม, SEO, ร้านค้า, สำรองข้อมูล, i18n, AI local) | ไม่ต้องมีอะไร |
| **Pro** | Community + Membership/Paywall + Block Marketplace + Agency/White-label | ไลเซนส์ที่ลงลายเซ็น (ระบุฟีเจอร์ที่ต้องการ) |

- ซอร์สของทั้งสองรุ่นอยู่ในรีโปนี้; ฟีเจอร์ที่ยังไม่สร้างจะขึ้นเป็น “ต้องมีไลเซนส์” ในหน้าตั้งค่า › ส่วนเสริม
- มีสองแบบ: **ออฟไลน์** (ตรวจลายเซ็นจบในเครื่อง ไม่มีการเรียกกลับ) และ
  **ออนไลน์** (โทเคนใช้แลก lease อายุสั้นผูกกับเครื่อง → บังคับ seats และเพิกถอนได้, ดู 24.9)
- คีย์ส่วนตัวสำหรับออกไลเซนส์ **ไม่อยู่ในรีโปนี้** (อยู่ในรีโปภายใน/เครื่องของผู้ออกไลเซนส์เท่านั้น)

### ข้อจำกัดที่ต้องยอมรับ (สำคัญ)

เพราะรีโปนี้เปิดซอร์ส (AGPL) การตรวจไลเซนส์ในเครื่องจึงกันได้แค่ **การปลอมโทเคน**:

| สิ่งที่กันได้ | สิ่งที่กันไม่ได้ |
|---|---|
| อ่าน public key แล้วสร้างโทเคนเอง (ต้องมี private key) | แก้โค้ด `license.keys.ts` หรือ guard แล้ว build เอง |
| สลับกุญแจผ่าน `LUMIO_LICENSE_PUBLIC_KEY` (กุญแจที่ฝังชนะเสมอ) | ยกเลิกการตรวจใน source ที่เขาถืออยู่ |
| ใช้โทเคนที่ payload ถูกแก้ (ลายเซ็นไม่ตรง) | — |

โหมด **ออนไลน์** ปิดช่อง "เอาโทเคนไปติดตั้งซ้ำ" และ "เพิกถอนไม่ได้" ให้แล้ว เพราะเครื่องต้องขอ
lease ที่ผูกกับ `installId` และเซิร์ฟเวอร์บังคับจำนวน seats เอง (24.9) — แต่ยังกันคนที่แก้ซอร์ส
ยกเลิกการตรวจไม่ได้อยู่ดี สิทธิ์การใช้งานจึงยังพึ่ง **สัญญา/ลิขสิทธิ์/เครื่องหมายการค้า** เป็นหลัก

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
  "features": ["membership", "marketplace", "whitelabel"],
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
| `features` | ฟีเจอร์ที่ปลดล็อก: `membership`, `marketplace`, `whitelabel` |
| `seats` | จำนวนเว็บที่ครอบคลุม; `null` = ไม่จำกัด (บังคับจริงเฉพาะโหมดออนไลน์) |
| `iat` / `exp` | เวลาออก/หมดอายุ (Unix วินาที); `exp: null` = ตลอดชีพ |
| `mode` | `offline` (ค่าเริ่มต้น, ไม่ต้องต่อเน็ต) หรือ `online` (ต้องแลก lease) |
| `inst` | `installId` ที่ lease ผูกอยู่ — มีเฉพาะ lease ที่เครื่องออกไลเซนส์เซ็นให้ |

## 24.3 การตั้งค่าในเครื่องที่ติดตั้ง

```bash
# ไลเซนส์ที่ซื้อมา (ไม่มี = Community)
LUMIO_LICENSE=lumio_lic_v1.xxxxx.yyyyy

# ใช้เฉพาะบิลด์ที่ยังไม่มีกุญแจฝังอยู่ (dev/fork): ถ้าฝังกุญแจแล้ว ค่านี้ถูกเพิกเฉย
LUMIO_LICENSE_PUBLIC_KEY=

# ไลเซนส์แบบออนไลน์เท่านั้น: ที่อยู่เครื่องออกไลเซนส์ (ว่าง = ไม่เรียกกลับเลย)
LUMIO_LICENSE_SERVER=
# ช่วงผ่อนผันเมื่อต่อเซิร์ฟเวอร์ไม่ได้ (วัน) และรอบต่ออายุ (ชั่วโมง)
LUMIO_LICENSE_GRACE_DAYS=14
LUMIO_LICENSE_REFRESH_HOURS=6
```

- กุญแจสาธารณะของผู้ออกไลเซนส์ถูกฝังใน `apps/api/src/modules/license/license.keys.ts`
  ตอน release (ไม่ใช่ค่าที่ผู้ใช้งานแก้เอง เพื่อไม่ให้สลับกุญแจแล้วปลอมไลเซนส์ได้)
- **กุญแจที่ฝังในบิลด์ชนะเสมอ**: ถ้า `LICENSE_PUBLIC_KEY` ไม่ว่าง ระบบจะไม่สนใจ
  `LUMIO_LICENSE_PUBLIC_KEY` เลย (เดิมใช้ `NODE_ENV !== 'production'` เป็นเงื่อนไข ซึ่งรัน
  `NODE_ENV=development` แล้วสลับกุญแจเองได้) — ค่า env ถูกอ่านเฉพาะบิลด์ที่ไม่มีกุญแจฝัง
  เช่นรีโปที่เพิ่ง fork ไปหรือเครื่องพัฒนา และจะขึ้น warning ใน log เมื่อถูกเพิกเฉย
- ถ้าไม่มีกุญแจสาธารณะ ระบบจะตอบ `no_public_key` และถือเป็น Community เสมอ (ไม่ปลดล็อกอะไร)
- `LUMIO_LICENSE_SERVER` เปิดโหมดออนไลน์: เครื่องจะขอ lease ตอนบูตและทุก
  `LUMIO_LICENSE_REFRESH_HOURS` ชั่วโมง ถ้าไม่ตั้งค่านี้ = ไม่มีการเรียกกลับเลย

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
- `booking` (ระบบจองคิว) เป็นฟีเจอร์ฟรี เปิดเป็นค่าเริ่มต้น แต่ปิดได้รายเว็บผ่าน `settings.flags`
- `whitelabel` ไม่ใช่ feature flag ของเว็บ แต่เป็นสิทธิ์ระดับการติดตั้ง: `PATCH /v1/agency` ตอบ 403
  เมื่อไลเซนส์ไม่ได้ระบุ `whitelabel` (หน้าจอตั้งค่า › แบรนด์องค์กรยังเปิดดูได้และอธิบายสิ่งที่ขาด)
- `GET/PATCH /v1/features` จะคืน `lockedByLicense: true` จนกว่าไลเซนส์จะระบุฟีเจอร์นั้น
- พยายามเปิดฟีเจอร์ที่ยังไม่ได้รับสิทธิ์ → `409` พร้อมข้อความภาษาคน
- เมื่อซื้อไลเซนส์แล้ว ผู้ดูแลเว็บยังต้องเปิดสวิตช์ใน ตั้งค่า › ส่วนเสริม อีกครั้ง (ค่าเริ่มต้นคือปิด)

## 24.6 การออกไลเซนส์ (ฝั่งผู้ขาย — ไม่อยู่ในรีโปนี้)

```bash
# ครั้งเดียว: สร้างกุญแจคู่ "นอกรีโป" แล้วฝังกุญแจสาธารณะลง license.keys.ts ตอน build
# (สคริปต์จะปฏิเสธถ้าให้เขียนไฟล์ลงในรีโป)
node scripts/license-keygen.mjs ../.lumio-vendor-keys/lumio-license-private.pem

# ออกไลเซนส์ให้ลูกค้า (token พิมพ์ออกทาง stdout)
node scripts/license-issue.mjs --key ../.lumio-vendor-keys/lumio-license-private.pem \
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

### 24.6.1 การเก็บ สำรอง และหมุนกุญแจ

- **กุญแจที่ใช้อยู่ (public)** — fingerprint SHA-256:
  `dc64d4ca:fa8cb895:1ec5dbc9:cd93f180:6051d45f:03445c60:5882670a:d383e052`
  (fingerprint ของ SPKI DER; ใช้ตรวจว่าบิลด์ที่ deploy ใช้กุญแจเดียวกัน)
- **กุญแจส่วนตัว** ไม่อยู่ในรีโปนี้ **และต้องไม่วางไว้ในโฟลเดอร์โปรเจกต์** (แม้จะถูก
  `.gitignore` ไว้ ก็ยังติดไปกับ zip/rsync/backup ของโฟลเดอร์โปรเจกต์ได้) —
  เก็บที่ `../.lumio-vendor-keys/lumio-license-private.pem` หรือนอก checkout สิทธิ์ 0600
- **สำรอง** อย่างน้อย 2 ที่ แบบออฟไลน์/เข้ารหัส (password manager + external drive)
  — กุญแจหาย = ออกไลเซนส์ใหม่ให้ลูกค้าไม่ได้
- **ห้ามสร้างหรือเก็บกุญแจส่วนตัวบนเครื่อง production/CI**; CI ควรมีแค่ public key
  ที่ฝังในโค้ด
- **การหมุนกุญแจ**: ปัจจุบันบิลด์ตรวจด้วยกุญแจเดียว
  1. สร้างคู่ใหม่ด้วย `license-keygen.mjs`
  2. ฝังกุญแจสาธารณะใหม่ลง `license.keys.ts` แล้วปล่อย release
  3. ออกไลเซนส์ให้ลูกค้าด้วยกุญแจใหม่ (ไลเซนส์เก่าจะใช้ไม่ได้เมื่อกุญแจเก่าถูกแทนที่)
  - ถ้าต้องการเปลี่ยนแบบไม่ตัดลูกค้า ให้เพิ่มรายการ public key เก่าในโค้ดชั่วคราวก่อนลบ
    (ยังไม่ได้ทำเป็น config หลายคีย์)
- **ถ้ากุญแจรั่ว**: หมุนทันที → แจ้งลูกค้า → ออกไลเซนส์ใหม่ → ตรวจ log การใช้ endpoint ตรวจไลเซนส์

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

- การหมุนกุญแจแบบหลายคีย์พร้อมกัน (ดู 24.6.1)
- การคืนที่นั่ง (seat) จากในแอป — ทำที่เครื่องออกไลเซนส์

## 24.9 ไลเซนส์ออนไลน์ (activation + heartbeat + เพิกถอน)

ใช้เมื่อต้อง **บังคับจำนวนเว็บ** และ **เพิกถอนไลเซนส์ได้** — ตัวเลือก ไม่ใช่ค่าเริ่มต้น

```
เครื่องปลายทาง                          เครื่องออกไลเซนส์ (นอกรีโป)
LUMIO_LICENSE (mode=online)  ─────►  POST /api/activate {token, installId, host, version}
                                    ◄──── lease (mode=online, inst=<installId>, exp=+72h)
เก็บ lease ที่ .lumio-data/license-lease.json
ต่ออายุทุก 6 ชม. (LUMIO_LICENSE_REFRESH_HOURS)
```

- `installId` = UUID ใน `.lumio-data/install.json` (สร้างครั้งแรกอัตโนมัติ, รอดจากการ restore backup)
- โทเคน `mode: 'online'` ที่ยังไม่มี lease → สถานะ `not_activated` (ไม่ปลดล็อกอะไร)
- lease ที่ `inst` ไม่ตรงกับเครื่อง → `wrong_install` และถูกลบทิ้ง
- lease หมดอายุแต่ยังอยู่ในช่วงผ่อนผัน → ยังใช้ได้ สถานะ `grace` (ค่าเริ่มต้น 14 วัน, `LUMIO_LICENSE_GRACE_DAYS`)
- เพิกถอนที่เครื่องออกไลเซนส์ → ต่ออายุไม่ได้ → ใช้ต่อได้จนหมด lease + grace
- ตั้ง `LUMIO_LICENSE_SERVER` ว่าง = ไม่มีการเรียกกลับเลย (โหมดออฟไลน์เต็มตัว)
- `POST /v1/license/refresh` (owner/admin) บังคับต่ออายุทันที
- ตัวเครื่องออกไลเซนส์: `D:/@MyApp/@@/lumio-license-issuer` (docker compose, เก็บกุญแจแบบ mount อ่านอย่างเดียว)

## 24.10 วางไลเซนส์ในหน้าจอ (ไม่ต้องแก้ .env)

เจ้าของเว็บวางโทเคนได้ที่ **ตั้งค่า › ไลเซนส์** ระบบเก็บไว้ในฐานข้อมูลให้เอง

- ตาราง `platform_license` แถวเดียว (`id = 'default'`) — ระดับแพลตฟอร์ม ไม่มี `site_id`/RLS
  เหมือน `agency_branding`
- `PATCH /v1/license` (owner) ตรวจลายเซ็นก่อนบันทึกทุกครั้ง แล้วเขียน audit
  `license.install`; `DELETE /v1/license` เขียน `license.remove` (ถอดแล้วกลับเป็น Community)
- `GET /v1/license` ตอบสถานะเดิมพร้อม `source` (`env` / `database` / `none`) และ
  `installedAt` เพื่อให้หน้าจอบอกได้ว่าไลเซนส์ที่ใช้อยู่มาจากไหน
- **`LUMIO_LICENSE` ยังชนะเสมอ** — ตั้งไว้เมื่อต้องปักไลเซนส์จาก config ของเครื่อง
  หน้าจอจะขึ้นแบนเนอร์ว่าไลเซนส์มาจาก .env และปิดช่องกรอก (ไม่ซ่อนฟีเจอร์)
- โทเคนที่บันทึกไว้ถูกโหลดเข้า memory ตอนบูต (feature check ต้องตอบแบบ synchronous)
  และถ้าเป็นโหมด `online` ระบบจะขอ lease ให้ทันทีหลังติดตั้ง
- ถ้าตารางยังไม่มี (ฐานข้อมูลเก่า/ migrate ไม่ผ่าน) ระบบยังบูตได้และทำงานเป็น Community
  พร้อม warning ใน log

---

[← Security review](23-security-review.md) · [กลับสารบัญ](README.md)
