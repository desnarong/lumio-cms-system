# Operations checklist (production)

ใช้ก่อนเปิดบริการจริงหรือก่อนอัปเดตระบบที่มีผู้ใช้อยู่ — โดยเฉพาะเมื่อบริการที่โฮสต์มีลูกค้าใช้งานแล้ว

> รันทั้งระบบด้วย Docker: ดู [`docs/DOCKER.md`](DOCKER.md) (compose profiles, volume ที่ต้องสำรอง, migrate service)

## 1. Secrets และบัญชีเริ่มต้น

- [ ] เปลี่ยน `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PREVIEW_SECRET`,
      `MEDIA_UPLOAD_SECRET`, `REVALIDATE_SECRET`, `ANALYTICS_HASH_SALT`, `READER_SECRET`
      (ค่า `change-me-*` ใน `.env.example` ใช้สำหรับพัฒนาเท่านั้น)
- [ ] ตั้ง `SECRETS_ENCRYPTION_KEY` หรือสำรอง `.lumio-data/secrets.key` ไว้
      (ถ้าหาย ผู้ใช้ต้องกรอกคีย์ธนาคาร/ร้านค้า/อีเมลใหม่ทั้งหมด)
- [ ] ตรวจว่า **ไม่มีบัญชีทดลอง** (`owner@example.com` / `lumio-demo-1234`) ในฐานข้อมูลจริง
      หรือเปลี่ยนรหัสผ่าน/ปิดใช้งานก่อนเปิดให้คนนอกใช้
- [ ] ไม่ตั้ง `LUMIO_LICENSE_PUBLIC_KEY` — กุญแจที่ฝังในบิลด์ชนะเสมอ (ถ้าตั้ง จะขึ้น warning และถูกเพิกเฉย)
- [ ] ไลเซนส์: เจ้าของเว็บวางที่ ตั้งค่า › ไลเซนส์ (เก็บในฐานข้อมูล) — ไม่ต้องตั้ง `LUMIO_LICENSE`
      ถ้าจะปักไลเซนส์จาก config ของเครื่องจึงค่อยตั้ง (ค่า env ชนะค่าที่บันทึกไว้เสมอ)
- [ ] ไลเซนส์แบบออนไลน์: ตั้ง `LUMIO_LICENSE_SERVER` ให้ชี้เครื่องออกไลเซนส์
      (`LUMIO_LICENSE_GRACE_DAYS`, `LUMIO_LICENSE_REFRESH_HOURS` ตามสัญญา) และตรวจว่า
      `GET /v1/license` ตอบ `mode: "online"`, `bound: true`, `reason: "ok"` หลังบูต
- [ ] เครื่องออกไลเซนส์ (นอกรีโป) mount กุญแจแบบอ่านอย่างเดียว และตั้ง `ISSUER_TOKEN` ที่เดายาก
- [ ] ตลาดบล็อก: ไม่ต้องตั้ง `MARKETPLACE_PUBLIC_KEY` (กุญแจที่ฝังในบิลด์ชนะเสมอ)
      และไม่ตั้ง `MARKETPLACE_PLATFORM_DISABLED` เว้นแต่ต้องหยุดติดตั้งแพ็กชั่วคราว;
      ตั้ง `LUMIO_VERSION` ถ้าต้องการให้ตรวจ `minLumioVersion` ของแพ็ก
- [ ] กุญแจลงลายเซ็นแพ็ก (`lumio-marketplace-private.pem`) เก็บนอกเซิร์ฟเวอร์ production
- [ ] ตรวจว่าไม่มี `.env` หรือไฟล์คีย์ถูก commit (`git status`, secret scanning ของ GitHub)

## 2. ฐานข้อมูลและสิทธิ์

- [ ] ใช้ role ที่ไม่ใช่เจ้าของตารางและไม่ใช่ superuser เพื่อให้ RLS มีผลจริง
- [ ] รัน migration ด้วย `prisma migrate deploy` (ไม่ใช้ `migrate dev` บน production)
- [ ] สำรองฐานข้อมูลก่อน migrate ทุกครั้ง และทดสอบ **restore** ไม่ใช่แค่สำรอง
- [ ] ตรวจว่า `site_id` + RLS ครบทุกตารางใหม่ (ดู `docs/design/11-data-model.md`)

