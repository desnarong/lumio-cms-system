# Lumio CMS — ออกแบบระบบแบบ WordPress ที่ใช้งานง่ายที่สุด

> ชื่อโค้ดเนม: **Lumio** (เปลี่ยนได้)
> เป้าหมาย: ให้คนที่ไม่เคยทำเว็บ สร้างเว็บสวยๆ ได้ภายใน **10 นาที** โดยไม่ต้องอ่านคู่มือ

> **หมายเหตุ:** เอกสารนี้เป็นฉบับรวมไฟล์เดียว (single-file master)
> เนื้อหาฉบับแยกไฟล์และขยายความอยู่ที่ [`design/README.md`](design/README.md)
> แนะนำให้อ้างอิงไฟล์ย่อยเมื่อใช้กับ Crush เพื่อลด context

---

## 1. วิสัยทัศน์และหลักการออกแบบ

### 1.1 ปัญหาของ WordPress ที่ต้องแก้

| ปัญหาใน WordPress | วิธีแก้ใน Lumio |
|---|---|
| เมนู admin เยอะ สับสน (Posts, Pages, Appearance, Plugins, Tools ...) | Admin เหลือ **5 เมนูหลัก** |
| แก้หน้าเว็บแล้วต้อง Preview วนไปมา | **แก้บนหน้าเว็บจริง** (Edit on page / WYSIWYG 100%) |
| ติดตั้ง plugin เยอะ ชนกัน ช้า ไม่ปลอดภัย | ฟีเจอร์หลักมีในตัว + "Apps" ที่ผ่านการตรวจ sandbox |
| ธีมแก้ยาก ต้องรู้ CSS/PHP | ธีมปรับด้วย **Design Panel** (สี ฟอนต์ มุมโค้ง) คลิกเดียว |
| ต้องอัปเดตเอง ต้องดูแล server | Auto-update, auto-backup, managed hosting |
| SEO ต้องลง plugin | SEO ในตัว + **คะแนนสุขภาพเว็บ** บอกว่าต้องแก้อะไร |
| UI ดูเก่า | Design system สมัยใหม่ รองรับ Dark mode |

### 1.2 หลักการ 7 ข้อ

1. **Zero learning curve** — ทุกอย่างทำได้โดยเห็นหน้าจอแล้วเข้าใจเลย
2. **Edit where you see** — แก้ตรงที่เห็น ไม่ต้องสลับหน้า
3. **Progressive disclosure** — ซ่อนความซับซ้อน โชว์เฉพาะที่จำเป็น มีโหมด Advanced แยก
4. **Beautiful by default** — ทุก template สวยตั้งแต่ยังไม่ปรับแต่ง
5. **Can't break it** — ย้อนกลับได้ทุกอย่าง (Undo, Version history, Draft/Publish)
6. **Fast by default** — เว็บที่สร้างต้องเร็ว (คะแนน Lighthouse > 90 โดยไม่ต้องทำอะไร)
7. **AI as assistant** — ช่วยเขียน ช่วยออกแบบ ช่วยแปลได้ แต่ไม่บังคับใช้

---

## 2. กลุ่มผู้ใช้ (Personas)

| Persona | ต้องการ | สิ่งที่ Lumio ต้องให้ |
|---|---|---|
| **แม่ค้าออนไลน์ / ร้านเล็ก** | เว็บร้าน + ติดต่อ + LINE | Template ร้านค้า, ปุ่ม LINE/โทร, แผนที่ |
| **ฟรีแลนซ์ / ครีเอเตอร์** | Portfolio, บล็อก | Template สวย, gallery, blog |
| **ธุรกิจ SME** | เว็บบริษัท, ฟอร์มติดต่อ, SEO | หลายหน้า, ฟอร์ม, SEO, หลายภาษา |
| **เอเจนซี่ / นักพัฒนา** | ทำเว็บให้ลูกค้าหลายราย | Multi-site, white-label, API, Custom blocks |
| **ผู้ดูแลเนื้อหา (Editor)** | เขียนบทความ | Editor เรียบง่าย สิทธิ์จำกัด |

---

## 3. ขอบเขตฟีเจอร์ (Scope)

### 3.1 MVP (เฟส 1)
- Onboarding Wizard + เลือก Template
- Visual Page Builder แบบ Block (แก้บนหน้าเว็บ)
- Pages, Blog Posts, Categories/Tags
- Media Library (อัปโหลด, crop, บีบอัด, WebP อัตโนมัติ)
- Navigation Menu (ลากวาง)
- Design Panel (สี, ฟอนต์, ปุ่ม, layout)
- ฟอร์มติดต่อ + แจ้งเตือน Email/LINE
- SEO พื้นฐาน + Sitemap + OG image อัตโนมัติ
- Users & Roles (Owner, Editor, Author)
- Custom Domain + SSL อัตโนมัติ
- Auto Backup + Version History

### 3.2 เฟส 2
- AI Assistant (เขียนข้อความ, สร้างหน้าจาก prompt, แปล)
- หลายภาษา (i18n)
- Analytics ในตัว (ไม่ต้องใช้ Google Analytics)
- Newsletter / Email subscribers
- Booking / นัดหมาย (app)
- Block Marketplace

### 3.3 เฟส 3
- E-commerce (สินค้า, ตะกร้า, PromptPay/Stripe)
- Membership / Paywall
- Multi-site / Agency dashboard, White-label
- Public API + Webhooks
- Developer SDK (สร้าง custom block/app)

### 3.4 สิ่งที่ "ไม่ทำ" โดยตั้งใจ
- ไม่มีระบบ plugin แบบเขียน PHP เข้าถึง core ได้อิสระ (ความปลอดภัย)
- ไม่มีหน้าตั้งค่าเป็นร้อยข้อ (ใช้ค่าเริ่มต้นที่ดี)

---

## 4. ประสบการณ์ผู้ใช้ (UX)

### 4.1 Onboarding Wizard (5 ขั้นตอน ≤ 3 นาที)

```
 ① ธุรกิจคุณคืออะไร?     → [ร้านอาหาร] [คลินิก] [ฟรีแลนซ์] [ร้านค้า] [บล็อก] [อื่นๆ]
 ② ตั้งชื่อเว็บ + อัปโหลดโลโก้ (ข้ามได้)
 ③ เลือกสไตล์            → 6 การ์ดตัวอย่าง (Minimal / Bold / Soft / Elegant ...)
 ④ เลือกสีหลัก           → พาเลทสีสำเร็จรูป หรือดึงสีจากโลโก้อัตโนมัติ
 ⑤ ✨ สร้างเว็บให้เลย!    → ได้เว็บ 4-5 หน้าพร้อมเนื้อหาตัวอย่าง (AI ช่วยเติมตามประเภทธุรกิจ)
```

หลังจบ wizard ผู้ใช้เข้าสู่ **โหมดแก้ไขหน้าเว็บ** ทันที พร้อม tooltip นำทาง 3 จุด (Checklist แบบ "เริ่มต้นใช้งาน 4/6 เสร็จแล้ว")

### 4.2 Edit on Page (หัวใจของระบบ)

