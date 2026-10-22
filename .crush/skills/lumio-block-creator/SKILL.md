---
name: lumio-block-creator
description: Use when creating or modifying a page block in Lumio (Hero, Pricing, FAQ, Gallery, etc.) — covers Zod schema, renderer, editor panel, registry entry, default content, and tests.
---

# Lumio Block Creator

Block = หน่วยเนื้อหาที่ลากวางได้ ทุก block อยู่ใน `packages/blocks/src/<name>/`
อ่าน [`docs/design/07-blocks.md`](../../docs/design/07-blocks.md) ประกอบ

## ไฟล์ที่ต้องสร้างครบ 5 ไฟล์

1. `schema.ts`   — Zod schema ของ `props` + `style` + `version`
2. `Block.tsx`   — renderer (ใช้ได้ทั้ง SSR ใน renderer และ editor)
3. `Panel.tsx`   — แผงตั้งค่าด้านข้าง (ใช้ component จาก `packages/ui` เท่านั้น)
4. `defaults.ts` — ค่าเริ่มต้นที่ "สวยตั้งแต่ยังไม่แก้" (ข้อความไทยตัวอย่างจริง ไม่ใช่ lorem ipsum)
5. `index.ts`    — export + ลงทะเบียนใน `packages/blocks/src/registry.ts`

มี template เริ่มต้นใน [`templates/`](templates/) — คัดลอกแล้วแก้

## ขั้นตอน

1. อ่านตัวอย่างจาก block ที่มีอยู่ (เช่น `hero`) เพื่อใช้โครงเดียวกัน
2. เขียน `schema.ts` — ใส่ `version: z.literal(1)` เสมอ
   ถ้าเปลี่ยนโครงสร้างภายหลังให้เพิ่ม migration ใน `migrations.ts`
3. เขียน `Block.tsx`
   - ใช้ design tokens (`var(--color-primary)` ฯลฯ) ห้าม hard-code สี
   - แก้ข้อความ inline ได้ผ่าน `<Editable path="props.heading" />`
   - รองรับ responsive (mobile-first) และ `style.visibility`
   - รูปทุกรูปต้องใช้ `<Img>` (lazy, srcset, alt บังคับ)
4. เขียน `Panel.tsx` — จัดกลุ่มเป็น "เนื้อหา / หน้าตา / ขั้นสูง"
   ตัวเลือกขั้นสูงซ่อนไว้ใน mode Pro ขึ้นไป
5. ลงทะเบียน: `registry.register({ type, label, icon, category, schema, Block, Panel, defaults })`
6. เขียน test: schema ผ่านค่า default, snapshot render, a11y (axe) ไม่มี violation

## Data loader (เฉพาะ block ที่ดึงข้อมูล)

Block ที่ดึงข้อมูล (Latest posts, Blog list, Search) ต้องประกาศ loader แทนการเรียก API:

```ts
registry.registerLoader("latest-posts", async (ctx, { limit }) =>
  ctx.db.posts.latest({ siteId: ctx.siteId, limit }));
```

## ตรวจสอบก่อนจบ

```bash
pnpm --filter @lumio/blocks test
pnpm --filter @lumio/blocks typecheck
pnpm lint
```

## ห้าม

- ห้ามใช้ `dangerouslySetInnerHTML` ถ้าไม่ผ่าน `sanitizeHtml()`
- ห้ามเรียก API ตรงจาก Block (ข้อมูลไดนามิกต้องมาจาก data loader ที่ลงทะเบียนไว้)
- ห้าม hard-code สี/ขนาด — ใช้ token
- ห้ามลบฟิลด์ใน schema ทันที — deprecate ก่อน 1 release
