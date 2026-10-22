---
name: lumio-db-migration
description: Use when changing the Prisma schema, creating tables/indexes, or writing SQL migrations in Lumio. Ensures site_id, RLS policies, indexes, and safe (non-destructive) migrations.
---

# Lumio DB Migration

อ่าน [`docs/design/11-data-model.md`](../../docs/design/11-data-model.md) ประกอบ

## Checklist ตารางใหม่

- [ ] มี `id UUID default gen_random_uuid()`
- [ ] มี `site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE` (ยกเว้นตารางระดับแพลตฟอร์ม)
- [ ] มี `created_at`, `updated_at`
- [ ] `ENABLE ROW LEVEL SECURITY` + policy `site_isolation` (ดูตัวอย่างในตาราง `contents`)
- [ ] Index สำหรับ query หลัก (เช่น `(site_id, status, published_at DESC)`)
- [ ] ข้อมูลยืดหยุ่นใช้ `JSONB` และมี Zod schema คู่กัน
- [ ] มี Prisma model ที่ตรงกัน + seed

## การเปลี่ยนแปลงที่ปลอดภัย

- เพิ่มคอลัมน์ใหม่เป็น nullable หรือมี default ก่อน แล้วค่อย backfill แล้วค่อยใส่ NOT NULL
- ห้าม `DROP COLUMN`/`DROP TABLE` ใน migration เดียวกับที่ลบโค้ดที่ใช้อยู่ — แยกเป็น 2 release
- Index ขนาดใหญ่ใช้ `CREATE INDEX CONCURRENTLY` (migration แยกไฟล์)

## ขั้นตอน

1. แก้ `schema.prisma`
2. `pnpm --filter api prisma migrate dev --name <ชื่อสื่อความหมาย>`
3. เปิดไฟล์ SQL ที่สร้าง แล้วเพิ่ม RLS/policy/index ที่ Prisma ไม่ได้สร้างให้
4. อัปเดต seed (`prisma/seed.ts`) และตัวอย่างใน template
5. รัน test ที่แตะตารางนั้น + ทดสอบ RLS (ผู้ใช้ site A อ่านข้อมูล site B ไม่ได้)

## ตรวจสอบ

```bash
pnpm --filter api prisma migrate dev
pnpm --filter api test
pnpm --filter api typecheck
```
