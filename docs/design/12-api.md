# 12 — API Design

Base: `/api/v1` — Auth ด้วย `Authorization: Bearer <token>` + header `X-Site-Id`

ภาษาไทย/อังกฤษของข้อความที่เซิร์ฟเวอร์สร้าง (ชื่อแพ็กเกจ, รายการตรวจ SEO, ชื่อ App,
checklist, ป้ายอุปกรณ์, ป้าย diff ของ AI) เลือกด้วย header `X-Locale: th|en`
(ถ้าไม่ส่งจะอ่าน `Accept-Language` แล้วถอยเป็นไทย)

## 12.1 Endpoints

| Resource              | Endpoints                                                                                                                                                                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**              | `POST /auth/login` · `/auth/register` · `/auth/refresh` · `/auth/logout` · `GET /auth/me` · `/auth/oauth/:provider`                                                                                                                                                                            |
| **Sites**             | `GET /sites` · `POST /sites` (wizard step 5; สร้างภาษาที่เลือกไว้เป็น background job) · `GET/PATCH /sites/:id` · `GET /sites/:id/locales` (ความคืบหน้าการสร้างภาษา) · `POST /sites/:id/publish-all`                                                                                                                                                                                          |
| **Contents**          | `GET /contents?type=page&status=` · `POST /contents` · `GET/PATCH/DELETE /contents/:id`                                                                                                                                                                                                        |
|                       | `PUT /contents/:id/blocks` (autosave draft) · `POST /contents/:id/publish` · `POST /contents/:id/schedule`                                                                                                                                                                                     |
|                       | `POST /contents/:id/restore` (กู้คืนจากถังขยะ) · `DELETE /contents/:id` (ลบถาวร)                                                                                                                                                                                                               |
|                       | `GET /contents/:id/versions` · `POST /contents/:id/versions` (บันทึกเวอร์ชันเอง) · `GET /contents/:id/versions/:versionId` · `POST /contents/:id/restore/:versionId`                                                                                                                           |
|                       | `GET /contents/:id/translations` (ทุกภาษาของหน้า) · `POST /contents/:id/translate` (สร้างคำแปลภาษาใหม่) · `POST /contents/:id/translate-content` (แปลข้อความที่ยังไม่ได้แปลของหน้านี้)                                                                                                         |
|                       | `PATCH /contents/:id/seo` (แก้เฉพาะชื่อเรื่อง/คำอธิบายหน้า โดยไม่ทับค่าอื่น) · `POST /contents/:id/preview-link` (ลิงก์ดูตัวอย่างฉบับร่าง อายุ 1 ชม.)                                                                                                                                            |
| **Media**             | `POST /media/presign` → upload ตรงไป S3 · `PUT /media/upload/:token` (driver local) · `POST /media/:id/confirm`                                                                                                                                                                                |
|                       | `GET /media` (q/โฟลเดอร์/cursor) · `GET /media/folders` · `GET/PATCH/DELETE /media/:id` (PATCH รับ `crop` เพื่อตัดรูปใหม่ทุกระยะ) · `POST /media/:id/restore` · `POST /media/:id/palette` (อ่านสีแบรนด์จากโลโก้) · `PATCH /media/bulk` (แก้ alt หลายรูป/ย้ายโฟลเดอร์ สูงสุด 100 รูป)                                                         |
| **Menus**             | `GET/PUT /menus/:location`                                                                                                                                                                                                                                                                     |
| **Dashboard**         | `GET /dashboard` (สถิติ + สุขภาพเว็บ + checklist) · `PATCH /dashboard/checklist`                                                                                                                                                                                                               |
| **Design**            | `GET/PATCH /design/tokens` · `POST /design/tokens/reset` · `POST /design/template/:id/apply`                                                                                                                                                                                                   |
| **Templates**         | `GET /templates` · `GET /templates/:templateId`                                                                                                                                                                                                                                                |
| **Global blocks**     | `GET /global-blocks` · `PUT /global-blocks/:kind` (header/footer)                                                                                                                                                                                                                              |
| **Section templates** | `GET/POST /section-templates` · `PATCH/DELETE /section-templates/:id`                                                                                                                                                                                                                          |
| **Forms**             | `GET/POST /forms` · `GET/PATCH/DELETE /forms/:id` · `GET /forms/:id/submissions` · `PATCH /forms/:id/submissions/:submissionId` · **Public:** `POST /public/:host/forms/:id/submit`                                                                                                            |
| **Domains**           | `GET/POST /sites/:id/domains` · `POST /sites/:id/domains/:domainId/verify` · `DELETE /sites/:id/domains/:domainId` · **Caddy:** `GET /public/tls/ask?domain=` (ออก cert ให้เฉพาะโดเมนที่ verify แล้ว)                                                                                        |
| **Redirects**         | `GET/POST /redirects` · `PATCH /redirects` (แก้ที่อยู่ปลายทาง/ประเภทของกฎเดิม) · `DELETE /redirects?from=` (รับ 301/302; ต้องล็อกอินและมีสิทธิ์แก้เว็บ)                                                                                                                                          |
| **Features**          | `GET /features` (สถานะส่วนเสริมของเว็บ) · `PATCH /features` (owner/admin; ปิด/เปิด AI, สถิติ, ข่าวสาร, Apps, ร้านค้า; ถูกปิดโดยแพลตฟอร์ม = 409) |
| **License**           | `GET /license` (สถานะไลเซนส์ของ deployment; ทุก role) · `POST /public/license/verify` (ตรวจลายเซ็น Ed25519; ไม่ต้องล็อกอิน, rate limit 60/นาที) |
| **Team**              | `GET/POST /members` · `PATCH/DELETE /members/:userId`                                                                                                                                                                                                                                          |
| **SEO**               | `GET /seo/health` (คะแนน + รายการตรวจ + หน้าที่ควรแก้)                                                                                                                                                                                                                                         |
| **Analytics**         | `GET /analytics?range=7d\|30d` (ผู้เข้าชม/การเปิดหน้า + แนวโน้ม + หน้าที่ถูกเปิด/แหล่งที่มา/อุปกรณ์)                                                                                                                                                                                           |
| **Newsletter**        | `GET/POST /subscribers` · `PATCH/DELETE /subscribers/:subscriberId` · `GET /subscribers/export` (CSV)                                                                                                                                                                                          |
| **Apps**              | `GET /apps` (คลัง) · `GET /site-apps` (ที่ติดตั้ง) · `POST/PATCH/DELETE /site-apps/:appKey` · `POST /site-apps/:appKey/bridge` (sandbox เรียกผ่าน scope)                                                                                                                                       |
| **Billing**           | โควตาตามแพ็กเกจถูกบังคับใช้ที่เซิร์ฟเวอร์ (หน้า/พื้นที่ไฟล์สื่อ/ทีม) · `GET /billing` (แพ็กเกจ + โควตาที่ใช้ + ประวัติ) · `PATCH /billing/plan` (เฉพาะเจ้าของเว็บ, ใช้ได้กับแพ็กเกจฟรี) · `POST /billing/checkout` (Stripe Checkout: บัตร = ต่ออายุรายเดือน, พร้อมเพย์ = ครั้งเดียว) · `POST /billing/cancel` (หยุดต่ออายุ, ใช้ได้จนสิ้นรอบ) · `POST /billing/webhook` (ยืนยันการชำระเงิน/ต่ออายุด้วยลายเซ็น Stripe ไม่ต้องล็อกอิน)                                                                                                                                                                                                    |
| **Banking (BBL)**     | `GET/PATCH /banking/bbl` (ข้อมูลเชื่อมต่อ Payment Gateway ของธนาคารกรุงเทพ) · `POST /banking/bbl/test` · `GET /banking/bbl/transfers` (กระทบยอด) · `POST /public/banking/bbl/webhook` (callback ชำระเงิน) · `POST /banking/bbl/orders/:orderId/verify-slip` (ตัวเลือกเสริม) |
| **Backup**            | `GET /backup/export` (ไฟล์สำรองทั้งเว็บเป็น JSON) · `POST /backup/import` (นำเข้ากลับแบบไม่ทับของเดิม)                                                                                                                                                                                         |
| **AI**                | `GET /ai/status` (แพ็กเกจ + โควตาที่เหลือ) · `POST /ai/rewrite` · `POST /ai/translate` · `POST /ai/alt-text` · `POST /ai/alt-text/batch` · `POST /ai/seo` · `POST /ai/generate-site` · `POST /ai/site-command` (เปลี่ยน design tokens ทั้งเว็บ, ตอบเป็น patch + inverse patch ไม่แก้ข้อมูลเอง) · `POST /ai/block-command` (แก้ข้อความของบล็อกที่เลือก, ตอบเป็น diff ต่อ field พร้อม path) |
| **Public Delivery**   | `GET /public/:host/pages/:slug` · `/public/:host/posts` · `/public/:host/sitemap.xml` · `POST /public/:host/collect` (beacon สถิติผู้เข้าชม)                                                                                                                                                   |

