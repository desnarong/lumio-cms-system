---
name: lumio-seo-performance
description: Use when changing the renderer, meta tags, sitemap, images, or fonts in Lumio, or when optimizing public site performance. Enforces the SEO checklist and the performance budget (LCP, CLS, JS/CSS size).
---

# Lumio SEO & Performance

อ่าน [`docs/design/14-seo-performance.md`](../../docs/design/14-seo-performance.md) ประกอบ

## SEO อัตโนมัติที่ต้องมี

- Meta title/description, Open Graph, Twitter Card, OG image เจนอัตโนมัติ
- `sitemap.xml`, `robots.txt`, canonical, hreflang
- Structured data (JSON-LD): Organization, Article, FAQ, LocalBusiness, Product
- Redirect manager (301/302) + 404 monitor
- SEO Score ต่อหน้า

## Performance Budget (ห้ามเกิน)

| ตัวชี้วัด | งบ |
|---|---|
| JS ต่อหน้า (public) | < 100 KB gzip |
| CSS ต่อหน้า | < 50 KB gzip |
| Hero image | < 200 KB |
| ฟอนต์ (subset) | < 2 ไฟล์, < 100 KB รวม |
| Third-party scripts | 0 (ยกเว้นผู้ใช้ตั้งใจเพิ่ม) |

เป้าหมาย: LCP < 2s, CLS < 0.05, Lighthouse ≥ 90

## กฎ

1. **ห้ามเพิ่ม JS ที่ไม่จำเป็นใน public site** — ใช้ Islands architecture
2. รูปทุกใบผ่าน pipeline (WebP/AVIF + srcset + lazy) — ใช้ `<Img>`
3. ฟอนต์ต้อง subset (ไทย/อังกฤษ) + preload
4. Critical CSS inline
5. JSON-LD เจนจาก block + `seo` settings อัตโนมัติ (ไม่ให้ผู้ใช้เขียนเอง)
6. หน้า publish = static HTML จาก CDN (ดู publish pipeline หัวข้อ 10.4)

## ขั้นตอนแก้ renderer

1. ระบุว่าเป็นหน้าที่ SEO-sensitive (หน้าแรก, บทความ, สินค้า) หรือไม่
2. แก้ renderer + ตรวจ meta/JSON-LD
3. ตรวจว่าไม่มี client JS เพิ่มโดยไม่จำเป็น
4. อัปเดต sitemap/robots ถ้าเพิ่ม route ใหม่

## ตรวจสอบก่อนจบ

```bash
pnpm --filter renderer build
pnpm --filter renderer test
npx lighthouse-ci autorun --budget-path=lighthouse-budget.json
```

- Test: sitemap/robots/canonical/hreflang ถูกต้อง
- Test: ไม่มี JS จาก block ที่ไม่จำเป็นใน public site

## ห้าม

- ห้าม lazy-load ภาพ hero ตัวแรก (กระทบ LCP)
- ห้ามใส่ third-party script โดยไม่มีการอนุมัติ
- ห้าม render หน้าที่มีข้อมูลไดนามิกแบบไม่ cache ใน path ที่ควร static
