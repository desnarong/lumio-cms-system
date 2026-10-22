---
name: lumio-editor-ux
description: Use when building or changing Editor, Dashboard, Onboarding Wizard, or any UI copy in Lumio. Enforces the UX rules (undo instead of confirm, business language, one primary button, business terms over technical jargon) and Thai UI text.
---

# Lumio Editor UX

อ่าน [`docs/design/04-ux.md`](../../docs/design/04-ux.md) และ
[`docs/design/05-admin-ia.md`](../../docs/design/05-admin-ia.md) ประกอบ

## กฎ UX ที่ต้องรักษา

1. ทุกการกระทำสำคัญ **ยกเลิกได้** — ใช้ Toast "ลบแล้ว — [เลิกทำ]" แทน Confirm dialog
2. ข้อความ error เป็นภาษาคน เช่น "รูปใหญ่เกินไป ลองใช้รูปไม่เกิน 10MB" ไม่ใช้รหัส error
3. Empty state ต้องมีภาพประกอบ + ปุ่มชวนทำต่อ
4. ทุกหน้า admin มีไม่เกิน **1 ปุ่ม Primary**
5. ใช้ภาษาธุรกิจ ไม่ใช้ศัพท์เทคนิค
6. รองรับ Keyboard shortcut + Accessibility (WCAG 2.1 AA)
7. Progressive disclosure: ตัวเลือกขั้นสูงซ่อนในโหมด Pro ขึ้นไป

## ใช้คำไหน (บังคับ)

| อย่าใช้ | ใช้แทน |
|---|---|
| Post type | หน้า / บทความ |
| Slug | ชื่อลิงก์ |
| Taxonomy / term | หมวดหมู่ / แท็ก |
| Widget / Shortcode | ส่วน / Block |
| Permalink | ที่อยู่หน้าเว็บ |
| Publish | เผยแพร่ |

## ข้อความมาตรฐาน (คัดลอกได้)

| สถานการณ์ | ข้อความ |
|---|---|
| ลบสำเร็จ | "ลบแล้ว — เลิกทำ" |
| รูปใหญ่เกิน | "รูปใหญ่เกินไป ลองใช้รูปไม่เกิน 10MB" |
| ชนกัน | "มีคนอื่นแก้หน้านี้อยู่ ต้องการเขียนทับไหม?" |
| บันทึกอัตโนมัติ | ไม่ต้อง toast |

## Editor (edit-on-page) — ต้องมี

- แถบเครื่องมือลอย: Edit / Design / Pages / Publish
- คลิกข้อความ = inline edit, คลิกรูป = เปลี่ยนรูป
- ปุ่ม ＋ ระหว่าง block, handle ⋮⋮ ลากเรียง, พิมพ์ `/` เรียก slash menu
- Responsive toggle 📱💻🖥
- Undo/Redo ไม่จำกัด + Autosave ทุก 2 วินาที
- สถานะ Publish ชัดเจน (● Draft / ✓ Published)

## Dashboard — หลักการ

- ทุกการ์ดกดแล้วทำต่อได้ (ห้ามข้อมูลที่ดูได้อย่างเดียว)
- สถิติแสดงแนวโน้ม (↑/↓ %)
- "3 สิ่งที่ควรแก้" เรียงตามผลกระทบ
- โหลดด้วย skeleton ทันที + ดึงข้อมูลขนาน

## ตรวจสอบก่อนจบ

- ทดสอบ flow ด้วยคีย์บอร์ด
- ตรวจว่าไม่มีศัพท์เทคนิคหลุดในข้อความ UI
- ตรวจว่ามีปุ่ม Primary ไม่เกิน 1 ปุ่ม/หน้า
- `pnpm --filter @lumio/ui test` + a11y check