## 12.2 กติกา Endpoint (ทุกตัว)

1. Controller บาง — logic อยู่ใน service
2. ทุก route (ยกเว้น `/public/*`) มี `@UseGuards(AuthGuard, SiteGuard, RolesGuard)` + `@Roles(...)`
3. DTO ใช้ Zod schema จาก `packages/shared` (ห้ามนิยามซ้ำ)
4. ทุก query กรองด้วย `site_id` (ผ่าน `this.db.forSite(siteId)` ที่ตั้ง RLS)
5. การเขียน/ลบ ต้องเรียก `audit.log({ action, target, meta })`
6. Error ตอบ `message` (ภาษาคน, th) + `code` (สำหรับ client)
7. list ต้อง paginate (`cursor` + `limit` ≤ 100)
8. endpoint สาธารณะ ต้องมี rate limit + honeypot/Turnstile

## 12.3 ตัวอย่าง Autosave (Optimistic Lock)

```http
PUT /api/v1/contents/8f2.../blocks
{ "blocks": [ ... ], "baseRevision": 41 }

→ 200 { "revision": 42, "savedAt": "2026-10-20T08:15:03Z" }
→ 409 { "error": "conflict", "message": "มีคนอื่นแก้หน้านี้ไปแล้ว" }
```

- ทุกการบันทึกแนบ `baseRevision` (revision ที่ client เห็นล่าสุด)
- ถ้า revision ใน DB สูงกว่า → ตอบ 409 ให้ client ถามผู้ใช้ (เขียนทับ / ดูเวอร์ชัน)