- ผู้ใช้เปิดหน้าเว็บแล้วเห็น **แถบเครื่องมือลอย** ด้านบน (Edit / Design / Pages / Publish)
- **คลิกข้อความ = พิมพ์แก้ได้เลย**, คลิกรูป = เปลี่ยนรูป, คลิกปุ่ม = ตั้งลิงก์
- เอาเมาส์ชี้ระหว่าง block จะมีปุ่ม **＋** เพิ่ม block ใหม่
- ชี้ที่ block จะมี handle **⋮⋮** ลากเรียงลำดับ + เมนูย่อ (ทำซ้ำ, ซ่อน, ลบ, บันทึกเป็นเทมเพลต)
- พิมพ์ `/` เพื่อเรียกรายการ block (แบบ Notion)
- **Responsive Toggle** 📱💻🖥 สลับมุมมองมือถือ/แท็บเล็ต/เดสก์ท็อป
- **Undo / Redo ไม่จำกัด** (Ctrl+Z) + Autosave ทุก 2 วินาที
- ปุ่ม **Publish** สีเด่นมุมขวาบน (เห็นสถานะ: ● Draft / ✓ Published)

### 4.3 Command Palette (`Ctrl/⌘ + K`)

พิมพ์ค้นหาอะไรก็ได้: "เพิ่มหน้าใหม่", "เปลี่ยนสีหลัก", "ไปที่รูปภาพ", "ตั้งโดเมน" → ไปถึงทันที

### 4.4 ระดับความซับซ้อน 3 ชั้น

| ระดับ | ผู้ใช้เห็น |
|---|---|
| **Simple** (ค่าเริ่มต้น) | แก้ข้อความ รูป สี ปุ่ม เท่านั้น |
| **Pro** | Spacing, animation, custom CSS class, visibility ตามอุปกรณ์ |
| **Developer** | Custom CSS/JS, Code block, API keys, Webhooks |

สลับได้ที่ Settings > Mode — ผู้เริ่มต้นจะไม่เห็นตัวเลือกซับซ้อนเลย

### 4.5 กฎ UX ที่ต้องรักษา

- ทุกการกระทำสำคัญต้อง **ยกเลิกได้** (Toast "ลบแล้ว — [เลิกทำ]" แทน Confirm dialog)
- ข้อความ error เป็นภาษาคน เช่น "รูปใหญ่เกินไป ลองใช้รูปไม่เกิน 10MB" ไม่ใช้รหัส error
- Empty state ต้องมีภาพประกอบ + ปุ่มชวนทำต่อ
- ทุกหน้า admin มีไม่เกิน **1 ปุ่ม Primary**
- ใช้ภาษาธุรกิจ ไม่ใช้ศัพท์เทคนิค (เช่น "หน้า" ไม่ใช่ "Post type", "ชื่อลิงก์" ไม่ใช่ "Slug")
- รองรับ Keyboard shortcut + Accessibility (WCAG 2.1 AA)

---

## 5. Admin Information Architecture

เหลือเพียง **5 เมนูหลัก** (Sidebar ซ้าย / Bottom bar บนมือถือ):

```
🏠 ภาพรวม (Dashboard)
📄 เนื้อหา (Content)
    ├─ หน้าเว็บ
    ├─ บทความ
    ├─ ฟอร์ม & ข้อความที่ได้รับ
    └─ ไฟล์สื่อ (Media)
🎨 ดีไซน์ (Design)
    ├─ สไตล์ (สี/ฟอนต์/ปุ่ม)
    ├─ เมนูนำทาง
    ├─ Header / Footer
    └─ เปลี่ยน Template
📈 เติบโต (Growth)
    ├─ SEO
    ├─ Analytics
    ├─ Newsletter
    └─ Apps (เสริม)
⚙️ ตั้งค่า (Settings)
    ├─ ทั่วไป / โดเมน
    ├─ ทีมงาน & สิทธิ์
    ├─ Backup & ประวัติเวอร์ชัน
    └─ แพ็กเกจ & การชำระเงิน
```

### 5.1 Dashboard

การ์ดเรียบง่าย 4 ส่วน:
1. **ปุ่มลัด**: ✏️ แก้เว็บ · ＋ หน้าใหม่ · ✍️ เขียนบทความ · 👁 ดูเว็บ
2. **สถิติวันนี้**: ผู้เข้าชม, ข้อความใหม่, ยอดสมัครรับข่าว (พร้อมกราฟเส้นเล็ก)
3. **คะแนนสุขภาพเว็บ** (วงกลม 0–100) + "3 สิ่งที่ควรแก้" (กดแล้วไปแก้ได้เลย)
4. **Checklist เริ่มต้น** (หายไปเมื่อครบ)

---

## 6. Design System (UI ที่สวย)

### 6.1 หลักการภาพ
- **Clean, airy, soft** — พื้นที่ว่างเยอะ มุมโค้งนุ่ม เงาบางๆ
- ใช้สีน้อย: 1 Primary + Neutral + สถานะ (success/warn/danger)
- ภาพประกอบสไตล์ 3D-soft / flat gradient ใน empty state
- Micro-interaction ละมุน (ไม่เกิน 200ms)

### 6.2 Color Tokens

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

### 6.3 Typography

| ใช้กับ | ฟอนต์ |
|---|---|
| UI ภาษาไทย+อังกฤษ | **Noto Sans Thai** / **IBM Plex Sans Thai** + **Inter** |
| หัวข้อเด่น (Admin) | **Plus Jakarta Sans** / **Prompt** |
| Code | JetBrains Mono |

Scale: 12 / 14 / 16 / 20 / 24 / 32 / 40 px — line-height 1.5 (ไทยต้องการ 1.6 เพื่อไม่ให้สระชน)

### 6.4 Spacing & Layout
- Grid 8px (4, 8, 12, 16, 24, 32, 48, 64)
- Sidebar กว้าง 240px (ย่อได้ 72px) / Content max-width 1200px
- Breakpoints: 640 / 768 / 1024 / 1280 / 1536

### 6.5 Component Library

| กลุ่ม | Components |
|---|---|
| Actions | Button (Primary/Secondary/Ghost/Danger), IconButton, Split button |
| Inputs | Text, Textarea, Select, Switch, Slider, ColorPicker, ImagePicker, LinkPicker |
| Feedback | Toast, Banner, Skeleton loader, Progress, Empty state |
| Overlay | Modal, Drawer, Popover, Tooltip, Command Palette |
| Navigation | Sidebar, Tabs, Breadcrumb, Pagination |
| Data | Table (เรียง/ค้นหา/กรอง), Card, Stat card, Chart |
| Editor | Block toolbar, Inline toolbar, Slash menu, Block inserter |

### 6.6 Motion
- ease: `cubic-bezier(.2,.8,.2,1)`, duration 150–250ms
- Skeleton shimmer ตอนโหลด, สไลด์ Drawer, Fade+Scale Modal
- เคารพ `prefers-reduced-motion`

### 6.7 Wireframe: Editor หน้าเว็บ

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

### 6.8 Wireframe: Dashboard

