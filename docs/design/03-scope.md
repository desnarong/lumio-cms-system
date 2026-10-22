# 03 — ขอบเขตฟีเจอร์ (Scope)

## 3.1 MVP (เฟส 1)

เป้าหมาย: ผู้ใช้สร้างและ publish เว็บจริงได้ครบวงจร

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

### เกณฑ์ "MVP เสร็จ" (Definition of Done)
- [x] สร้างเว็บจาก wizard 5 ขั้นตอนจบได้ใน ≤ 3 นาที
- [x] แก้ข้อความ/รูป/สี บนหน้าเว็บจริงได้
- [x] Publish แล้วได้ static HTML บน CDN ภายใน 10 วินาที
- [x] Custom domain ต่อได้ + SSL ออกอัตโนมัติ
- [x] Undo/Redo + Version history ทำงาน
- [x] Lighthouse ของเว็บที่สร้าง ≥ 90 (ทุก template เริ่มต้น)

## 3.2 เฟส 2

- AI Assistant (เขียนข้อความ, สร้างหน้าจาก prompt, แปล)
- หลายภาษา (i18n)
- Analytics ในตัว (ไม่ต้องใช้ Google Analytics)
- Newsletter / Email subscribers
- Booking / นัดหมาย (app)
- Block Marketplace

## 3.3 เฟส 3

- E-commerce (สินค้า, ตะกร้า, PromptPay/Stripe)
- Membership / Paywall
- Multi-site / Agency dashboard, White-label
- Public API + Webhooks
- Developer SDK (สร้าง custom block/app)

## 3.4 สิ่งที่ "ไม่ทำ" โดยตั้งใจ (Non-goals)

- **ไม่มีระบบ plugin แบบเขียน PHP เข้าถึง core ได้อิสระ** — ใช้ Apps ที่ sandbox แทน (ดู [16](16-apps.md))
- **ไม่มีหน้าตั้งค่าเป็นร้อยข้อ** — ใช้ค่าเริ่มต้นที่ดี ผู้ใช้แก้เฉพาะที่จำเป็น
- **ไม่มี page builder แบบ absolute positioning อิสระ 100%** — ใช้ block/column เพื่อคง responsive
- **ไม่รองรับ browser เก่ากว่า 2 ปี** — เพื่อลดภาระและคง performance

## 3.5 ตารางตัดสินใจ: ฟีเจอร์นี้อยู่ในเฟสไหน

ใช้คำถามนี้จัดลำดับ:

| คำถาม | ถ้า "ใช่" | ถ้า "ไม่" |
|---|---|---|
| ผู้ใช้ใหม่ต้องใช้เพื่อ publish เว็บแรกไหม? | เฟส 1 | พิจารณาเฟสถัดไป |
| ถ้าไม่มี ผู้ใช้จะทำภารกิจหลักไม่ได้เลยไหม? | เฟส 1 (บังคับ) | เฟส 2+ |
| ต้องมี infra ใหม่ (เช่น payment, ecommerce) ไหม? | เฟส 3 | เฟส 1–2 |
| เป็นเรื่อง performance/security ของเว็บที่สร้างไหม? | ทำทันที (cross-cutting) | จัดตามเฟส |

## 3.6 Feature flags

ทุกฟีเจอร์เฟส 2–3 ต้องอยู่หลัง feature flag เพื่อ:
- เปิดให้ทดสอบกับผู้ใช้บางกลุ่มก่อน
- ปิดได้ทันทีถ้ามีปัญหา (kill switch)
- ลดความเสี่ยงตอน deploy

ค่า flag เก็บใน `sites.settings.flags` (ต่อเว็บ) หรือ config ระดับแพลตฟอร์ม

> ใช้งานแล้วในก้อนที่ 46: `GET/PATCH /v1/features`, `FeatureGuard`, หน้าตั้งค่า › ส่วนเสริม
> และ kill switch ระดับแพลตฟอร์มผ่าน `LUMIO_DISABLED_FEATURES`

---

[← กลุ่มผู้ใช้](02-personas.md) · [ถัดไป: UX →](04-ux.md)
