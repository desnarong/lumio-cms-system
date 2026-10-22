---
name: lumio-architecture
description: Use when placing new modules, deciding where code should live, or adding a cross-package dependency in Lumio. Covers the monorepo layout, the responsibility boundary between admin/api/renderer/worker, and the allowed import graph.
---

# Lumio Architecture

อ่าน [`docs/design/10-architecture.md`](../../docs/design/10-architecture.md) เมื่อต้องตัดสินใจเชิงโครงสร้าง

## แผนผัง (อ้างอิงหัวข้อ 10.2)

```
CDN ─▶ Renderer (Next.js, read-only)
Admin SPA ─▶ API (NestJS) ─▶ PostgreSQL / Redis / S3
                         └─▶ Worker (BullMQ: รูป / อีเมล / backup / publish)
```

## ขอบเขตความรับผิดชอบ

| ส่วน | รับผิดชอบ | ห้ามทำ |
|---|---|---|
| `apps/admin` | UI แก้ไข, ยิง API | ต่อ DB ตรง, render public site |
| `apps/api` | business logic, auth, validate | render HTML ของ public site |
| `apps/renderer` | render public site จาก block JSON | เขียนข้อมูล (read-only) |
| `apps/worker` (ใน api) | งานเบื้องหลัง | รับ HTTP จากผู้ใช้ |

## กฎการ import ข้ามแพ็กเกจ

```
apps/*          → packages/*                              (ได้)
packages/ui     → packages/tokens                         (ได้)
packages/blocks → packages/ui, tokens, shared             (ได้)
packages/shared → (leaf — ห้าม import ภายใน)               (บังคับ)
renderer        → blocks, ui, tokens, shared
admin           → blocks, ui, tokens, shared, sdk
```

- **ห้าม** `packages/*` import จาก `apps/*` (ทิศทางเดียว)
- **ห้าม** `packages/shared` import อะไรภายใน (กัน circular)
- ตรวจจริงด้วย `pnpm lint` (dependency-cruiser / eslint-plugin-boundaries)

## วิธีตัดสินว่าโค้ดควรอยู่ไหน

| คำถาม | คำตอบ → ที่อยู่ |
|---|---|
| ใช้ซ้ำได้ทั้ง admin และ renderer? | `packages/*` |
| เป็น UI ทั่วไป? | `packages/ui` |
| เกี่ยวกับ block? | `packages/blocks` |
| เป็น schema/type ที่ใช้ร่วม? | `packages/shared` |
| เฉพาะหน้าจอ admin? | `apps/admin` |
| เป็น business logic / API? | `apps/api` |
| เป็นการ render เว็บจริง? | `apps/renderer` |

## ขั้นตอนเพิ่มโมดูลใหม่

1. ตัดสินว่าเป็น `apps/*` หรือ `packages/*` ด้วยตารางด้านบน
2. ถ้าเป็นแพ็กเกจใหม่: เพิ่มใน `pnpm-workspace.yaml` + `tsconfig` paths
3. อัปเดตกฎ import (ถ้าจำเป็น) และอย่าให้เกิด circular
4. เขียน test + typecheck

## ตรวจสอบก่อนจบ

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## ห้าม

- ห้ามเพิ่ม dependency ข้ามชั้นที่ผิดทิศทาง
- ห้ามให้ `renderer` เขียนข้อมูล
- ห้ามให้ `admin` ต่อ DB ตรง
