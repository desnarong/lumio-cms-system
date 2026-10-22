# 06 — Design System

## 6.1 หลักการภาพ

- **Clean, airy, soft** — พื้นที่ว่างเยอะ มุมโค้งนุ่ม เงาบางๆ
- ใช้สีน้อย: 1 Primary + Neutral + สถานะ (success/warn/danger)
- ภาพประกอบสไตล์ 3D-soft / flat gradient ใน empty state
- Micro-interaction ละมุน (ไม่เกิน 200ms)

## 6.2 Color Tokens

```css
:root {
  /* Brand */
  --brand-50:  #EEF2FF;
  --brand-100: #E0E7FF;
  --brand-500: #6366F1;   /* Primary (Indigo) */
  --brand-600: #4F46E5;
  --brand-700: #4338CA;

  /* Accent */
  --accent-500: #F472B6;  /* Pink สำหรับ highlight/AI */
  --gradient-ai: linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #F472B6 100%);

  /* Neutral (Light) */
  --bg:        #F8FAFC;
  --surface:   #FFFFFF;
  --border:    #E2E8F0;
  --text:      #0F172A;
  --text-muted:#64748B;

  /* Status */
  --success:#10B981; --warning:#F59E0B; --danger:#EF4444; --info:#3B82F6;

  /* Shape & Shadow */
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 20px; --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgba(15,23,42,.06);
  --shadow-md: 0 8px 24px rgba(15,23,42,.08);
  --shadow-lg: 0 20px 48px rgba(15,23,42,.14);
}

[data-theme="dark"] {
  --bg:#0B1020; --surface:#131A2E; --border:#243049;
  --text:#E8ECF6; --text-muted:#94A3B8;
}
```

### Semantic tokens (ใช้ตัวนี้ใน component)

| Semantic token | อ้างถึง | ใช้กับ |
|---|---|---|
| `--color-primary` | `--brand-500` | ปุ่มหลัก, ลิงก์, focus |
| `--color-primary-hover` | `--brand-600` | hover/active |
| `--color-bg` | `--bg` | พื้นหลังหน้า |
| `--color-surface` | `--surface` | การ์ด, modal |
| `--color-border` | `--border` | เส้นขอบ |
| `--color-text` | `--text` | ข้อความหลัก |
| `--color-text-muted` | `--text-muted` | ข้อความรอง |
| `--color-success/warning/danger/info` | status | สถานะ |

**กติกา**: component **ห้าม** อ้าง `--brand-500` ตรงๆ ให้ใช้ `--color-primary`
เพื่อให้เปลี่ยนแบรนด์/ธีมได้โดยไม่แก้ component

## 6.3 Typography

| ใช้กับ | ฟอนต์ |
|---|---|
| UI ภาษาไทย+อังกฤษ | **Noto Sans Thai** / **IBM Plex Sans Thai** + **Inter** |
| หัวข้อเด่น (Admin) | **Plus Jakarta Sans** / **Prompt** |
| Code | JetBrains Mono |

Scale: 12 / 14 / 16 / 20 / 24 / 32 / 40 px — line-height 1.5
(ไทยต้องการ **1.6** เพื่อไม่ให้สระชน)

| Token | Size | Line-height | ใช้กับ |
|---|---|---|---|
| `--text-xs` | 12px | 1.5 | label, caption |
| `--text-sm` | 14px | 1.6 | ข้อความรอง, ตาราง |
| `--text-base` | 16px | 1.6 | เนื้อหาหลัก |
| `--text-lg` | 20px | 1.6 | หัวข้อรอง |
| `--text-xl` | 24px | 1.5 | หัวข้อการ์ด |
| `--text-2xl` | 32px | 1.4 | หัวข้อหน้า |
| `--text-3xl` | 40px | 1.3 | hero |

## 6.4 Spacing & Layout

- Grid 8px (4, 8, 12, 16, 24, 32, 48, 64)
- Sidebar กว้าง 240px (ย่อได้ 72px) / Content max-width 1200px
- Breakpoints: 640 / 768 / 1024 / 1280 / 1536

## 6.5 Component Library

