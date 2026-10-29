# Lumio CMS — ชุดเอกสารออกแบบ (Design Docs)

> ชื่อโค้ดเนม: **Lumio** (เปลี่ยนได้)
> เป้าหมาย: ให้คนที่ไม่เคยทำเว็บ สร้างเว็บสวยๆ ได้ภายใน **10 นาที** โดยไม่ต้องอ่านคู่มือ

เอกสารชุดนี้เป็นผลจากการ **แยกและขยายความ** ไฟล์ต้นฉบับ
[`../lumio-cms-system-design.md`](../lumio-cms-system-design.md) ออกเป็นไฟล์ย่อยตามหัวข้อ
เพื่อให้อ่านง่าย แก้ไขง่าย และอ้างอิงใน prompt ของ Crush ได้ตรงจุด

## สารบัญ

| # | ไฟล์ | เนื้อหา |
|---|---|---|
| 01 | [01-vision.md](01-vision.md) | วิสัยทัศน์ หลักการออกแบบ เป้าหมายธุรกิจ |
| 02 | [02-personas.md](02-personas.md) | กลุ่มผู้ใช้และงานที่ต้องทำ (Jobs-to-be-done) |
| 03 | [03-scope.md](03-scope.md) | ขอบเขตฟีเจอร์ MVP / เฟส 2 / เฟส 3 และสิ่งที่ "ไม่ทำ" |
| 04 | [04-ux.md](04-ux.md) | Onboarding, Edit-on-page, Command Palette, กฎ UX |
| 05 | [05-admin-ia.md](05-admin-ia.md) | โครงสร้างเมนู admin และ Dashboard |
| 06 | [06-design-system.md](06-design-system.md) | Tokens, typography, spacing, components, motion |
| 07 | [07-blocks.md](07-blocks.md) | Block system, schema, section templates |
| 08 | [08-theme-design-panel.md](08-theme-design-panel.md) | Design Panel และระบบ Template |
| 09 | [09-ai-assistant.md](09-ai-assistant.md) | AI Assistant และกติกา diff/accept |
| 10 | [10-architecture.md](10-architecture.md) | Tech stack, สถาปัตยกรรม, multi-tenant, rendering |
| 11 | [11-data-model.md](11-data-model.md) | PostgreSQL schema, RLS, index |
| 12 | [12-api.md](12-api.md) | REST API, autosave, realtime |
| 13 | [13-rbac.md](13-rbac.md) | บทบาทและสิทธิ์ |
| 14 | [14-seo-performance.md](14-seo-performance.md) | SEO อัตโนมัติและ performance budget |
| 15 | [15-security.md](15-security.md) | มาตรการความปลอดภัยและ compliance |
| 16 | [16-apps.md](16-apps.md) | ระบบ Apps (ส่วนขยายแบบปลอดภัย) |
| 17 | [17-i18n.md](17-i18n.md) | หลายภาษา |
| 18 | [18-deployment.md](18-deployment.md) | Docker, monorepo, แพ็กเกจ |
| 19 | [19-roadmap.md](19-roadmap.md) | แผนงานเป็นเฟส |
| 20 | [20-metrics.md](20-metrics.md) | ตัวชี้วัดความสำเร็จ |
| 21 | [21-risks.md](21-risks.md) | ความเสี่ยงและแนวทางรับมือ |
| 22 | [22-why-easier.md](22-why-easier.md) | Checklist "ทำไมง่ายกว่า WordPress" |
| 23 | [23-security-review.md](23-security-review.md) | ผลตรวจความปลอดภัยเฟส 1 (blocker / ควรแก้ / ข้อสังเกต) |
| 24 | [24-community-licensing.md](24-community-licensing.md) | Community edition, รูปแบบไลเซนส์, API ตรวจลายเซ็น |
| 25 | [25-admin-redesign.md](25-admin-redesign.md) | Redesign layout ของ admin (sidebar แบน 9 ประตู, PageHeader, desktop-only) และ Phone pass ของเว็บสาธารณะ |

## เอกสารที่เกี่ยวข้อง

- **สกิลสำหรับ Crush** — [`../../.crush/skills/`](../../.crush/skills/) (ดูคำอธิบายในหัวข้อ Skills ด้านล่าง)
- **กติกากลางของโปรเจกต์** — [`../../AGENTS.md`](../../AGENTS.md)
- **config ของ Crush** — [`../../crush.json`](../../crush.json)

## ลำดับการอ่านที่แนะนำ

- **นักออกแบบ / PM**: 01 → 02 → 03 → 04 → 05 → 06
- **นักพัฒนา frontend**: 06 → 07 → 04 → 10
- **นักพัฒนา backend**: 10 → 11 → 12 → 13 → 15
- **ทีม platform / DevOps**: 10 → 15 → 16 → 18

## Skills (สำหรับ Crush)

Crush โหลดสกิลจาก `.crush/skills/<ชื่อสกิล>/SKILL.md` เมื่อ `description` ตรงกับงานที่ทำ
สกิลชุดนี้บังคับ "กติกาของ Lumio" ให้สม่ำเสมอโดยไม่ต้องอธิบายซ้ำ

| สกิล | ใช้เมื่อ |
|---|---|
| `lumio-architecture` | วางโครงโมดูลใหม่ / ตัดสินใจว่าโค้ดควรอยู่ที่ไหน |
| `lumio-block-creator` | สร้างหรือแก้ block ในหน้าเว็บ |
| `lumio-api-endpoint` | เพิ่มหรือแก้ endpoint / DTO / service ใน NestJS |
| `lumio-db-migration` | แก้ Prisma schema / สร้างตาราง / index |
| `lumio-design-system` | ทำ UI ของ admin หรือ public block |
| `lumio-editor-ux` | ทำหน้าจอ Editor, Dashboard, Wizard, ข้อความ UI |
| `lumio-seo-performance` | แก้ renderer, meta, sitemap, รูป, ฟอนต์ |
| `lumio-security-review` | ก่อน merge โค้ดที่แตะ auth, upload, HTML, form, Apps |
| `lumio-template-pack` | สร้างหรือแก้ Template |
| `lumio-app-sdk` | สร้าง App / ส่วนขยาย |

---

*เอกสารนี้เป็นพิมพ์เขียวระดับระบบ ขั้นต่อไป: (0) วางสกิล Crush (มีแล้วใน repo นี้), (1) Figma prototype หน้า Editor + Dashboard, (2) Prototype Block engine, (3) ทดสอบกับผู้ใช้จริง 5 คน ก่อนพัฒนาเต็มรูปแบบ*