## 3. ไลเซนส์ผู้ขาย

- [ ] กุญแจส่วนตัว (`lumio-license-private.pem`) เก็บ **นอกเครื่อง production**
      และสำรองอย่างน้อย 2 ที่ (ดู `docs/design/24-community-licensing.md` 24.6.1)
- [ ] public key ที่ฝังใน `apps/api/src/modules/license/license.keys.ts`
      ตรงกับกุญแจที่ใช้อยู่ (fingerprint อยู่ในเอกสาร 24)
- [ ] ทดสอบ: ออกไลเซนส์ตัวอย่าง → `POST /api/v1/public/license/verify` ต้องได้ `valid: true`
- [ ] ถ้ากุญแจรั่ว: ออกกุญแจใหม่ → build release ใหม่ → ออกไลเซนส์ให้ลูกค้าใหม่ → แจ้งลูกค้า

## 4. โดเมน, TLS และ CDN

- [ ] โดเมนที่ยัง `pending` ต้องไม่ถูกออก certificate (Caddy on-demand TLS ตรวจ `domains` แล้ว)
- [ ] ทดสอบ custom domain + SSL จริง 1 โดเมนก่อนขาย
- [ ] CDN/static host ที่ลูกค้าตั้งเอง: ทดสอบปุ่ม “ทดสอบการเผยแพร่” และเว็บยังทำงานเมื่อ CDN ล่ม
- [ ] ตั้ง `PUBLIC_ROOT_DOMAIN` และ `VITE_PUBLIC_ROOT_DOMAIN` ให้ตรงโดเมนจริง
- [ ] ตั้ง `RENDERER_PUBLIC_URL` เป็นที่อยู่ renderer ที่เบราว์เซอร์เปิดได้
      (ถ้าไม่ตั้ง ปุ่มดูตัวอย่างจะ fallback ไปที่โดเมนของเว็บนั้น)

## 5. อีเมล, การชำระเงิน และ webhook

- [ ] ตั้ง SMTP/Resend ของแต่ละเว็บ หรือผู้ส่งกลาง แล้วกด “ส่งอีเมลทดสอบ”
- [ ] Stripe: ใช้ `sk_live_...` + webhook secret จริง และตรวจ event ที่ต้องรับ
      (`checkout.session.*`, `invoice.*`, `customer.subscription.*`)
- [ ] เลือกวิธีจ่ายที่รับได้ใน Stripe Dashboard › Payment methods (บัญชีใหม่ใช้ dynamic
      payment methods; ระบบจะลองส่ง `payment_method_types` แล้วถ้า Stripe ปฏิเสธจะสร้าง
      หน้าชำระเงินโดยใช้ค่าจาก Dashboard แทน — ไม่ต้องตั้ง env เพิ่ม)
- [ ] ลงทะเบียน webhook สำหรับสมาชิกผู้อ่านที่ `/api/v1/public/membership/webhook`
      (event เดียวกับ Stripe ข้างบน; เว็บมาจาก `metadata.siteId`)
- [ ] ตั้ง webhook ฝั่งลูกค้าแล้วทดสอบลายเซ็นด้วย `verifyLumioSignature()` จาก `@lumio/sdk`
- [ ] ตรวจว่าอีเมลคำสั่งซื้อ/ใบเสร็จไปถึงจริง (ไม่ตกสแปม) และ `ADMIN_ORIGIN` ถูกต้อง

## 6. สื่อและไฟล์อัปโหลด

- [ ] `MEDIA_STORAGE=s3` บน production + bucket ไม่ public ทั้งก้อน (เสิร์ฟผ่าน API/CDN ที่ควบคุม)
- [ ] `MEDIA_SCANNER=clamav` และ clamd เข้าถึงได้ (ถ้าเปิดรับอัปโหลดจากคนนอก)
- [ ] ตรวจ `MEDIA_MAX_INPUT_PIXELS` และขนาดอัปโหลดตามที่ต้องการ

## 7. การสังเกตและความพร้อม

