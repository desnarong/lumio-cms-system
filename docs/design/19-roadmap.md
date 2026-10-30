# 19 — Roadmap

## 19.1 เฟสงาน

| เฟส | ระยะเวลา (โดยประมาณ) | ผลลัพธ์ |
|---|---|---|
| **0. Design** | 3–4 สัปดาห์ | Design system, Prototype Figma, ทดสอบผู้ใช้ 5 คน |
| **1. MVP** | 10–12 สัปดาห์ | Editor + Blocks + Pages/Posts + Media + Design Panel + Publish + Domain |
| **2. Beta** | 6–8 สัปดาห์ | Forms, SEO score, Team, Version history, Template 10 แบบ |
| **3. Launch** | 4 สัปดาห์ | Billing, Onboarding wizard, Docs, Template 20 แบบ |
| **4. Growth** | ต่อเนื่อง | AI, i18n, Analytics, App Store, E-commerce, Membership/Paywall (ก้อนที่ 60) |

## 19.2 ลำดับการสร้างที่แนะนำ

```
Block engine + Editor → Renderer → Media → Design tokens → Publish pipeline → Wizard/Templates → ที่เหลือ
```

## 19.3 แผนงานย่อยเป็นก้อนตรวจได้ (สำหรับ Crush)

ให้งานเป็นก้อนเล็กและตรวจได้ทีละก้อน (แนะนำเปิด session ใหม่ต่อ 1 ก้อนงาน เพื่อไม่ให้ context ล้น):

| # | งาน | Prompt ตัวอย่าง |
|---|---|---|
| 1 | สร้างโครง monorepo | `สร้าง monorepo ตาม AGENTS.md และหัวข้อ 18.2 ใน docs/design/18-deployment.md พร้อม docker-compose, lint, typecheck, CI เบื้องต้น` |
| 2 | Database | `ใช้สกิล lumio-db-migration สร้าง Prisma schema ตามหัวข้อ 11 พร้อม RLS และ seed ข้อมูลตัวอย่าง` |
| 3 | Design tokens + UI kit | `ใช้สกิล lumio-design-system สร้าง packages/tokens และ packages/ui: Button, Input, Modal, Toast, Drawer, CommandPalette พร้อม Storybook` |
| 4 | Auth + Sites | `ใช้สกิล lumio-api-endpoint ทำ auth, sites, members, RBAC ตามหัวข้อ 12-13` |
| 5 | Block engine | `ใช้สกิล lumio-block-creator สร้าง registry และ 6 block แรก: Hero, Heading, Paragraph, Image, Button, Features` |
| 6 | Editor | `สร้างหน้า Editor แบบ edit-on-page ตามหัวข้อ 4.2 และ wireframe 6.7 มี autosave, undo/redo, responsive toggle` |
| 7 | Renderer + Publish | `ทำ renderer (Next.js) และ publish pipeline ตามหัวข้อ 10.4 ใช้สกิล lumio-seo-performance` |
| 8 | Media | `ทำ media library: presigned upload, sharp worker สร้าง WebP/AVIF + srcset` |
| 9 | Wizard + Templates | `ใช้สกิล lumio-template-pack ทำ onboarding wizard 5 ขั้นตอน และ template 3 แบบแรก` |
| 10 | Review | `ใช้สกิล lumio-security-review ตรวจโค้ดทั้งหมดของเฟส 1 แล้วสรุปสิ่งที่ต้องแก้` |

## 19.4 Definition of Done ระดับโปรเจกต์ (MVP)

- [x] ผู้ใช้ใหม่สร้าง+Publish เว็บได้ใน ≤ 10 นาที
- [x] ทุก template เริ่มต้น Lighthouse ≥ 90
- [x] Custom domain + SSL ทำงาน
- [x] Undo/Version history ทำงาน
- [x] Lint + typecheck + test ผ่านใน CI
- [x] ไม่มีช่องโหว่ระดับสูงจาก security review
- [x] E2E smoke test (Playwright) รันใน CI

## 19.5 เคล็ดลับการทำงานกับ Crush

- แนบเอกสารนี้ไว้ในโปรเจกต์ (เช่น `docs/design/`) แล้วอ้างหัวข้อใน prompt ให้ชัด แทนการวางทั้งไฟล์
- เมื่อพบว่าต้องสั่งซ้ำเรื่องเดิมบ่อยๆ ให้เพิ่มเป็นกฎใน `AGENTS.md` หรือทำเป็นสกิลใหม่
- ให้ Crush รัน lint/typecheck/test ก่อนทุกครั้งที่จบงาน (ใส่ไว้ในกฎเหล็กข้อ 7 แล้ว)
- สกิลที่เขียนให้ AI อ่านควร "เจาะจง + มีตัวอย่าง + มีคำสั่งตรวจสอบ" ยิ่งเฉพาะเจาะจงผลยิ่งนิ่ง

---

[← Deployment](18-deployment.md) · [ถัดไป: Metrics →](20-metrics.md)
