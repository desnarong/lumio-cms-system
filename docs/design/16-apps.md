# 16 — ระบบ Apps (ส่วนขยายแบบปลอดภัย)

แทน plugin แบบ WordPress ที่เขียน PHP เข้าถึง core ได้อิสระ

## 16.1 App Manifest

```json
{
  "key": "booking",
  "name": "ระบบจองคิว",
  "version": "1.2.0",
  "permissions": ["forms:read", "contents:write:own", "email:send"],
  "blocks": ["booking-widget"],
  "adminPages": [{ "title": "การจอง", "entry": "admin.html" }],
  "settingsSchema": { "...": "JSON Schema → ระบบ render ฟอร์มตั้งค่าให้อัตโนมัติ" }
}
```

## 16.2 หลักการทำงาน

- ติดตั้งคลิกเดียวจาก **App Store** ในเมนู เติบโต > Apps
- แต่ละ App ประกาศ **permissions** ผู้ใช้เห็นก่อนติดตั้ง
- Custom block จาก App ปรากฏในรายการ Block อัตโนมัติ
- ตรวจสอบโดยทีมงานก่อนขึ้น Store + ระบบ rating/รีวิว

## 16.3 Permission Scopes

| Scope | หมายถึง |
|---|---|
| `contents:read` | อ่านเนื้อหา |
| `contents:write:own` | เขียนเนื้อหาที่ App สร้างเอง |
| `forms:read` | อ่านผลฟอร์ม |
| `email:send` | ส่งอีเมลผ่านระบบ |
| `media:read` / `media:write` | อ่าน/อัปโหลดไฟล์ |
| `analytics:read` | อ่านสถิติ |

- App **ไม่มีสิทธิ์แตะ DB ตรง** — ผ่าน API ที่มี scope เท่านั้น
- ผู้ใช้เห็นรายการ scope ก่อนกดติดตั้ง + เพิกถอนได้

## 16.4 Sandbox

```
┌─ Lumio ─────────────────────────────────────┐
│  App (iframe, sandbox="allow-scripts")       │
│    ↕ postMessage (API ที่ถูก scope)          │
│  Lumio Bridge (ตรวจ scope ทุกครั้ง)          │
└─────────────────────────────────────────────┘
```

- App รันใน iframe + postMessage (หรือ WASM สำหรับ logic ที่หนัก)
- Bridge ตรวจ scope ทุก call — ไม่มี scope → ปฏิเสธ
- App ไม่เห็น token ของผู้ใช้ (Bridge เก็บให้)

## 16.5 Apps แนะนำ

Booking, Live Chat/LINE, Popup/Promo bar, Reviews, Comments, Members,
Shop, Analytics เพิ่มเติม, Instagram feed

## 16.6 Developer Flow

1. สร้าง App ด้วย `packages/sdk` (ดูสกิล `lumio-app-sdk`)
2. ประกาศ manifest + permissions ที่จำเป็นจริง (ขอเกิน = ไม่ผ่าน review)
3. ทดสอบใน sandbox
4. ส่ง review → ทีมงานตรวจความปลอดภัย + UX
5. เผยแพร่บน Store + ตั้งราคา (ฟรี/จ่าย)

## 16.7 กติกาความปลอดภัยของ App

- ห้ามเข้าถึงข้อมูลข้ามเว็บ (scope ผูกกับ site ที่ติดตั้ง)
- ห้ามส่งข้อมูลผู้ใช้ออกนอกโดยไม่แจ้ง
- ต้องแจ้งใน Store ว่าเก็บข้อมูลอะไรบ้าง
- ระบบมี **kill switch** ปิด App ได้ทั้งแพลตฟอร์มหากพบปัญหา

---

## 16.8 Block Marketplace (ชุดส่วนจากภายนอก)

ตลาดบล็อกขาย **ชุดส่วนสำเร็จรูป** (section packs) ไม่ใช่โค้ดที่รันบนเว็บ —
ส่วนหนึ่ง ๆ คือ block tree ที่ประกอบจากบล็อกที่ Lumio มีอยู่แล้วเท่านั้น

- **รูปแบบแพ็ก** (`marketplacePackSchema` ใน `packages/shared`): `v`, `key`, `name`,
  `version` (semver), `author`, `sections[]` และฟิลด์เสริม `homepage` / `license` /
  `minLumioVersion` — schema เป็น `strict()` ฟิลด์แปลกปลอม (entry script, สิทธิ์ ฯลฯ)
  ถูกปฏิเสธ ไม่ใช่ถูกเมิน
- **ลายเซ็น** — แพ็กภายนอกต้องมาเป็นโทเคน `lumio_pack_v1.<payload>.<signature>`
  (Ed25519) ตรวจด้วยกุญแจสาธารณะที่ฝังในบิลด์ (`marketplace.keys.ts`,
  override ด้วย `MARKETPLACE_PUBLIC_KEY` ได้เฉพาะ non-production) ก่อนบันทึกทุกครั้ง
- **สิทธิ์** — เปิดทั้งชุดด้วย `@RequireFeature('marketplace')` จึงต้องมีไลเซนส์ที่ระบุ
  `marketplace`; owner/admin ติดตั้ง/ถอน/เปิดปิดได้, editor เห็นเฉพาะส่วนที่ติดตั้งแล้ว
  ฝั่งแพลตฟอร์มมี kill switch `MARKETPLACE_PLATFORM_DISABLED`
- **ทำไมถอนแล้วหน้าไม่พัง** — แพ็กอ้างได้เฉพาะ `BUILTIN_BLOCK_TYPES` (มีเทสต์กันรายการ
  หลุดจาก `@lumio/blocks`) บล็อกที่ใช้จึงยังอยู่ในบิลด์เสมอ; ถ้าไม่มีจริง renderer
  แสดง `UnknownBlock` แทนที่จะ throw
- **การติดตั้ง** — `POST /marketplace/installs` รับ `{ key }` (แพ็กทางการที่มากับบิลด์)
  หรือ `{ token }` (แพ็กภายนอก) อัปเดตในที่เมื่อเวอร์ชันใหม่กว่า, ทุกครั้งเขียน audit
  (`marketplace.pack.install|update|enable|disable|remove`) และข้อมูลอยู่ใน RLS ต่อเว็บ
- **เครื่องมือผู้ขาย** — `node scripts/marketplace-keygen.mjs` และ
  `node scripts/marketplace-pack.mjs --key … --file pack.json`

[← Security](15-security.md) · [ถัดไป: i18n →](17-i18n.md)