```
┌───────┬───────────────────────────────────────────────────────────┐
│ LOGO  │  สวัสดี คุณสมชาย 👋                    🔍 ⌘K    🔔   (ภาพ) │
│       │ ──────────────────────────────────────────────────────── │
│ 🏠    │  [✏️ แก้เว็บ] [＋ หน้าใหม่] [✍️ เขียนบทความ] [👁 ดูเว็บ]   │
│ 📄    │                                                           │
│ 🎨    │  ┌─ผู้เข้าชม─┐ ┌─ข้อความใหม่┐ ┌─สมัครรับข่าว┐              │
│ 📈    │  │ 1,284 ↑12%│ │    7      │ │    32     │              │
│ ⚙️    │  └───────────┘ └───────────┘ └───────────┘              │
│       │  ┌─ สุขภาพเว็บ ───────────┐ ┌─ เริ่มต้นใช้งาน 4/6 ─────┐ │
│       │  │   ◔ 86/100             │ │ ✓ ตั้งชื่อเว็บ            │ │
│       │  │ • เพิ่ม alt ให้รูป 3 รูป │ │ ✓ เลือกสไตล์              │ │
│       │  │ • เพิ่มคำอธิบายหน้า "บริการ"│ │ ○ เชื่อมโดเมน             │ │
│       │  └────────────────────────┘ └──────────────────────────┘ │
└───────┴───────────────────────────────────────────────────────────┘
```

---

## 7. Block System (เนื้อหาแบบ Block)

### 7.1 รายการ Block ในตัว

| หมวด | Blocks |
|---|---|
| **โครงสร้าง** | Section, Columns, Container, Spacer, Divider |
| **ข้อความ** | Heading, Paragraph, List, Quote, Rich text |
| **สื่อ** | Image, Gallery, Video (YouTube/Vimeo/upload), Slider, Icon |
| **Hero/Landing** | Hero, Features, Pricing, Testimonials, FAQ (Accordion), CTA, Stats, Logos, Timeline, Team |
| **ปฏิสัมพันธ์** | Button, Form, Newsletter, Map, Social links, LINE/Call floating button |
| **เนื้อหาไดนามิก** | Blog list, Post grid, Latest posts, Search |
| **ขั้นสูง** | HTML/Embed, Code, Custom component |

### 7.2 Section Templates (คลังสำเร็จรูป)
มี 100+ section สวยๆ แยกหมวด (Hero ×15, Features ×12, Pricing ×6 ...) กดเพิ่มทีเดียวได้ทั้งส่วน แล้วปรับเนื้อหา

### 7.3 Block Schema (JSON)

```json
{
  "id": "blk_01HZX...",
  "type": "hero",
  "version": 1,
  "props": {
    "layout": "split-right",
    "heading": "ร้านกาแฟคั่วสดทุกเช้า",
    "subheading": "ส่งตรงถึงบ้านคุณทั่วประเทศ",
    "buttons": [
      { "label": "สั่งเลย", "href": "/shop", "variant": "primary" },
      { "label": "เรื่องราวของเรา", "href": "/about", "variant": "ghost" }
    ],
    "image": { "mediaId": "med_123", "alt": "เมล็ดกาแฟคั่ว" },
    "background": { "type": "color", "token": "surface" }
  },
  "style": {
    "paddingY": "xl",
    "visibility": { "mobile": true, "tablet": true, "desktop": true },
    "animation": "fade-up"
  },
  "children": []
}
```

หน้าหนึ่งหน้า = JSON tree ของ blocks เก็บใน PostgreSQL (`jsonb`) แล้ว render เป็น HTML ผ่าน SSR/SSG

---

## 8. Theme & Design Panel

### 8.1 Design Panel (ทางลัดแทนการแก้ CSS)

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

### 8.2 Template
- ผู้ใช้เปลี่ยน Template ได้ **โดยเนื้อหาไม่หาย** (เพราะแยก content ออกจาก presentation)
- Template = ชุด Tokens + Header/Footer + Section styles + หน้าตัวอย่าง
- Template แบ่งตามธุรกิจ: ร้านอาหาร, คลินิก, ที่ปรึกษา, ร้านค้า, Portfolio, บล็อก, อีเวนต์ ฯลฯ

---

## 9. AI Assistant (เฟส 2 แต่ออกแบบรองรับตั้งแต่ต้น)

| ฟีเจอร์ | การทำงาน |
|---|---|
| **สร้างเว็บจาก prompt** | "ทำเว็บร้านนวดสปา เชียงใหม่" → ได้หน้า Home/Services/Pricing/Contact พร้อมเนื้อหา |
| **เขียน/ปรับข้อความ** | เลือกข้อความ → ✨ "ทำให้สั้นลง / เป็นทางการขึ้น / แปลอังกฤษ" |
| **สร้างรูป/Alt text** | เจน alt text อัตโนมัติให้ทุกรูป |
| **SEO Assistant** | แนะนำ title/description/keywords |
| **ผู้ช่วยในแชท** | "เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม" → ระบบแก้ tokens ให้ (ผู้ใช้กดยอมรับ/ยกเลิกได้) |

กติกา: AI เสนอ **เป็น diff** ให้ผู้ใช้กด Accept ก่อนเสมอ ไม่แก้เองโดยพลการ

---

## 10. สถาปัตยกรรมระบบ

### 10.1 Tech Stack ที่แนะนำ

| ชั้น | เทคโนโลยี |
|---|---|
| Admin / Editor (SPA) | **React + TypeScript + Vite**, Zustand, TanStack Query, **TipTap/ProseMirror** (rich text), **dnd-kit** (ลากวาง), Tailwind + Radix UI |
| Public site rendering | **Next.js (App Router)** — SSG + ISR, หรือ Astro สำหรับเว็บเบา |
| Backend API | **NestJS (TypeScript)** + REST/GraphQL |
| ORM / DB | **Prisma + PostgreSQL** (jsonb สำหรับ blocks) |
| Cache / Queue | **Redis** + BullMQ (งานเบื้องหลัง: ย่อรูป, ส่งอีเมล, backup) |
| Storage | S3-compatible (MinIO / Cloudflare R2) |
| Search | PostgreSQL full-text (เริ่มต้น) → Meilisearch (ภายหลัง) |
| Auth | JWT + Refresh token, OAuth (Google/LINE), 2FA (TOTP) |
| Image pipeline | sharp (WebP/AVIF, responsive srcset), CDN |
| Infra | Docker, Nginx/Caddy (auto SSL), Cloudflare CDN |
| Observability | Prometheus + Grafana, Sentry, Loki |

### 10.2 ภาพรวมสถาปัตยกรรม

```
                    ┌─────────────────────────────┐
   ผู้เยี่ยมชม ───▶ │  CDN (Cloudflare)  + Cache   │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Renderer (Next.js SSG/ISR)  │◀── ดึง JSON blocks
                    └──────────────┬──────────────┘
                                   │
  ผู้ดูแล ──▶ Admin SPA ──▶ ┌──────▼───────┐    ┌───────────┐
  (Editor)                  │  API Gateway │───▶│  Worker    │ (BullMQ)
                            │   (NestJS)   │    │ รูป/อีเมล/ │
                            └──┬────┬────┬─┘    │ backup     │
                               │    │    │      └─────┬─────┘
                    ┌──────────▼┐ ┌─▼────▼─┐   ┌──────▼─────┐
                    │PostgreSQL │ │ Redis  │   │ S3 Storage │
                    └───────────┘ └────────┘   └────────────┘
```