## 12.4 รูปแบบ Response มาตรฐาน

```json
// สำเร็จ
{ "data": { ... }, "meta": { "cursor": "..." } }

// ผิดพลาด
{ "error": "validation_error", "message": "ชื่อหน้าจำเป็นต้องกรอก", "details": [ ... ] }
```

| HTTP | `error`            | ใช้เมื่อ                     |
| ---- | ------------------ | ---------------------------- |
| 400  | `validation_error` | ข้อมูลไม่ถูกต้อง             |
| 401  | `unauthorized`     | ไม่ได้ login / token หมดอายุ |
| 403  | `forbidden`        | ไม่มีสิทธิ์ (role)           |
| 404  | `not_found`        | ไม่พบ หรือไม่ใช่ของ site นี้ |
| 409  | `conflict`         | revision ชนกัน               |
| 429  | `rate_limited`     | ยิงถี่เกิน                   |

## 12.5 Auth Flow

```
login ─▶ access token (อายุ 15 นาที) + refresh token (อายุ 24 ชั่วโมง, httpOnly)
      ─▶ เก็บ refresh ใน httpOnly cookie / secure storage
refresh ─▶ ออก access token ใหม่
```

- Argon2id สำหรับ password hash
- 2FA (TOTP) optional ต่อผู้ใช้
- ล็อกบัญชีชั่วคราวเมื่อ login ผิดซ้ำ
- OAuth: Google, LINE

