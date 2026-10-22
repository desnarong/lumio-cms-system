# 08 — Theme & Design Panel

## 8.1 Design Panel (ทางลัดแทนการแก้ CSS)

| ตัวเลือก | หน้าตา |
|---|---|
| **สีหลัก / รอง** | Color picker + พาเลทแนะนำ 24 ชุด + "ดึงสีจากโลโก้" |
| **ฟอนต์** | คู่ฟอนต์สำเร็จรูป 12 คู่ (Heading + Body) พร้อมตัวอย่างสด |
| **มุมโค้ง** | สไลเดอร์ เหลี่ยม ↔ โค้งมาก |
| **ปุ่ม** | Solid / Outline / Soft / Gradient |
| **ระยะห่าง** | Compact / Comfortable / Spacious |
| **โหมดสี** | Light / Dark / Auto |
| **Animation** | ปิด / นุ่มนวล / เด่น |

เปลี่ยนค่าแล้ว **เห็นผลทันทีทั้งเว็บ** (Live preview) — เก็บเป็น Design Tokens ใน `site.theme_tokens`

### โครงสร้าง `theme_tokens`

```json
{
  "colors": { "primary": "#6366F1", "accent": "#F472B6", "neutral": "slate" },
  "fonts": { "heading": "Plus Jakarta Sans", "body": "Noto Sans Thai" },
  "radius": "md",
  "button": "solid",
  "density": "comfortable",
  "colorMode": "auto",
  "animation": "soft"
}
```

### พฤติกรรม
- เปลี่ยน token → renderer ฉีด CSS variables ใหม่ → **ไม่ต้อง rebuild** หน้า (หรือ ISR revalidate)
- มี **ปุ่มรีเซ็ต** กลับค่าเริ่มต้นของ template
- ทุกการเปลี่ยนมี preview แบบ debounce (ไม่ยิงทุก keystroke)

## 8.2 Template

- ผู้ใช้เปลี่ยน Template ได้ **โดยเนื้อหาไม่หาย** (เพราะแยก content ออกจาก presentation)
- Template = ชุด Tokens + Header/Footer + Section styles + หน้าตัวอย่าง
- Template แบ่งตามธุรกิจ: ร้านอาหาร, คลินิก, ที่ปรึกษา, ร้านค้า, Portfolio, บล็อก, อีเวนต์ ฯลฯ

### โครง Template

```
templates/<name>/
├─ manifest.json        # ชื่อ, ประเภทธุรกิจ, ภาพตัวอย่าง
├─ tokens.json          # ค่าเริ่มต้นของ theme_tokens
├─ global-blocks.json   # header / footer
├─ section-styles.json  # ค่า style เริ่มต้นของแต่ละ block
├─ pages/               # หน้าตัวอย่าง (JSON blocks) + เนื้อหาไทยจริง
└─ preview.png
```

### การเปลี่ยน Template (ต้องไม่ทำเนื้อหาหาย)

1. เก็บ token/global blocks ชุดใหม่
2. **ไม่แตะ** `contents.blocks_*` (เนื้อหาผู้ใช้)
3. ถามผู้ใช้ว่าจะใช้ header/footer ของ template ใหม่ไหม
4. แสดง preview ก่อนยืนยัน + บอกชัดว่า "เนื้อหาจะไม่หาย"

## 8.3 Header / Footer

- จัดการเป็น **global blocks** ที่ใช้ซ้ำทุกหน้า (ตาราง `global_blocks`)
- แก้ที่เดียว → อัปเดตทุกหน้า
- มี variant: sticky / transparent-on-hero / minimal

## 8.4 Navigation Menu

- ลากวางเรียงลำดับ + ซ้อนชั้น (dropdown) ได้
- item อ้างได้ทั้งหน้า (`contentId`) หรือ URL ภายนอก
- เก็บในตาราง `menus.items` เป็น tree

## 8.5 กติกา Design Tokens (สำหรับนักพัฒนา)

1. Component ห้าม hard-code สี/ขนาด — ใช้ semantic token (ดู [06](06-design-system.md))
2. Token ที่ผู้ใช้แก้ได้ (ผ่าน Design Panel) ต้องอยู่ใน `theme_tokens`
3. Token ที่ผู้ใช้แก้ไม่ได้ (structural) อยู่ในโค้ด design system
4. การเพิ่มตัวเลือกใน Design Panel ต้องเพิ่ม semantic token รองรับก่อน

---

[← Block System](07-blocks.md) · [ถัดไป: AI Assistant →](09-ai-assistant.md)