### 10.3 Multi-tenant
- 1 แพลตฟอร์ม ดูแลหลายเว็บ: ทุกตารางมี `site_id` + Row-Level Security (RLS) ใน PostgreSQL
- Domain mapping: `customdomain.com → site_id` ผ่านตาราง `domains` + Caddy on-demand TLS
- Subdomain ฟรี: `mysite.lumio.app`

### 10.4 Rendering Strategy
1. กด **Publish** → Worker render หน้าเป็น static HTML → push ขึ้น CDN
2. เนื้อหาไดนามิก (ฟอร์ม, ค้นหา, ตะกร้า) ใช้ Islands / API call ฝั่ง client
3. Preview mode ใช้ SSR สดจาก draft
4. ผลลัพธ์: โหลด < 1 วินาที, TTFB < 100ms จาก CDN

---

## 11. Data Model (PostgreSQL)

```sql
-- องค์กร / ผู้ใช้
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT, avatar_url TEXT,
  totp_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  locale_default TEXT DEFAULT 'th',
  locales TEXT[] DEFAULT '{th}',
  template_id UUID,
  theme_tokens JSONB NOT NULL DEFAULT '{}',   -- สี ฟอนต์ มุมโค้ง ฯลฯ
  settings JSONB NOT NULL DEFAULT '{}',
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE site_members (
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','author','viewer')),
  PRIMARY KEY (site_id, user_id)
);

CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  hostname TEXT UNIQUE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  ssl_status TEXT DEFAULT 'pending',
  verified_at TIMESTAMPTZ
);

-- เนื้อหา (หน้า + บทความใช้ตารางเดียว แยกด้วย type)
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('page','post')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  locale TEXT DEFAULT 'th',
  status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','scheduled','published','archived')),
  blocks_draft JSONB NOT NULL DEFAULT '[]',
  blocks_published JSONB,
  excerpt TEXT,
  cover_media_id UUID,
  author_id UUID REFERENCES users(id),
  seo JSONB DEFAULT '{}',          -- title, description, og_image, noindex
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, locale, type, slug)
);
CREATE INDEX idx_contents_site_status ON contents (site_id, type, status, published_at DESC);

CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  blocks JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE taxonomies (            -- หมวดหมู่ / แท็ก
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  kind TEXT CHECK (kind IN ('category','tag')),
  name TEXT, slug TEXT,
  UNIQUE (site_id, kind, slug)
);
CREATE TABLE content_taxonomies (
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  taxonomy_id UUID REFERENCES taxonomies(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, taxonomy_id)
);

-- สื่อ
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  filename TEXT, mime TEXT, size_bytes BIGINT,
  width INT, height INT,
  alt TEXT, focal_point JSONB,
  variants JSONB DEFAULT '[]',     -- [{w:480,url,format:'webp'}...]
  folder TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- เมนู
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  location TEXT CHECK (location IN ('header','footer','custom')),
  items JSONB NOT NULL DEFAULT '[]'  -- tree: [{label, href|contentId, children:[...]}]
);

-- Global sections (Header/Footer ที่ใช้ซ้ำ)
CREATE TABLE global_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT, kind TEXT,            -- header | footer | reusable
  blocks JSONB NOT NULL
);

-- ฟอร์ม
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT,
  fields JSONB NOT NULL,
  notify JSONB DEFAULT '{}',       -- {email:[...], line_token:'...'}
  success_message TEXT
);
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  ip INET, user_agent TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  email CITEXT, status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, email)
);

-- Redirects, Apps, Analytics, Audit
CREATE TABLE redirects (
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  from_path TEXT, to_path TEXT, code INT DEFAULT 301,
  PRIMARY KEY (site_id, from_path)
);
CREATE TABLE site_apps (
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  app_key TEXT, config JSONB, enabled BOOLEAN DEFAULT true,
  PRIMARY KEY (site_id, app_key)
);
CREATE TABLE pageviews (            -- เก็บแบบ privacy-friendly ไม่เก็บ IP เต็ม
  site_id UUID, path TEXT, referrer TEXT, country TEXT, device TEXT,
  session_hash TEXT, ts TIMESTAMPTZ DEFAULT now()
) PARTITION BY RANGE (ts);
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  site_id UUID, user_id UUID, action TEXT, target TEXT, meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row-Level Security ตัวอย่าง
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON contents
  USING (site_id = current_setting('app.current_site')::uuid);
```

---

## 12. API Design

Base: `/api/v1` — Auth ด้วย `Authorization: Bearer <token>` + header `X-Site-Id`

| Resource | Endpoints |
|---|---|
| **Auth** | `POST /auth/login` · `/auth/register` · `/auth/refresh` · `/auth/oauth/:provider` |
| **Sites** | `GET /sites` · `POST /sites` · `PATCH /sites/:id` · `POST /sites/:id/publish-all` |
| **Contents** | `GET /contents?type=page&status=` · `POST /contents` · `GET/PATCH/DELETE /contents/:id` |
| | `PUT /contents/:id/blocks` (autosave draft) · `POST /contents/:id/publish` · `POST /contents/:id/schedule` |
| | `GET /contents/:id/versions` · `POST /contents/:id/restore/:versionId` |
| **Media** | `POST /media/presign` → upload ตรงไป S3 · `POST /media/:id/confirm` · `GET /media` · `PATCH/DELETE /media/:id` |
| **Menus** | `GET/PUT /menus/:location` |
| **Design** | `GET/PATCH /design/tokens` · `POST /design/template/:id/apply` |
| **Forms** | `GET/POST /forms` · `GET /forms/:id/submissions` · **Public:** `POST /public/forms/:id/submit` |
| **Domains** | `POST /domains` · `POST /domains/:id/verify` |
| **Team** | `GET/POST /members` · `PATCH/DELETE /members/:userId` |
| **SEO** | `GET /seo/health` · `PATCH /seo/settings` |
| **AI** | `POST /ai/generate-site` · `/ai/rewrite` · `/ai/alt-text` |
| **Public Delivery** | `GET /public/:host/pages/:slug` · `/public/:host/posts` · `/public/:host/sitemap.xml` |

ตัวอย่าง Autosave:

```http
PUT /api/v1/contents/8f2.../blocks
{ "blocks": [ ... ], "baseRevision": 41 }

→ 200 { "revision": 42, "savedAt": "2026-10-20T08:15:03Z" }
→ 409 { "error": "conflict", "message": "มีคนอื่นแก้หน้านี้ไปแล้ว" }
```

Realtime (เฟส 2): WebSocket แจ้ง "คุณสมศรีกำลังแก้หน้านี้" + ป้องกันชนกัน

---

## 13. สิทธิ์และบทบาท (RBAC)

| สิทธิ์ | Owner | Admin | Editor | Author | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| จัดการแพ็กเกจ/ชำระเงิน | ✅ | – | – | – | – |
| โดเมน / ตั้งค่าเว็บ | ✅ | ✅ | – | – | – |
| จัดการทีม | ✅ | ✅ | – | – | – |
| ออกแบบ (Design) | ✅ | ✅ | ✅ | – | – |
| แก้/Publish ทุกหน้า | ✅ | ✅ | ✅ | – | – |
| เขียนบทความของตัวเอง | ✅ | ✅ | ✅ | ✅ (ส่งตรวจ) | – |
| ดูข้อความจากฟอร์ม | ✅ | ✅ | ✅ | – | ✅ |
| ดูเฉยๆ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 14. SEO & Performance (ในตัว)