## 12.6 Media Upload Flow (presigned)

```
1. client: POST /media/presign  { filename, mime, size }
2. api: ตรวจสิทธิ์ + ขนาด + mime → คืน presigned URL + mediaId (สถานะ pending)
3. client: PUT ไฟล์ตรงไป S3 (ไม่ผ่าน api)
4. client: POST /media/:id/confirm  { width, height }
5. worker: สร้าง variants (WebP/AVIF, srcset) + อัปเดต media.variants
```

สถานะที่ใช้จริง: `pending` (ออก URL แล้ว) → `processing` (ยืนยันแล้ว, รอ worker) →
`ready` (มี variants ครบ) · `failed` (ไฟล์เสีย, ยังลบ/ลองใหม่ได้) · `trashed` (ถังขยะสำหรับ undo)

- URL ที่ presign เซ็นไว้มี key + mime + ขนาด + เวลาหมดอายุอยู่ในตัว (HMAC) ดังนั้น
  endpoint รับไฟล์ (`PUT /media/upload/:token`) ไม่ต้องใช้ session — token คือสิทธิ์
- ตอนรับไฟล์จริง ตรวจ magic bytes ก่อนเขียน (JPEG/PNG/GIF/WebP/AVIF เท่านั้น) แล้วเทียบกับ mime ที่แจ้ง
- `variants` เก็บ `{ w, h, format, url, sizeBytes }` และ API คืน `srcSet` (WebP) ให้ block ใช้ตรง ๆ
- `DELETE /media/:id` เป็น soft delete (ไฟล์ยังอยู่) แล้ว `POST /media/:id/restore` คืนรูปสำหรับ toast "เลิกทำ"
- storage อยู่หลัง interface `MediaStorage`: `MEDIA_STORAGE=local` เขียนลง `MEDIA_LOCAL_DIR` และเสิร์ฟผ่าน
  `/media/*` ของ API เอง (dev) · `s3` ใช้ `S3_*` (presigned จริง) โดย client ไม่ต้องแก้

## 12.7 Public Delivery

- renderer ดึงข้อมูลผ่าน `GET /public/:host/...` (read-only, cache ได้)
- หรืออ่านจาก static ที่ worker render ไว้ (เร็วสุด)
- ต้องตั้ง cache header + ETag

### 12.7.1 E-commerce

| Endpoint | ใช้ทำอะไร |
|---|---|
| `GET /public/:host/shop` | แคตตาล็อกสินค้าที่เปิดขาย + ตั้งค่าการชำระเงิน |
| `GET /public/:host/shop/products/:slug` | รายละเอียดสินค้า + สินค้าที่คล้ายกัน |
| `POST /public/:host/shop/cart` | คิดราคาตะกร้าจากฐานข้อมูล (ไม่เขียนข้อมูล) |
| `POST /public/:host/shop/orders` | สร้างคำสั่งซื้อ; ตรวจสต็อกและราคาที่เซิร์ฟเวอร์เสมอ |
| `GET /public/:host/shop/orders/:token` | ดูคำสั่งซื้อด้วยโทเคนที่เดาไม่ได้ (ไม่ cache) |
| `POST /public/:host/shop/orders/lookup` | เปิดคำสั่งซื้อด้วยเลขคำสั่งซื้อ + เบอร์โทร/อีเมลที่ใช้สั่ง (rate limit 10/นาที, ตอบ 404 เดียวกันทั้งเลขผิดและข้อมูลติดต่อผิด) |
| `POST /public/:host/shop/orders/:token/slip` | อัปโหลดสลิปพร้อมเพย์ (ตรวจชนิด/ขนาด/ไวรัส) |
| `GET /public/:host/shop/orders/:token/receipt` | ใบเสร็จ HTML (ไม่ cache) |
| `GET /public/:host/shop/orders/:token/receipt.pdf` | ใบเสร็จ PDF จากข้อมูลชุดเดียวกัน |
| `GET /preview/:token` | หน้า draft ผ่านลิงก์ที่เซ็นแล้ว; `no-store` + `x-robots-tag: noindex` |