- [ ] `/api/health` ถูก monitor และแจ้งเตือนเมื่อล่ม
- [ ] เปิด rate limit ด้วย Redis (`REDIS_URL`) เมื่อมีมากกว่า 1 instance
- [ ] เก็บ log ที่ไม่มีความลับ และตั้ง log retention
- [ ] ตรวจว่า worker (publish/media/backup/domains) รันแยกจาก API หรือ `*_INLINE` เปิดครบ

## 8. นโยบายผลิตภัณฑ์และกฎหมาย

- [ ] AGPL: ถ้าแก้โค้ดแล้วให้บริการผ่านเครือข่าย ต้องเปิดเผยโค้ดที่แก้
      (รีโปนี้คือ source ของ Community — ให้ commit เวอร์ชันที่ production ใช้)
- [ ] โมดูลที่ขายแยก (Membership/Block Marketplace) ต้องอยู่นอกรีโปนี้เพื่อไม่ให้ถูก AGPL ครอบ
- [ ] ชื่อ/โลโก้/โดเมน `example.com` ไม่ได้ให้ใช้ตามสัญญาโค้ด — ดู [`TRADEMARK.md`](../TRADEMARK.md)
- [ ] มีหน้า Privacy/Terms ของบริการที่โฮสต์เอง (Community repo ไม่ได้ให้มา)

## 9. ก่อนปล่อยรีโปสาธารณะ

- [ ] ไม่มีข้อมูลลูกค้า, ภาพหน้าจอที่มีข้อมูลจริง, ไฟล์สำรอง หรือ `.env` ในประวัติ git
- [ ] เปิด Dependabot, secret scanning, private vulnerability reporting และ branch protection
- [ ] ตรวจ `pnpm audit`, CI และ e2e ผ่านบน commit ที่จะปล่อย
- [ ] อัปเดต [`docs/PROGRESS.md`](PROGRESS.md) และ tag เวอร์ชัน

## 10. อัปเดตระบบที่มีผู้ใช้อยู่

1. สำรองฐานข้อมูล + `.lumio-data/` (หรือ `SECRETS_ENCRYPTION_KEY`)
2. `pnpm install --frozen-lockfile`
3. `pnpm --filter api exec prisma migrate deploy`
4. `pnpm build` แล้ว deploy ทีละส่วน (API → renderer → admin)
5. ตรวจ `/api/health`, เปิดหน้าเว็บตัวอย่าง 1 เว็บ, ดู error log 15 นาที
6. ถ้าผิดพลาด: rollback image ก่อน แล้วค่อยแก้ migration (ห้ามลบข้อมูลย้อนหลัง)


## กุญแจ API, การจองคิว และแบรนด์องค์กร

- **กุญแจ API** — สร้างที่ ตั้งค่า › กุญแจ API แล้วเก็บข้อความจริงทันที (แสดงครั้งเดียว).
  ส่งเป็น header `X-Api-Key` ไปที่ `GET /api/v1/public-api/pages` หรือ `/posts`.
  เพิกถอนได้ตลอด; กุญแจที่เพิกถอนตอบ 401 เหมือนกุญแจผิด
- **การจองคิว** — เปิดที่ เติบโต › การจองคิว (ฟีเจอร์ `booking` เปิดเป็นค่าเริ่มต้น).
  ลูกค้าใช้หน้า `/booking` ของเว็บ; ลิงก์ยืนยัน/ยกเลิกใช้โทเคนที่ส่งกลับหลังจอง
  อีเมลแจ้งเตือนใช้กล่อง mail ของเว็บ (ตั้งค่า › อีเมล) หรือตัวส่งของแพลตฟอร์ม
- **แบรนด์องค์กร (white-label)** — ต้องมีไลเซนส์ที่ระบุ `whitelabel`; ตั้งที่ ตั้งค่า › แบรนด์องค์กร.
  เมื่อ `hideBranding` เปิด ระบบจะไม่แสดงเครดิต Lumio ในหลังบ้าน
- ก่อนอัปเกรด ให้รัน `pnpm --filter api prisma migrate deploy` (มี migration
  `20261115000000_api_keys_booking_agency`)