**SEO อัตโนมัติ**
- Meta title/description, Open Graph, Twitter Card, **OG image เจนอัตโนมัติ** จากชื่อหน้า
- `sitemap.xml`, `robots.txt`, canonical, hreflang (หลายภาษา)
- Structured data (JSON-LD): Organization, Article, FAQ, LocalBusiness, Product
- Redirect manager (301/302) + แจ้งเตือนลิงก์เสีย (404 monitor)
- **SEO Score** ต่อหน้า: เช็คความยาว title, มี H1 เดียว, alt รูป, ความเร็ว, ลิงก์ภายใน

**Performance**
- ย่อรูปอัตโนมัติ → WebP/AVIF + `srcset` + lazy-load
- Critical CSS inline, Font subsetting (ไทย/อังกฤษ), preload
- Static HTML จาก CDN, Brotli, HTTP/3
- ไม่โหลด JS ที่ไม่จำเป็น (Islands architecture)
- เป้าหมาย: LCP < 2s, CLS < 0.05, Lighthouse ≥ 90

---

## 15. ความปลอดภัย

| ด้าน | มาตรการ |
|---|---|
| Authentication | Argon2id, 2FA, ล็อกบัญชีเมื่อผิดซ้ำ, Session management |
| Authorization | RBAC + RLS ที่ DB, ตรวจ site_id ทุก query |
| Input | Sanitize rich text (DOMPurify/allow-list), validate ด้วย Zod/class-validator |
| Block HTML/Embed | จำกัดเฉพาะ role Admin ขึ้นไป + render ใน sandbox iframe |
| Upload | ตรวจ MIME จริง, สแกนไวรัส (ClamAV), จำกัดขนาด, ห้าม SVG script |
| Transport | HTTPS บังคับ, HSTS, CSP, SameSite cookie |
| Rate limit | Login, Form submit (+ Honeypot / Turnstile กัน spam) |
| Apps/Plugins | รันใน sandbox (iframe + postMessage / WASM) ไม่แตะ DB ตรง ใช้ permission scopes |
| Backup | อัตโนมัติรายวัน เก็บ 30 วัน + ปุ่ม Restore คลิกเดียว |
| Compliance | PDPA: Cookie banner ในตัว, ลบข้อมูลตามคำขอ, Data export |
| Audit | บันทึกการกระทำสำคัญทั้งหมด |

---

## 16. ระบบ Apps (ส่วนขยายแบบปลอดภัย)

แทน plugin แบบ WordPress:

```
App Manifest (manifest.json)
{
  "key": "booking",
  "name": "ระบบจองคิว",
  "version": "1.2.0",
  "permissions": ["forms:read", "contents:write:own", "email:send"],
  "blocks": ["booking-widget"],
  "adminPages": [{ "title": "การจอง", "entry": "admin.html" }],
  "settingsSchema": { ... JSON Schema → ระบบ render ฟอร์มตั้งค่าให้อัตโนมัติ ... }
}
```

- ติดตั้งคลิกเดียวจาก **App Store** ในเมนู เติบโต > Apps
- แต่ละ App ประกาศ **permissions** ผู้ใช้เห็นก่อนติดตั้ง
- Custom block จาก App ปรากฏในรายการ Block อัตโนมัติ
- ตรวจสอบโดยทีมงานก่อนขึ้น Store + ระบบ rating/รีวิว

Apps แนะนำ: Booking, Live Chat/LINE, Popup/Promo bar, Reviews, Comments, Members, Shop, Analytics เพิ่มเติม, Instagram feed

---

## 17. หลายภาษา (i18n)

- เลือกภาษาหลัก + ภาษาเสริม ตอนตั้งค่า
- หน้าแต่ละภาษาเป็น record แยก (`locale`) เชื่อมกันด้วย `translation_group_id`
- ปุ่ม **✨ แปลหน้านี้ด้วย AI** → ได้ draft ภาษาใหม่ให้ตรวจ
- Language switcher block + hreflang อัตโนมัติ
- URL: `/en/about`, `/th/about` (หรือ subdomain/domain ต่อภาษา)

---

## 18. Deployment

### 18.1 docker-compose (ตัวอย่างพัฒนา/Self-host)

```yaml
services:
  api:
    build: ./apps/api
    env_file: .env
    depends_on: [db, redis]
  worker:
    build: ./apps/api
    command: node dist/worker.js
    env_file: .env
    depends_on: [db, redis]
  admin:
    build: ./apps/admin          # React SPA (static, serve ผ่าน Nginx)
  renderer:
    build: ./apps/renderer       # Next.js
    env_file: .env
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7
  minio:
    image: minio/minio
    command: server /data --console-address ":49601"
    volumes: [miniodata:/data]
  caddy:
    image: caddy:2               # reverse proxy + auto TLS (on-demand สำหรับ custom domain)
    ports: ["49700:80","49701:443"]
    volumes: [./Caddyfile:/etc/caddy/Caddyfile, caddy_data:/data]
volumes: { pgdata: {}, miniodata: {}, caddy_data: {} }
```

### 18.2 Monorepo Structure

```
lumio/
├─ apps/
│  ├─ admin/        # React admin + editor
│  ├─ api/          # NestJS API + worker
│  └─ renderer/     # Next.js public site renderer
├─ packages/
│  ├─ blocks/       # block definitions (schema + React render + editor UI)
│  ├─ ui/           # design system components
│  ├─ tokens/       # design tokens
│  ├─ sdk/          # app/block SDK
│  └─ shared/       # types, zod schemas
├─ templates/       # template packs
└─ infra/           # docker, caddy, CI
```

### 18.3 แพ็กเกจ (ตัวอย่าง Business Model)

| แพ็กเกจ | ราคา/เดือน | สิ่งที่ได้ |
|---|---|---|
| Free | 0 | Subdomain, 3 หน้า, โลโก้ Lumio |
| Starter | ฿199 | โดเมนเอง, 20 หน้า, ฟอร์ม, SEO |
| Pro | ฿499 | ไม่จำกัดหน้า, Analytics, Newsletter, AI |
| Business | ฿1,290 | หลายภาษา, ทีมงาน 10 คน, E-commerce |
| Agency | ติดต่อ | Multi-site, White-label, API |

---

## 19. Roadmap

| เฟส | ระยะเวลา (โดยประมาณ) | ผลลัพธ์ |
|---|---|---|
| **0. Design** | 3–4 สัปดาห์ | Design system, Prototype Figma, ทดสอบผู้ใช้ 5 คน |
| **1. MVP** | 10–12 สัปดาห์ | Editor + Blocks + Pages/Posts + Media + Design Panel + Publish + Domain |
| **2. Beta** | 6–8 สัปดาห์ | Forms, SEO score, Team, Version history, Template 10 แบบ |
| **3. Launch** | 4 สัปดาห์ | Billing, Onboarding wizard, Docs, Template 20 แบบ |
| **4. Growth** | ต่อเนื่อง | AI, i18n, Analytics, App Store, E-commerce |

