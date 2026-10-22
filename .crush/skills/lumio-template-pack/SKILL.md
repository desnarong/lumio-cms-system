---
name: lumio-template-pack
description: Use when creating or modifying a Lumio Template (a pack of design tokens, header/footer, section styles, and sample pages). Ensures switching templates never loses user content and that samples use real Thai content per business type.
---

# Lumio Template Pack

อ่าน [`docs/design/08-theme-design-panel.md`](../../docs/design/08-theme-design-panel.md) ประกอบ

## โครง Template

```
templates/<name>/
├─ manifest.json        # ชื่อ, ประเภทธุรกิจ, ภาพตัวอย่าง
├─ tokens.json          # ค่าเริ่มต้นของ theme_tokens
├─ global-blocks.json   # header / footer
├─ section-styles.json  # ค่า style เริ่มต้นของแต่ละ block
├─ pages/               # หน้าตัวอย่าง (JSON blocks) + เนื้อหาไทยจริง
└─ preview.png
```

## กฎเหล็ก

1. **สลับ Template แล้วเนื้อหาผู้ใช้ต้องไม่หาย** — ห้ามแตะ `contents.blocks_*`
2. Template = tokens + global blocks + section styles + หน้าตัวอย่าง
3. เนื้อหาตัวอย่างต้องเป็น **ภาษาไทยจริงตามประเภทธุรกิจ** (ไม่ใช่ lorem ipsum)
4. ใช้ semantic tokens เท่านั้น (ดูสกิล `lumio-design-system`)
5. ต้องมีหน้าเริ่มต้นอย่างน้อย 4–5 หน้า (หน้าแรก, บริการ, เกี่ยวกับ, ติดต่อ, บทความ)
6. ต้องผ่าน Lighthouse ≥ 90 โดยไม่ปรับอะไร

## หน้าตัวอย่างตามประเภทธุรกิจ

| ประเภทธุรกิจ | หน้าที่ควรมี |
|---|---|
| ร้านอาหาร | หน้าแรก, เมนู, จองโต๊ะ, ที่ตั้ง, ติดต่อ |
| คลินิก | หน้าแรก, บริการ, ทีมแพทย์, นัดหมาย, ติดต่อ |
| ฟรีแลนซ์ | Portfolio, บริการ, เกี่ยวกับ, ติดต่อ |
| ร้านค้า | หน้าแรก, สินค้า, โปรโมชัน, ติดต่อ |
| บล็อก | หน้าแรก, บทความ, เกี่ยวกับ, ติดต่อ |

## ขั้นตอน

1. สร้างโฟลเดอร์จาก template ที่ใกล้ที่สุด
2. ตั้งค่า `manifest.json` (ชื่อ + ประเภทธุรกิจ)
3. นิยาม `tokens.json` — สี/ฟอนต์/มุมโค้ง/ปุ่ม/ระยะห่าง
4. สร้าง `global-blocks.json` (header/footer)
5. สร้างหน้าตัวอย่างด้วย block ที่ลงทะเบียนแล้ว + ข้อความไทยจริง
6. ทดสอบ: สลับ template แล้วเนื้อหาหายไหม + Lighthouse

## ตรวจสอบ

```bash
pnpm --filter @lumio/blocks test
pnpm typecheck
npx lighthouse-ci autorun
```

## ห้าม

- ห้าม hard-code สี/ขนาดในหน้าตัวอย่าง — ใช้ token
- ห้ามผูกหน้าตัวอย่างกับ content id ของผู้ใช้
- ห้ามใช้ข้อความ placeholder ภาษาอังกฤษ