- `GET/POST /products`, `PATCH/DELETE /products/:id` — จัดการสินค้า (owner/admin/editor)
- `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` — ดูและเปลี่ยนสถานะคำสั่งซื้อ
- `POST /orders/:orderId/refund` — คืนเงินเต็ม/บางส่วน (owner/admin) + คืนสต็อกได้; บัตรจ่ายผ่าน Stripe คืนผ่าน payment intent และบันทึก `refunded_amount/refunded_at/refund_reason/refund_ref`
- `GET/PATCH /commerce/settings` — พร้อมเพย์ ค่าจัดส่ง และวิธีชำระเงิน (promptpay / cod / card / bbl)
- `GET/PATCH /commerce/webhook` + `POST /commerce/webhook/test` — ส่งออเดอร์/การชำระเงินออกไประบบอื่น
  (owner/admin เท่านั้น; secret เข้ารหัสที่พักและไม่ถูกส่งกลับ, URL ต้องเป็น https บนโฮสต์สาธารณะ)
  - event: `order.created`, `order.paid`, `order.status`, `order.refunded`; payload มี `site` + `order` (รายการ/ยอด/ผู้รับ/การชำระเงิน)
  - header: `x-lumio-event`, `x-lumio-delivery`, `x-lumio-timestamp`, `x-lumio-signature: sha256=<hex>` ของ `<timestamp>.<body>`
  - 4xx = ไม่ส่งซ้ำ, timeout/5xx = ลองใหม่ไม่เกิน 3 ครั้ง และไม่ทำให้ checkout/เปลี่ยนสถานะล้มเหลว
- บัตรเครดิตสร้าง Stripe Checkout Session แล้วปิดออเดอร์ด้วย webhook `checkout.session.completed`
  (ตรวจ HMAC เดิมของ billing และใช้ `metadata.orderNumber`)
- ลูกค้าจ่ายผ่าน Payment Gateway ของธนาคารกรุงเทพได้ด้วยวิธี `bbl` (บัตร/QR) และออเดอร์ปิดด้วย callback ที่เซ็นลายเซ็น (หัวข้อ 12.10)
- เมื่อร้านผูกบัญชีและเปิดตรวจอัตโนมัติ สลิปพร้อมเพย์จะถูกตรวจกับ API ธนาคารก่อนปิดออเดอร์

### 12.7.2 Membership / Paywall (ต้องมีไลเซนส์)

| Endpoint | ใช้ทำอะไร |
|---|---|
| `GET /public/:host/membership/plans` | แพ็กเกจที่เปิดขายของเว็บนั้น (cacheable) |
| `POST /public/:host/membership/readers` | สมัครบัญชีผู้อ่าน (rate limit 10/นาที + honeypot) แล้วได้โทเคนเซสชัน |
| `POST /public/:host/membership/readers/login` | เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน (10/นาที) |
| `POST /public/:host/membership/readers/forgot` | ขอลิงก์ตั้งรหัสผ่านใหม่ — ตอบเหมือนกันทุกกรณีเพื่อไม่ให้เดาว่ามีบัญชีหรือไม่ |
| `POST /public/:host/membership/readers/reset` | ตั้งรหัสผ่านใหม่ด้วยโทเคนในอีเมล (ใช้ได้ 1 ชั่วโมง) |
| `POST /public/:host/membership/readers/verify` | ยืนยันอีเมลจากลิงก์ต้อนรับ (ใช้ได้ 24 ชั่วโมง) |
| `GET /public/:host/membership/readers/me` | โปรไฟล์ผู้อ่าน + สถานะสมาชิก (ต้องส่ง `Authorization: Bearer <reader token>`) |
| `POST /public/:host/membership/checkout` | เริ่ม Stripe Subscription ของแพ็กเกจที่เลือก (แพ็กเกจฟรีเปิดให้ทันที) |
| `POST /public/membership/webhook` | Stripe webhook ของการเป็นสมาชิก (ตรวจลายเซ็นจาก raw body; เว็บมาจาก `metadata.siteId`) |

