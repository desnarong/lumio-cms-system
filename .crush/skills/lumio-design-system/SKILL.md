---
name: lumio-design-system
description: Use when building or styling any UI in Lumio admin or public blocks — components, colors, spacing, typography, dark mode, motion. Keeps the interface beautiful and consistent via design tokens.
---

# Lumio Design System

อ่าน [`references/tokens.md`](references/tokens.md) เพื่อดูรายการ token ทั้งหมดก่อนเริ่มทุกครั้ง
อ่าน [`docs/design/06-design-system.md`](../../docs/design/06-design-system.md) ประกอบ

## กฎ

1. **ใช้ token เสมอ** — สี `var(--color-primary)`, `var(--color-surface)`, `var(--color-text)`;
   มุม `var(--radius-*)`; เงา `var(--shadow-*)`
2. Spacing ตามกริด 8px (4, 8, 12, 16, 24, 32, 48, 64)
3. ฟอนต์: Noto Sans Thai / Inter, line-height ภาษาไทย ≥ 1.6
4. ทุกหน้ามีปุ่ม Primary ได้ไม่เกิน 1 ปุ่ม
5. ต้องมีครบ 4 สถานะ: loading (skeleton), empty (ภาพ + ปุ่มชวนทำต่อ),
   error (ข้อความภาษาคน + ปุ่มลองใหม่), success
6. รองรับ Light/Dark ด้วยการสลับ token ไม่ใช้สี hard-code
7. Animation 150–250ms และต้องเคารพ `prefers-reduced-motion`
8. ปุ่ม/ลิงก์ทุกตัวใช้คีย์บอร์ดได้, focus ring ชัดเจน, contrast ≥ 4.5:1
9. ใช้ component จาก `packages/ui` ก่อน ถ้าไม่มีให้สร้างใหม่ที่นั่น (พร้อม story)

## ใช้ component ไหน

| ต้องการ | ใช้ |
|---|---|
| ปุ่ม | `Button` (Primary ≤ 1/หน้า, Secondary, Ghost, Danger) |
| ฟอร์ม | `TextField`, `Textarea`, `Select`, `Switch`, `Slider` |
| เลือกสื่อ/ลิงก์ | `ImagePicker`, `LinkPicker`, `ColorPicker` |
| แจ้งเตือน | `Toast` (มีปุ่มเลิกทำ), `Banner` |
| ยืนยัน/ฟอร์มยาว | `Modal`, `Drawer` |
| ตารางข้อมูล | `Table` (เรียง/ค้นหา/กรอง) |

## ก่อนจบงาน

- ตรวจที่ความกว้าง 375 / 768 / 1280px
- ตรวจ Dark mode
- รัน `pnpm --filter @lumio/ui test` และ a11y check
