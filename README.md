# Lumio CMS — Community edition

> สร้างเว็บสวย ๆ ได้ใน 10 นาที โดยไม่ต้องเขียนโค้ด
> มัลติเทแนนต์, Page builder แบบบล็อก, SEO, ร้านค้า, หลายภาษา และสำรองข้อมูล — ใช้งานเองได้ฟรี

Lumio คือ CMS แบบ multi-tenant (pnpm workspaces + Turborepo) ที่เปิดให้ดาวน์โหลดไปใช้และพัฒนาต่อ
ภายใต้สัญญา [AGPL-3.0](LICENSE) ฟีเจอร์ที่ขายแยก (Membership/Paywall, Block Marketplace) เปิดได้เมื่อมี
ไลเซนส์ที่ลงลายเซ็น — ดู [`docs/COMMERCIAL.md`](docs/COMMERCIAL.md) และ
[`docs/design/24-community-licensing.md`](docs/design/24-community-licensing.md)

## มีอะไรใน Community

- Visual editor แก้บนหน้าเว็บจริง, undo/redo, version history, autosave
- 20 template ภาษาไทย + design panel + section templates
- หน้าเว็บ/บทความ/หมวดหมู่/เมนู, คลังสื่อ (crop, WebP/AVIF, srcset), ฟอร์ม + อีเมล/LINE
- SEO (meta, sitemap, JSON-LD, OG image), i18n `/en/...`, analytics ในตัว
- ร้านค้า (สินค้า/ตัวเลือก/ตะกร้า/พร้อมเพย์/บัตร Stripe/ใบเสร็จ), ฟีเจอร์ AI (local หรือ OpenAI-compatible)
- ทีม + RBAC, 2FA, audit log, แบ็กอัปอัตโนมัติ, redirect manager, custom domain + SSL
- ทุกอย่างตรวจสอบได้ด้วย `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`

**ยังไม่รวม (ต้องมีไลเซนส์):** Membership/Paywall และ Block Marketplace — บันทึกแผนไว้ใน
[`docs/PROGRESS.md`](docs/PROGRESS.md) หัวข้อ “งานถัดไป”

## โครงสร้าง

```
apps/
  admin/      React + Vite — หน้าจอผู้ดูแลและ Editor
  api/        NestJS + Prisma — API และ worker (BullMQ)
  renderer/   Next.js — เรนเดอร์เว็บไซต์สาธารณะ (read-only)
packages/
  blocks/     นิยาม block (schema + renderer + registry)
  ui/         Design system components
  tokens/     Design tokens (สี ระยะห่าง เงา ฟอนต์)
  sdk/        SDK สำหรับ App/block ภายนอก + ตัวช่วยตรวจลายเซ็น webhook
  shared/     Zod schema, type, RBAC และไลเซนส์ที่ใช้ร่วมกัน
e2e/          Playwright smoke tests
infra/        Docker, Caddy, Nginx
templates/    Template packs (tokens + header/footer + หน้าตัวอย่าง ภาษาไทยจริง)
```

## เริ่มใช้งาน

ต้องมี Node.js ≥ 22.13, pnpm 11 (`corepack enable`) และ Docker

```bash
cp .env.example .env
pnpm i
docker compose up -d
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma db seed
pnpm dev
```

- Admin: <http://localhost:49300> · API: <http://localhost:49100/api> · Renderer: <http://localhost:49200>
- บัญชีทดลอง: `owner@example.com` / `lumio-demo-1234`
- ถ้าไม่ตั้ง `VITE_API_URL` แอดมินจะรันโหมดทดลองด้วยข้อมูลในหน่วยความจำ
- อยากได้ทั้งระบบใน Docker (production-like): `docker compose --profile app up -d --build` ดู [`docs/DOCKER.md`](docs/DOCKER.md)

ก่อนใช้งานจริง เปลี่ยนค่า `change-me-*` ใน `.env` และอ่าน [`SECURITY.md`](SECURITY.md)

## คำสั่งหลัก

| งาน | คำสั่ง |
|---|---|
| รันทั้งหมด | `docker compose up -d && pnpm dev` |
| ทั้งระบบใน Docker | `docker compose --profile app up -d --build` |
| Lint / Typecheck / Test | `pnpm lint` · `pnpm typecheck` · `pnpm test` |
| E2E (ครั้งแรกติดตั้งเบราว์เซอร์) | `pnpm test:e2e:install && pnpm test:e2e` |
| Build | `pnpm build` |
| DB migration | `pnpm --filter api prisma migrate dev` |

## ไลเซนส์และลายเซ็น

- **Community** = AGPL-3.0: ใช้/แก้/โฮสต์ได้ แต่ถ้าแก้แล้วให้บริการผ่านเครือข่ายต้องเปิดเผยโค้ดที่แก้
- **Pro** = ไลเซนส์ Ed25519 ที่ลงลายเซ็น ระบุฟีเจอร์ที่ปลดล็อก ตรวจแบบออฟไลน์ ไม่มี telemetry
- ตรวจไลเซนส์: `POST /api/v1/public/license/verify` · สถานะที่ติดตั้ง: `GET /api/v1/license`
- ตรวจลายเซ็น webhook ฝั่งผู้รับ:

```ts
import { verifyLumioSignature } from '@lumio/sdk';

const ok = await verifyLumioSignature({
  secret: process.env.LUMIO_WEBHOOK_SECRET!,
  timestamp: req.header('x-lumio-timestamp') ?? '',
  body: rawBody,
  header: req.header('x-lumio-signature') ?? '',
});
```

## เอกสารและมีส่วนร่วม

- กติกากลางของโปรเจกต์: [`AGENTS.md`](AGENTS.md)
- เอกสารออกแบบ: [`docs/design/`](docs/design/README.md) · ความคืบหน้า: [`docs/PROGRESS.md`](docs/PROGRESS.md)
- แนวทางส่ง PR: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- แจ้งช่องโหว่: [`SECURITY.md`](SECURITY.md) (ห้ามเปิด issue สาธารณะ)
- ชื่อ/โลโก้/โดเมน: [`TRADEMARK.md`](TRADEMARK.md)
- Checklist ใช้งานจริง: [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- จรรยาบรรณ: [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