- หน้า/บทความมีฟิลด์ `access: 'public' | 'members'`; หน้าที่ยังไม่ปลดล็อกจะได้ `blocks: []`
  พร้อม `paywall: { locked: true, plans: [...] }` และถูกบังคับ `noindex`
- `GET /public/:host/pages/:slug` และ `/posts/:slug` รับ `Authorization: Bearer` ของผู้อ่านได้
  เพื่อปลดล็อกเฉพาะคนนั้น; คำตอบที่มี Authorization จะเป็น `private, no-store` เสมอ (ไม่ลง CDN)
- แอดมิน: `GET/POST /membership/plans`, `PATCH/DELETE /membership/plans/:id`,
  `GET /membership/readers`, `GET /membership/summary`, `POST /membership/readers/:id/cancel`
  (ทั้งชุดเปิดด้วย `@RequireFeature('membership')` จึงต้องมีไลเซนส์ที่ระบุ `membership`)

## 12.8 Versioning

- API ใช้ path version (`/api/v1`)
- เพิ่ม field ได้เสมอ (additive)
- breaking change → ขึ้น `/api/v2` + ประกาศล่วงหน้า 6 เดือน
- deprecate endpoint → ตอบ header `Deprecation` + `Sunset`

## 12.9 Rate Limits

| กลุ่ม                 | limit                  |
| --------------------- | ---------------------- |
| Auth (login/register) | 10/นาที/IP             |
| Public form submit    | 20/นาที/IP + Turnstile |
| Public checkout       | 20/นาที/IP + honeypot |
| Reader sign-in        | 10/นาที/IP            |
| AI endpoints          | ตาม quota แพ็กเกจ      |
| ทั่วไป (auth แล้ว)    | 300/นาที/ผู้ใช้        |

## 12.10 Bangkok Bank payment gateway

ร้านค้าเชื่อม **Payment Gateway ของธนาคารกรุงเทพ (BBL)** เพื่อให้ลูกค้าจ่ายเงินด้วยบัตรหรือ QR
บนหน้าจ่ายเงินของธนาคาร ลูกค้าเลือกวิธี "ธนาคารกรุงเทพ" ตอนชำระเงิน ระบบสร้างออเดอร์ก่อน
แล้วขอหน้าจ่ายเงินจากธนาคาร เฉพาะ **callback ที่ผ่านลายเซ็น HMAC** เท่านั้นที่ปิดออเดอร์เป็น
ชำระแล้ว — ข้อมูลบัตรไม่ผ่านระบบเรา

เจ้าของร้านกรอก Merchant ID/Client ID, Client Secret, Webhook Secret, API key (ถ้ามี),
ที่อยู่ API และโหมด sandbox ในหน้า ตั้งค่า › ร้านค้า › การชำระเงิน ไม่ต้องแก้ `.env`
ข้อมูลเก็บใน `sites.settings.banking`; ค่าลับเข้ารหัส AES-256-GCM ด้วย
`SECRETS_ENCRYPTION_KEY` ของเครื่องที่ติดตั้ง และ API ไม่ส่งค่าลับกลับมา
เปิดรับวิธีนี้ด้วยสวิตช์ `payments.bbl` ของร้าน

`notifyUrl` ที่ส่งให้ธนาคารสร้างจาก `API_PUBLIC_URL` — production ต้องเป็นโดเมน https ที่ธนาคารเรียกกลับได้