| กลุ่ม | Components |
|---|---|
| Actions | Button (Primary/Secondary/Ghost/Danger), IconButton, Split button |
| Inputs | Text, Textarea, Select, Switch, Slider, ColorPicker, ImagePicker, LinkPicker |
| Feedback | Toast, Banner, Skeleton loader, Progress, Empty state |
| Overlay | Modal, Drawer, Popover, Tooltip, Command Palette |
| Navigation | Sidebar, Tabs, Breadcrumb, Pagination |
| Data | Table (เรียง/ค้นหา/กรอง), Card, Stat card, Chart |
| Editor | Block toolbar, Inline toolbar, Slash menu, Block inserter |

### Button variants

| Variant | ใช้เมื่อ | กติกา |
|---|---|---|
| Primary | การกระทำหลักของหน้า | **ไม่เกิน 1 ปุ่ม/หน้า** |
| Secondary | การกระทำรอง | เส้นขอบ, พื้นโปร่ง |
| Ghost | การกระทำเบา/ในตาราง | ไม่มีพื้น |
| Danger | ลบ/ทำลาย | ต้องมี confirm หรือ undo |

### สถานะที่ทุก component ต้องมี (4 สถานะบังคับ)

1. **Loading** — skeleton (ไม่ใช้ spinner เปล่าๆ ถ้าเป็นเนื้อหา)
2. **Empty** — ภาพประกอบ + ข้อความ + ปุ่มชวนทำต่อ
3. **Error** — ข้อความภาษาคน + ปุ่มลองใหม่
4. **Success** — ยืนยันผลลัพธ์

## 6.6 Motion

- ease: `cubic-bezier(.2,.8,.2,1)`, duration 150–250ms
- Skeleton shimmer ตอนโหลด, สไลด์ Drawer, Fade+Scale Modal
- เคารพ `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

## 6.7 Wireframe: Editor หน้าเว็บ

```
┌────────────────────────────────────────────────────────────────────┐
│ ◀ หน้าแรก ▾   ┃  💻 📱 🖥   ┃  ↶ ↷   ┃  ✨AI   🎨Design   [ Publish ]│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌──────────────────────────────────────────────────────────┐    │
│   │  LOGO         หน้าแรก  บริการ  บทความ  ติดต่อ    [สั่งซื้อ] │    │
│   ├──────────────────────────────────────────────────────────┤    │
│   │                                                          │    │
│   │        ✎ พิมพ์หัวข้อของคุณที่นี่                           │ ⋮⋮ │
│   │        คำอธิบายสั้นๆ ที่ดึงดูดลูกค้า                         │    │
│   │            [ เริ่มเลย ]   [ ดูผลงาน ]                      │    │
│   │                                      ┌────────────┐      │    │
│   │                                      │   (รูป)    │      │    │
│   │                                      └────────────┘      │    │
│   ├────────────────── ＋ เพิ่มส่วนใหม่ ──────────────────────┤    │
│   │   [icon] จุดเด่น 1    [icon] จุดเด่น 2    [icon] จุดเด่น 3 │    │
│   └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│                                    ┌── แผงด้านข้าง (เมื่อเลือก block) ──┐
│                                    │ Block: Hero                    │
│                                    │ ▸ เลย์เอาต์  [ซ้าย][กลาง][ขวา]   │
│                                    │ ▸ พื้นหลัง   ● สี ○ รูป ○ วิดีโอ │
│                                    │ ▸ ระยะห่าง   ──●──────          │
│                                    └────────────────────────────────┘
└────────────────────────────────────────────────────────────────────┘
```

## 6.8 Wireframe: Dashboard

ดู [05-admin-ia.md](05-admin-ia.md#52-dashboard)

## 6.9 Checklist ก่อนส่งงาน UI

- [ ] ใช้ token ทั้งหมด ไม่มีสี/ขนาด hard-code
- [ ] ครบ 4 สถานะ (loading/empty/error/success)
- [ ] ตรวจที่ 375 / 768 / 1280px
- [ ] ตรวจ Dark mode
- [ ] contrast ≥ 4.5:1, ใช้คีย์บอร์ดได้
- [ ] animation ≤ 250ms + เคารพ reduced-motion
- [ ] มีไม่เกิน 1 ปุ่ม Primary

---

[← Admin IA](05-admin-ia.md) · [ถัดไป: Block System →](07-blocks.md)
