---
name: lumio-api-endpoint
description: Use when adding or changing a REST endpoint, DTO, service, or guard in apps/api (NestJS). Enforces site scoping, RBAC, validation, audit logging, and tests.
---

# Lumio API Endpoint

อ่าน [`docs/design/12-api.md`](../../docs/design/12-api.md) และ
[`docs/design/13-rbac.md`](../../docs/design/13-rbac.md) ประกอบ

## โครงโมดูล

`apps/api/src/modules/<name>/` → `<name>.module.ts`, `.controller.ts`, `.service.ts`, `dto/`, `*.spec.ts`

มี template ใน [`templates/`](templates/) — คัดลอกแล้วแก้

## กติกา

1. Controller บาง — logic อยู่ใน service
2. ทุก route ต้องมี `@UseGuards(AuthGuard, SiteGuard, RolesGuard)` และ `@Roles(...)`
   ยกเว้นกลุ่ม `/public/*`
3. DTO ใช้ Zod schema จาก `packages/shared` (ห้ามนิยามซ้ำ)
4. ทุก query ต้องกรองด้วย `site_id` (ใช้ `this.db.forSite(siteId)` ที่ตั้งค่า RLS ให้)
5. การเขียน/ลบ ต้องเรียก `audit.log({ action, target, meta })`
6. Error ตอบเป็นภาษาคนใน `message` (th) พร้อม `code` สำหรับ client
7. รายการ (list) ต้อง paginate (`cursor` + `limit` ≤ 100)
8. Endpoint สาธารณะ (form submit ฯลฯ) ต้องมี rate limit + honeypot/Turnstile

## รูปแบบ Response มาตรฐาน

```json
// สำเร็จ
{ "data": { ... }, "meta": { "cursor": "..." } }
// ผิดพลาด
{ "error": "validation_error", "message": "ชื่อหน้าจำเป็นต้องกรอก", "details": [] }
```

## ขั้นตอน

1. เพิ่ม/แก้ schema ใน `packages/shared`
2. สร้าง/แก้ module, controller, service
3. อัปเดต OpenAPI decorators
4. เขียน test: happy path, ไม่มีสิทธิ์ (403), ข้ามเว็บ (ต้องมองไม่เห็นข้อมูลของ site อื่น), validation error
5. อัปเดตตาราง API ในเอกสาร (หัวข้อ 12) ถ้าเพิ่ม endpoint ใหม่

## ตรวจสอบ

```bash
pnpm --filter api test && pnpm --filter api typecheck && pnpm lint
```