**ลำดับการสร้างที่แนะนำ:** Block engine + Editor → Renderer → Media → Design tokens → Publish pipeline → Wizard/Templates → ที่เหลือ

---

## 20. ตัวชี้วัดความสำเร็จ (Success Metrics)

| ตัวชี้วัด | เป้าหมาย |
|---|---|
| Time to first published site | ≤ 10 นาที |
| Onboarding completion rate | ≥ 70% |
| ผู้ใช้ใหม่ที่ Publish ภายใน 24 ชม. | ≥ 50% |
| SUS (System Usability Scale) | ≥ 85 |
| คะแนน Lighthouse เฉลี่ยของเว็บที่สร้าง | ≥ 90 |
| Support ticket ต่อผู้ใช้ใหม่ | < 0.1 |
| Retention 30 วัน | ≥ 40% |

**วิธีวัดความ "ง่าย":** ให้คนที่ไม่เคยทำเว็บ 5 คน ทำภารกิจ — (1) เปลี่ยนข้อความหัวเว็บ (2) เปลี่ยนรูป (3) เพิ่มหน้าใหม่ (4) เปลี่ยนสีหลัก (5) Publish — ถ้ามีใครติดโดยไม่มีคนช่วย ให้กลับไปแก้ UI

---

## 21. ความเสี่ยงและแนวทางรับมือ

| ความเสี่ยง | ผลกระทบ | แนวทาง |
|---|---|---|
| Visual editor ซับซ้อน ใช้เวลาพัฒนานาน | สูง | เริ่มจาก block จำกัด 20 ตัว, ใช้ TipTap/dnd-kit ไม่เขียนเอง |
| เนื้อหาเสียหายเมื่อเปลี่ยน Template | กลาง | แยก content/presentation, Block schema มี version + migration |
| Custom domain + SSL จำนวนมาก | กลาง | Caddy on-demand TLS / Cloudflare for SaaS |
| ต้นทุนรูป/CDN บานปลาย | กลาง | R2 (ไม่คิด egress), จำกัด quota ตามแพ็กเกจ |
| App ที่ไม่ปลอดภัย | สูง | Sandbox + permission + review ก่อนขึ้น Store |
| ต้นทุน AI | กลาง | Quota ตามแพ็กเกจ, cache ผลลัพธ์, ใช้โมเดลเล็กกับงานง่าย |

---

## 22. Checklist สรุป "ทำไมง่ายกว่า WordPress"

- [x] เมนูหลักแค่ 5 รายการ
- [x] แก้ตรงบนหน้าเว็บจริง (WYSIWYG)
- [x] Wizard สร้างเว็บเสร็จใน 3 นาที
- [x] Design Panel แทนการแก้โค้ด — เห็นผลสดทันที
- [x] Undo/Version history — ผู้ใช้ไม่กลัวทำพัง
- [x] SEO, Backup, SSL, Performance ในตัว ไม่ต้องลง plugin
- [x] Command Palette (⌘K) หาอะไรก็เจอ
- [x] AI ช่วยเขียน/ออกแบบ/แปล
- [x] มือถือใช้งานแก้ไขได้จริง (Responsive admin)
- [x] อัปเดตและดูแลให้อัตโนมัติ

---

## 23. Agent Skills สำหรับ Crush (ชุดสกิลสำหรับพัฒนา Lumio)

ส่วนนี้ทำให้ Crush เขียนโค้ดตาม "กติกาของ Lumio" ได้สม่ำเสมอ ไม่ต้องอธิบายซ้ำทุกครั้งที่เริ่ม session ใหม่

### 23.1 Crush โหลด Skill จากไหน

Crush รองรับมาตรฐาน **Agent Skills** (โฟลเดอร์ที่มีไฟล์ `SKILL.md` ซึ่ง Crush ค้นหาและเปิดใช้เมื่อ task ตรงกับ `description`):

| ตำแหน่ง | ใช้เมื่อ |
|---|---|
| `.crush/skills/` (ในโปรเจกต์) | **แนะนำสำหรับ Lumio** — commit เข้า git ให้ทีมใช้ร่วมกัน (แสดงเป็น `project:ชื่อสกิล`) |
| `~/.config/crush/skills/` | สกิลส่วนตัวที่ใช้ทุกโปรเจกต์ (แสดงเป็น `user:ชื่อสกิล`) |
| `options.skills_paths` ใน `crush.json` | ชี้ไปโฟลเดอร์อื่นเพิ่มเติม |

> หมายเหตุ: Crush อ่านโฟลเดอร์ `.agents/skills`, `.claude/skills` ได้ด้วย จึงใช้สกิลชุดเดียวกันร่วมกับเครื่องมือ AI อื่นได้ ตำแหน่งที่รองรับอาจเปลี่ยนตามเวอร์ชัน ให้เช็ค docs ของ Crush ที่ใช้อยู่อีกครั้ง

### 23.2 โครงสร้างโฟลเดอร์

```
lumio/
├─ AGENTS.md                      # กติกากลางของโปรเจกต์ (อ่านทุก session)
├─ crush.json                     # config ของ Crush (ถ้าต้องการ)
└─ .crush/
   └─ skills/
      ├─ lumio-architecture/
      │  └─ SKILL.md
      ├─ lumio-block-creator/
      │  ├─ SKILL.md
      │  └─ templates/            # block.schema.ts.tpl, Block.tsx.tpl, BlockPanel.tsx.tpl
      ├─ lumio-api-endpoint/
      │  ├─ SKILL.md
      │  └─ templates/
      ├─ lumio-db-migration/
      │  └─ SKILL.md
      ├─ lumio-design-system/
      │  ├─ SKILL.md
      │  └─ references/tokens.md
      ├─ lumio-editor-ux/
      │  └─ SKILL.md
      ├─ lumio-seo-performance/
      │  └─ SKILL.md
      ├─ lumio-security-review/
      │  └─ SKILL.md
      ├─ lumio-template-pack/
      │  └─ SKILL.md
      └─ lumio-app-sdk/
         └─ SKILL.md
```

**หลักการเขียนสกิลที่ดี**
- `description` ต้องบอกชัดว่า "ใช้เมื่อไหร่" เพราะ Crush ใช้ข้อความนี้ตัดสินว่าจะเปิดสกิลหรือไม่
- เนื้อหา `SKILL.md` ให้สั้นกระชับ (หลักร้อยบรรทัด) เนื้อหายาวๆ ย้ายไป `references/` หรือ `templates/` แล้วให้สกิลชี้ไปอ่านเมื่อจำเป็น
- ขั้นตอนต้อง **ตรวจสอบได้** (ลงท้ายด้วยคำสั่งรัน test/lint/typecheck)
- หนึ่งสกิลทำหนึ่งเรื่อง ไม่รวมทุกอย่างไว้ไฟล์เดียว

### 23.3 `crush.json` (ตัวอย่าง)

```json
{
  "$schema": "https://charm.land/crush.json",
  "options": {
    "skills_paths": ["~/.config/crush/skills", "./.crush/skills"]
  }
}
```

### 23.4 `AGENTS.md` (กติกากลาง — Crush อ่านเป็น context ของโปรเจกต์)

````markdown
# Lumio — Project Rules

