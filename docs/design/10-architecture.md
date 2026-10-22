# 10 — สถาปัตยกรรมระบบ

## 10.1 Tech Stack ที่แนะนำ

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

## 10.2 ภาพรวมสถาปัตยกรรม

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

### ขอบเขตความรับผิดชอบของแต่ละส่วน

| ส่วน | รับผิดชอบ | ห้ามทำ |
|---|---|---|
| **admin** (SPA) | UI แก้ไข, ยิง API | ต่อ DB ตรง, render public site |
| **api** (NestJS) | business logic, auth, validate | render HTML ของ public site |
| **renderer** (Next.js) | render public site จาก block JSON | เขียนข้อมูล (read-only) |
| **worker** | งานเบื้องหลัง (รูป, อีเมล, backup, publish) | รับ HTTP จากผู้ใช้ |

### กฎการ import ข้ามแพ็กเกจ

```
apps/*        → packages/*        (ได้)
packages/ui   → packages/tokens   (ได้)
packages/blocks → packages/ui, packages/tokens, packages/shared  (ได้)
packages/shared → (ไม่มี dependency ภายใน)  (ต้องเป็น leaf)
renderer      → packages/blocks, packages/ui, packages/tokens, packages/shared
admin         → packages/blocks, packages/ui, packages/tokens, packages/shared, packages/sdk
```

- **ห้าม** `packages/*` import จาก `apps/*` (ทิศทางเดียว)
- **ห้าม** `packages/shared` import อะไรภายใน (กัน circular)

## 10.3 Multi-tenant

- 1 แพลตฟอร์ม ดูแลหลายเว็บ: ทุกตารางมี `site_id` + Row-Level Security (RLS) ใน PostgreSQL
- Domain mapping: `customdomain.com → site_id` ผ่านตาราง `domains` + Caddy on-demand TLS
- Subdomain ฟรี: `mysite.lumio.app`

### การ resolve site จาก request
1. อ่าน `Host` header
2. lookup ใน `domains` (custom domain) หรือ parse subdomain
3. set `app.current_site` (session var) → RLS ทำงาน
4. cache mapping ใน Redis (TTL สั้น)

## 10.4 Rendering Strategy

1. กด **Publish** → Worker render หน้าเป็น static HTML → push ขึ้น CDN
2. เนื้อหาไดนามิก (ฟอร์ม, ค้นหา, ตะกร้า) ใช้ Islands / API call ฝั่ง client
3. Preview mode ใช้ SSR สดจาก draft
4. ผลลัพธ์: โหลด < 1 วินาที, TTFB < 100ms จาก CDN

### Publish pipeline

```
Publish ─▶ API: คัดลอก blocks_draft → blocks_published, ตั้ง revision
        ─▶ enqueue job (BullMQ)
        ─▶ Worker: render แต่ละหน้า → HTML + assets
        ─▶ push ขึ้น S3/CDN + invalidate cache
        ─▶ mark published_at
```

ปลายทางของ static host และ CDN เป็น **ค่าต่อเว็บ** ที่เจ้าของเว็บกรอกเองใน
ตั้งค่า › การเผยแพร่ (`sites.settings.publish`) คีย์ลงชื่อเข้ารหัสด้วย
installation key ซึ่งสร้างอัตโนมัติเมื่อยังไม่มี `SECRETS_ENCRYPTION_KEY`
จึงติดตั้งใหม่แล้วเผยแพร่ได้โดยไม่ต้องแก้ `.env`
การเขียนหน้าเว็บทำแบบขนานภายใต้งบ 10 วินาที (03-scope.md Definition of Done)

## 10.5 Realtime (เฟส 2)

- WebSocket แจ้ง "คุณสมศรีกำลังแก้หน้านี้" + ป้องกันชนกัน (optimistic lock ผ่าน `baseRevision`)
- Presence ต่อหน้า (ใครกำลังดู/แก้)
- ใช้ Redis pub/sub เป็น backbone

## 10.6 Observability

- **Metrics**: Prometheus (latency, error rate, queue depth)
- **Logs**: structured JSON → Loki
- **Errors**: Sentry (ทั้ง api, admin, renderer)
- **Traces**: OpenTelemetry (request → db → worker)
- **Alerts**: queue ค้าง, error rate สูง, publish ล้มเหลว

---

[← AI Assistant](09-ai-assistant.md) · [ถัดไป: Data Model →](11-data-model.md)