| Endpoint | ใช้ทำอะไร |
|---|---|
| `GET /banking/bbl` | สถานะการเชื่อมต่อ (โหมด `live \| sandbox \| not_configured`, `hasClientSecret`, `hasWebhookSecret`) |
| `PATCH /banking/bbl` | บันทึกข้อมูลเชื่อมต่อ (owner/admin); ช่อง secret เป็น write-only |
| `POST /banking/bbl/test` | ขอ token จากธนาคารเพื่อยืนยัน Client ID/Secret |
| `GET /banking/bbl/transfers?from=&to=&limit=` | รายการโอนเข้าเพื่อกระทบยอด (owner/admin, 24 ชม.ล่าสุด, limit ≤ 100) |
| `POST /public/banking/bbl/webhook` | Callback จากธนาคาร (ไม่มี session; ตรวจ `X-BBL-Signature: t=..,v1=..`) |
| `POST /banking/bbl/orders/:orderId/verify-slip` | ตัวเลือกเสริม: ตรวจสลิปโอนกับธนาคาร |

ลำดับการชำระเงิน:

1. `POST /public/:host/shop/orders` ด้วย `paymentMethod = bbl` → เก็บออเดอร์ + ตัดสต็อก
   แล้วขอ `paymentId` / `redirectUrl` จากธนาคาร; เก็บ `provider = bbl`, `providerRef`,
   `paymentUrl`
2. ลูกค้าจ่ายบนหน้า BBL แล้วกลับมาที่ `/order/:token`
3. BBL ส่ง callback `{ siteId, paymentId, status, amount, paidAt, transactionId }`
   เซ็นด้วย Webhook Secret ของร้านนั้น
4. ระบบตรวจลายเซ็น + ยอดเงินตรง + สถานะ `pending` → เปลี่ยนเป็น `paid` (idempotent)
   และบันทึก audit log

ถ้าธนาคารล่มตอนสร้างหน้า → ออเดอร์ถูกยกเลิกและคืนสต็อกอัตโนมัติ
ถ้า callback ไม่ผ่านลายเซ็น → 401 และไม่มีออเดอร์ใดถูกแก้

**สลิปโอนเงิน (ตัวเลือกเสริม):** เมื่อร้านผูกเลขบัญชีและเปิดตรวจอัตโนมัติ ระบบเทียบ
เลขอ้างอิง/ยอด/บัญชี/ช่วง 72 ชั่วโมงกับรายการโอนของธนาคาร ธนาคารล่ม → `unavailable`
และสลิปเข้าคิวรอตรวจ ไม่ปิดออเดอร์อัตโนมัติ

## 12.9 อีเมล, สำรองข้อมูล, 404 และ static publish

| Endpoint | ใช้ทำอะไร |
|---|---|
| `GET /email/settings` | การตั้งค่าอีเมลของเว็บ (owner/admin); secret ตอบเป็น `hasPassword`/`hasApiKey` |
| `PATCH /email/settings` | บันทึก SMTP หรือ Resend ของเว็บ; secret เข้ารหัสก่อนเก็บ |
| `POST /email/test` | ส่งอีเมลจริงหนึ่งฉบับเพื่อยืนยันการตั้งค่า |
| `GET /backup/overview` | ตารางสำรองอัตโนมัติ + snapshot ล่าสุด |
| `PATCH /backup/schedule` | เปิด/ปิด, เวลาสำรอง, จำนวนวันเก็บ |
| `POST /backup/snapshots` | สำรองเดี๋ยวนี้ |
| `GET /backup/snapshots/:id` | ดาวน์โหลด snapshot |
| `POST /public/:host/not-found` | renderer รายงาน 404 (rate limit, เก็บเฉพาะ path) |
| `GET /seo/not-found` | 20 ที่อยู่ที่เปิดไม่เจอบ่อยใน 30 วัน |

Static publish ไม่มี endpoint ฝั่งผู้ใช้: `PublishProcessor` ดึง HTML จาก renderer แล้วส่งไป
`STATIC_PUBLISH_URL` พร้อมลายเซ็น `x-lumio-signature: sha256=<hmac>` ของ
`<timestamp>.<body>`; ไม่ตั้งค่า = ข้าม

---

[← Data Model](11-data-model.md) · [ถัดไป: RBAC →](13-rbac.md)