## Stack
Monorepo (pnpm + turbo): apps/admin (React+Vite), apps/api (NestJS+Prisma+PostgreSQL),
apps/renderer (Next.js), packages/{blocks,ui,tokens,sdk,shared}

## คำสั่งหลัก
- ติดตั้ง: `pnpm i`
- ทดสอบ: `pnpm test` · Lint: `pnpm lint` · Typecheck: `pnpm typecheck`
- DB: `pnpm --filter api prisma migrate dev`
- รันทั้งหมด: `docker compose up -d && pnpm dev`

## กฎเหล็ก
1. ทุกตารางที่เป็นข้อมูลของเว็บ **ต้องมี `site_id`** + RLS
2. Validate input ทุกจุดด้วย Zod (schema อยู่ใน packages/shared)
3. ห้ามใส่สี/ขนาด hard-code ใน component — ใช้ design tokens เท่านั้น
4. ข้อความ UI ทุกตัวต้องผ่าน i18n (th เป็นค่าเริ่มต้น, en เสริม)
5. การกระทำที่ลบ/แก้ไขสำคัญต้อง **ยกเลิกได้ (undo)** และบันทึก audit log
6. HTML จากผู้ใช้ต้อง sanitize ก่อน render เสมอ
7. ก่อนจบงาน ต้องรัน lint + typecheck + test ที่เกี่ยวข้องให้ผ่าน

## สไตล์โค้ด
TypeScript strict, ไม่ใช้ `any`, ฟังก์ชันเล็ก ตั้งชื่อสื่อความหมาย, commit แบบ Conventional Commits

## เมื่อทำงานที่ตรงกับสกิล
ใช้สกิลใน .crush/skills ก่อนเสมอ (block, endpoint, migration, design, security)
````

### 23.5 ตัวอย่าง SKILL.md ฉบับเต็ม

#### (1) `lumio-block-creator` — สร้าง Block ใหม่

````markdown
---
name: lumio-block-creator
description: Use when creating or modifying a page block in Lumio (Hero, Pricing, FAQ, Gallery, etc.) — covers Zod schema, renderer, editor panel, registry entry, default content, and tests.
---

# Lumio Block Creator

Block = หน่วยเนื้อหาที่ลากวางได้ ทุก block อยู่ใน `packages/blocks/src/<name>/`

## ไฟล์ที่ต้องสร้างครบ 5 ไฟล์
1. `schema.ts`   — Zod schema ของ `props` + `style` + `version`
2. `Block.tsx`   — renderer (ใช้ได้ทั้ง SSR ใน renderer และ editor)
3. `Panel.tsx`   — แผงตั้งค่าด้านข้าง (ใช้ component จาก packages/ui เท่านั้น)
4. `defaults.ts`— ค่าเริ่มต้นที่ "สวยตั้งแต่ยังไม่แก้" (ข้อความไทยตัวอย่างจริง ไม่ใช่ lorem ipsum)
5. `index.ts`    — export + ลงทะเบียนใน `packages/blocks/src/registry.ts`

## ขั้นตอน
1. อ่านตัวอย่างจาก block ที่มีอยู่ (เช่น `hero`) เพื่อใช้โครงเดียวกัน
2. เขียน `schema.ts` — ใส่ `version: z.literal(1)` เสมอ ถ้าเปลี่ยนโครงสร้างภายหลังให้เพิ่ม migration ใน `migrations.ts`
3. เขียน `Block.tsx`
   - ใช้ design tokens (`var(--brand-500)` ฯลฯ) ห้าม hard-code สี
   - แก้ข้อความ inline ได้ผ่าน `<Editable path="props.heading" />`
   - รองรับ responsive (mobile-first) และ `style.visibility`
   - รูปทุกรูปต้องใช้ `<Img>` (lazy, srcset, alt บังคับ)
4. เขียน `Panel.tsx` — จัดกลุ่มเป็น "เนื้อหา / หน้าตา / ขั้นสูง" ตัวเลือกขั้นสูงซ่อนไว้ใน mode Pro
5. ลงทะเบียน: `registry.register({ type, label, icon, category, schema, Block, Panel, defaults })`
6. เขียน test: schema ผ่านค่า default, snapshot render, a11y (axe) ไม่มี violation

## ตรวจสอบก่อนจบ
```bash
pnpm --filter @lumio/blocks test
pnpm --filter @lumio/blocks typecheck
pnpm lint
```

## ห้าม
- ห้ามใช้ `dangerouslySetInnerHTML` ถ้าไม่ผ่าน `sanitizeHtml()`
- ห้ามเรียก API ตรงจาก Block (ข้อมูลไดนามิกต้องมาจาก data loader ที่ลงทะเบียนไว้)
````

#### (2) `lumio-api-endpoint` — สร้าง API ใน NestJS

````markdown
---
name: lumio-api-endpoint
description: Use when adding or changing a REST endpoint, DTO, service, or guard in apps/api (NestJS). Enforces site scoping, RBAC, validation, audit logging, and tests.
---

# Lumio API Endpoint

## โครงโมดูล
`apps/api/src/modules/<name>/` → `<name>.module.ts`, `.controller.ts`, `.service.ts`, `dto/`, `*.spec.ts`

## กติกา
1. Controller บาง — logic อยู่ใน service
2. ทุก route ต้องมี `@UseGuards(AuthGuard, SiteGuard, RolesGuard)` และ `@Roles(...)` ยกเว้นกลุ่ม `/public/*`
3. DTO ใช้ Zod schema จาก `packages/shared` (ห้ามนิยามซ้ำ)
4. ทุก query ต้องกรองด้วย `site_id` (ใช้ `this.db.forSite(siteId)` ที่ตั้งค่า RLS ให้)
5. การเขียน/ลบ ต้องเรียก `audit.log({ action, target, meta })`
6. Error ตอบเป็นภาษาคนใน `message` (th) พร้อม `code` สำหรับ client
7. รายการ (list) ต้อง paginate (`cursor` + `limit` ≤ 100)
8. Endpoint สาธารณะ (form submit ฯลฯ) ต้องมี rate limit + honeypot/Turnstile

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
````

#### (3) `lumio-db-migration` — เปลี่ยน schema ฐานข้อมูล

````markdown
---
name: lumio-db-migration
description: Use when changing the Prisma schema, creating tables/indexes, or writing SQL migrations in Lumio. Ensures site_id, RLS policies, indexes, and safe (non-destructive) migrations.
---

# Lumio DB Migration

## Checklist ตารางใหม่
- [ ] มี `id UUID default gen_random_uuid()`
- [ ] มี `site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE` (ยกเว้นตารางระดับแพลตฟอร์ม)
- [ ] มี `created_at`, `updated_at`
- [ ] `ENABLE ROW LEVEL SECURITY` + policy `site_isolation` (ดูตัวอย่างในตาราง `contents`)
- [ ] Index สำหรับ query หลัก (เช่น `(site_id, status, published_at DESC)`)
- [ ] ข้อมูลยืดหยุ่นใช้ `JSONB` และมี Zod schema คู่กัน

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
````

#### (4) `lumio-design-system` — ทำ UI ให้สวยและสม่ำเสมอ

