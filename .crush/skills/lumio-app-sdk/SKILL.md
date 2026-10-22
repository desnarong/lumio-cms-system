---
name: lumio-app-sdk
description: Use when building or modifying a Lumio App or extension (manifest.json, custom blocks, admin pages, settings schema). Enforces permission scopes, iframe+postMessage sandboxing, and the rule that Apps never touch the database directly.
---

# Lumio App SDK

อ่าน [`docs/design/16-apps.md`](../../docs/design/16-apps.md) ประกอบ

## App Manifest

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

## Permission Scopes (ขอเท่าที่ใช้จริง)

| Scope | หมายถึง |
|---|---|
| `contents:read` | อ่านเนื้อหา |
| `contents:write:own` | เขียนเนื้อหาที่ App สร้างเอง |
| `forms:read` | อ่านผลฟอร์ม |
| `email:send` | ส่งอีเมลผ่านระบบ |
| `media:read` / `media:write` | อ่าน/อัปโหลดไฟล์ |
| `analytics:read` | อ่านสถิติ |

## กฎเหล็ก

1. App **ห้ามแตะ DB ตรง** — ผ่าน API ที่มี scope เท่านั้น
2. App รันใน sandbox (`iframe` + `postMessage` หรือ WASM) ไม่มี `allow-same-origin`
3. App ไม่เห็น token ของผู้ใช้ — Bridge เก็บและตรวจ scope ให้
4. ห้ามเข้าถึงข้อมูลข้ามเว็บ (scope ผูกกับ site ที่ติดตั้ง)
5. ห้ามส่งข้อมูลผู้ใช้ออกนอกโดยไม่แจ้งใน Store
6. Custom block ต้องทำตามสกิล `lumio-block-creator`

## Bridge (การเรียก API จาก App)

```ts
// ฝั่ง App
const result = await lumio.request("contents.list", { type: "post", limit: 10 });
// ฝั่ง Bridge: ตรวจ scope ของ App ก่อนทุกครั้ง; ไม่มี scope -> ปฏิเสธ
```

## ขั้นตอน

1. สร้าง App ด้วย `packages/sdk`
2. ประกาศ manifest + permissions ที่จำเป็นจริง (ขอเกิน = ไม่ผ่าน review)
3. สร้าง custom block (ถ้ามี) ตามสกิล `lumio-block-creator`
4. สร้าง `settingsSchema` (JSON Schema) ให้ระบบ render ฟอร์มตั้งค่าเอง
5. ทดสอบใน sandbox: scope ถูกปฏิเสธเมื่อไม่ประกาศ, ข้ามเว็บไม่ได้

## ตรวจสอบ

```bash
pnpm --filter @lumio/sdk test
pnpm --filter @lumio/sdk typecheck
pnpm lint
```

## ห้าม

- ห้ามขอ permission เกินความจำเป็น
- ห้ามฝัง secret ของผู้ใช้ในโค้ด App
- ห้ามใช้ `allow-same-origin` ใน iframe
