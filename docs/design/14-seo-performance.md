# 14 — SEO & Performance (ในตัว)

## 14.1 SEO อัตโนมัติ

- Meta title/description, Open Graph, Twitter Card, **OG image เจนอัตโนมัติ** จากชื่อหน้า
- `sitemap.xml`, `robots.txt`, canonical, hreflang (หลายภาษา)
- Structured data (JSON-LD): Organization, Article, FAQ, LocalBusiness, Product
- Redirect manager (301/302) + แจ้งเตือนลิงก์เสีย (404 monitor)
- **SEO Score** ต่อหน้า: เช็คความยาว title, มี H1 เดียว, alt รูป, ความเร็ว, ลิงก์ภายใน

### SEO Score — เกณฑ์ให้คะแนน

| รายการ | น้ำหนัก | เกณฑ์ผ่าน |
|---|---|---|
| Meta title | สูง | 30–60 ตัวอักษร |
| Meta description | สูง | 120–160 ตัวอักษร |
| H1 เดียว | กลาง | มี 1 H1 |
| alt รูปครบ | กลาง | ทุกรูปมี alt |
| ลิงก์ภายใน | กลาง | ≥ 2 ลิงก์ |
| ความเร็ว | สูง | LCP < 2.5s |
| canonical | ต่ำ | มี |

## 14.2 Performance

- ย่อรูปอัตโนมัติ → WebP/AVIF + `srcset` + lazy-load
- Critical CSS inline, Font subsetting (ไทย/อังกฤษ), preload
- Static HTML จาก CDN, Brotli, HTTP/3
- ไม่โหลด JS ที่ไม่จำเป็น (Islands architecture)
- เป้าหมาย: LCP < 2s, CLS < 0.05, Lighthouse ≥ 90

### Performance Budget (ต้องไม่เกิน)

| ตัวชี้วัด | งบ |
|---|---|
| JS ที่ส่งต่อหน้า (public) | < 100 KB gzip |
| CSS ที่ส่งต่อหน้า | < 50 KB gzip |
| Hero image | < 200 KB (หลังบีบอัด) |
| ฟอนต์ (subset) | < 2 ไฟล์, < 100 KB รวม |
| Third-party scripts | 0 (ยกเว้นที่ผู้ใช้ตั้งใจเพิ่ม) |

## 14.3 Checklist ก่อน Publish หน้า

- [ ] มี meta title + description
- [ ] มี H1 เดียว
- [ ] ทุกรูปมี alt
- [ ] OG image ถูกเจน (หรือตั้งเอง)
- [ ] มี canonical
- [ ] ไม่มีลิงก์เสีย
- [ ] Lighthouse ≥ 90

## 14.4 Structured Data

- หน้าแรก → `Organization` + `WebSite`
- บทความ → `Article`
- FAQ block → `FAQPage`
- หน้า "ติดต่อ" ที่มีที่อยู่ → `LocalBusiness`
- หน้าสินค้า (เฟส 3) → `Product`

เจน JSON-LD อัตโนมัติจาก block + `seo` settings (ไม่ต้องให้ผู้ใช้เขียนเอง)

## 14.5 การทดสอบ

- **Lighthouse CI** รันทุก PR (budget ตาม 14.2) — ถ้าเกินงบให้ fail
- Test sitemap/robots/canonical/hreflang ว่าถูกต้อง
- Test ว่าไม่มี JS จาก block ที่ไม่จำเป็นใน public site
- Test สัญญามือถือ: `apps/renderer/src/mobile.test.ts` (tap target, safe-area, overflow,
  hamburger, ไม่มี width ตายตัวเกิน 360px) และ `packages/blocks/src/responsive.test.ts`
  (grid ของ block ยุบเหลือคอลัมน์เดียว)

## 14.6 มือถือคือจอหลักของเว็บสาธารณะ

คนอ่านเว็บมากกว่าครึ่งเปิดบนมือถือ Google จึงจัดอันดับแบบ mobile-first
กติกาของ Lumio จึงแบ่งครึ่งชัด ๆ (ดู [25-admin-redesign.md](25-admin-redesign.md)):

| ส่วน | กติกา |
|---|---|
| `apps/renderer` + `packages/blocks` | รองรับมือถือ **100%** — ตรวจทุกครั้งที่แก้ |
| `apps/admin` | เป็นเครื่องมือเดสก์ท็อป (≥ 1024px) ไม่ทำ layout มือถือ |

สิ่งที่ต้องมีเสมอในหน้าสาธารณะ:

1. **พื้นที่กด ≥ 44px** (`--layout-tap-target`) สำหรับลิงก์เมนู ปุ่ม และ chip ต่าง ๆ
2. **safe-area** (`env(safe-area-inset-*)`) ให้ header, footer, แผงเมนู และปุ่มกลับขึ้นบน
3. **ไม่มี scroll แนวนอน** — ตาราง/โค้ดที่กว้างให้เลื่อนในกรอบตัวเอง (`.site { overflow-x: clip }`)
4. **grid เริ่มที่ 1 คอลัมน์** แล้วค่อยขยายที่ 640 / 1024px (mobile-first)
5. **เมนูพับเป็น hamburger ได้โดยไม่ต้องใช้ JS** (checkbox + label) เพื่อไม่กระทบงบ JS
6. **ตัวอักษรในช่องกรอก ≥ 16px** กัน iOS ซูมตอนโฟกัส
7. รูป hero มี `width`/`height` เสมอ (กัน CLS) และไม่ lazy-load ใบแรก (กัน LCP)

---

[← RBAC](13-rbac.md) · [ถัดไป: Security →](15-security.md)