````markdown
---
name: lumio-design-system
description: Use when building or styling any UI in Lumio admin or public blocks — components, colors, spacing, typography, dark mode, motion. Keeps the interface beautiful and consistent via design tokens.
---

# Lumio Design System

อ่าน `references/tokens.md` เพื่อดูรายการ token ทั้งหมดก่อนเริ่มทุกครั้ง

## กฎ
1. **ใช้ token เสมอ** — สี `var(--brand-*)`, `var(--surface)`, `var(--text)`; มุม `var(--radius-*)`; เงา `var(--shadow-*)`
2. Spacing ตามกริด 8px (4, 8, 12, 16, 24, 32, 48, 64)
3. ฟอนต์: Noto Sans Thai / Inter, line-height ภาษาไทย ≥ 1.6
4. ทุกหน้ามีปุ่ม Primary ได้ไม่เกิน 1 ปุ่ม
5. ต้องมีครบ 4 สถานะ: loading (skeleton), empty (ภาพ + ปุ่มชวนทำต่อ), error (ข้อความภาษาคน + ปุ่มลองใหม่), success
6. รองรับ Light/Dark ด้วยการสลับ token ไม่ใช้สี hard-code
7. Animation 150–250ms และต้องเคารพ `prefers-reduced-motion`
8. ปุ่ม/ลิงก์ทุกตัวใช้คีย์บอร์ดได้, focus ring ชัดเจน, contrast ≥ 4.5:1
9. ใช้ component จาก `packages/ui` ก่อน ถ้าไม่มีให้สร้างใหม่ที่นั่น (พร้อม story)

## ก่อนจบงาน
- ตรวจที่ความกว้าง 375 / 768 / 1280px
- ตรวจ Dark mode
- รัน `pnpm --filter @lumio/ui test` และ a11y check
````

### 23.6 สกิลที่เหลือ (สรุปสาระสำคัญ ให้ Crush เขียนไฟล์เต็มตามรูปแบบข้างต้น)

| สกิล | `description` (ใช้เมื่อ...) | เนื้อหาหลัก |
|---|---|---|
| `lumio-architecture` | วางโครงโมดูลใหม่, ตัดสินใจว่าโค้ดควรอยู่ที่ไหน | แผนผังหัวข้อ 10, ขอบเขตระหว่าง admin / api / renderer, กฎการ import ข้ามแพ็กเกจ |
| `lumio-editor-ux` | ทำหน้าจอ Editor, Dashboard, Wizard, ข้อความ UI | กฎ UX หัวข้อ 4.5, ศัพท์ธุรกิจแทนศัพท์เทคนิค (หน้า/ชื่อลิงก์), Undo toast แทน confirm, ตัวอย่างข้อความภาษาไทย |
| `lumio-seo-performance` | แก้ renderer, meta, sitemap, รูป, ฟอนต์ | Checklist หัวข้อ 14, เป้า LCP/CLS, ห้ามเพิ่ม JS ที่ไม่จำเป็นใน public site, ทดสอบด้วย Lighthouse CI |
| `lumio-security-review` | ก่อน merge โค้ดที่แตะ auth, upload, HTML, form, Apps | ตารางหัวข้อ 15 เป็น checklist: sanitize, RLS, rate limit, MIME check, sandbox |
| `lumio-template-pack` | สร้าง/แก้ Template | โครง Template (tokens + header/footer + section styles + หน้าตัวอย่าง), ต้องสลับ Template แล้วเนื้อหาไม่หาย, เนื้อหาตัวอย่างไทยจริงตามประเภทธุรกิจ |
| `lumio-app-sdk` | สร้าง App/ส่วนขยาย | รูปแบบ `manifest.json` หัวข้อ 16, permission scopes, sandbox ผ่าน iframe + postMessage, ห้ามแตะ DB ตรง |

### 23.7 แผนให้ Crush สร้างระบบทีละขั้น (Prompt ตัวอย่างต่อเฟส)

ให้งานเป็นก้อนเล็กและตรวจได้ทีละก้อน (แนะนำเปิด session ใหม่ต่อ 1 ก้อนงาน เพื่อไม่ให้ context ล้น):

| # | งาน | Prompt ตัวอย่าง |
|---|---|---|
| 1 | สร้างโครง monorepo | `สร้าง monorepo ตาม AGENTS.md และหัวข้อ 18.2 ใน lumio-cms-system-design.md พร้อม docker-compose, lint, typecheck, CI เบื้องต้น` |
| 2 | Database | `ใช้สกิล lumio-db-migration สร้าง Prisma schema ตามหัวข้อ 11 พร้อม RLS และ seed ข้อมูลตัวอย่าง` |
| 3 | Design tokens + UI kit | `ใช้สกิล lumio-design-system สร้าง packages/tokens และ packages/ui: Button, Input, Modal, Toast, Drawer, CommandPalette พร้อม Storybook` |
| 4 | Auth + Sites | `ใช้สกิล lumio-api-endpoint ทำ auth, sites, members, RBAC ตามหัวข้อ 12-13` |
| 5 | Block engine | `ใช้สกิล lumio-block-creator สร้าง registry และ 6 block แรก: Hero, Heading, Paragraph, Image, Button, Features` |
| 6 | Editor | `สร้างหน้า Editor แบบ edit-on-page ตามหัวข้อ 4.2 และ wireframe 6.7 มี autosave, undo/redo, responsive toggle` |
| 7 | Renderer + Publish | `ทำ renderer (Next.js) และ publish pipeline ตามหัวข้อ 10.4 ใช้สกิล lumio-seo-performance` |
| 8 | Media | `ทำ media library: presigned upload, sharp worker สร้าง WebP/AVIF + srcset` |
| 9 | Wizard + Templates | `ใช้สกิล lumio-template-pack ทำ onboarding wizard 5 ขั้นตอน และ template 3 แบบแรก` |
| 10 | Review | `ใช้สกิล lumio-security-review ตรวจโค้ดทั้งหมดของเฟส 1 แล้วสรุปสิ่งที่ต้องแก้` |

**เคล็ดลับการทำงานกับ Crush**
- แนบเอกสารนี้ไว้ในโปรเจกต์ (เช่น `docs/design.md`) แล้วอ้างหัวข้อใน prompt ให้ชัด แทนการวางทั้งไฟล์
- เมื่อพบว่าต้องสั่งซ้ำเรื่องเดิมบ่อยๆ ให้เพิ่มเป็นกฎใน `AGENTS.md` หรือทำเป็นสกิลใหม่
- ให้ Crush รัน lint/typecheck/test ก่อนทุกครั้งที่จบงาน (ใส่ไว้ในกฎเหล็กข้อ 7 แล้ว)
- สกิลที่เขียนให้ AI อ่านควร "เจาะจง + มีตัวอย่าง + มีคำสั่งตรวจสอบ" ยิ่งเฉพาะเจาะจงผลยิ่งนิ่ง

---

*เอกสารนี้เป็นพิมพ์เขียวระดับระบบ ขั้นต่อไปแนะนำให้ทำ: (0) วางสกิล Crush ตามหัวข้อ 23, (1) Figma prototype หน้า Editor + Dashboard, (2) Prototype Block engine, (3) ทดสอบกับผู้ใช้จริง 5 คน ก่อนลงมือพัฒนาเต็มรูปแบบ*
