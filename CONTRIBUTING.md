# Contributing to Lumio

ขอบคุณที่สนใจช่วยพัฒนา Lumio — โปรเจกต์นี้เปิดให้ใช้และพัฒนาต่อได้แบบ Community

## ก่อนเริ่ม

- Node.js ≥ 20 และ pnpm 11 (`corepack enable`)
- Docker (สำหรับ PostgreSQL 16, Redis, MinIO) — ถ้าไม่ใช้ Docker ต้องเตรียมฐานข้อมูลเอง
- อ่าน [`AGENTS.md`](AGENTS.md) (กติกากลาง) และ [`docs/design/`](docs/design/README.md) ก่อนแก้โค้ด

```bash
cp .env.example .env
pnpm i
docker compose up -d db redis minio
pnpm dev
```

- Admin: <http://localhost:49300> · API: <http://localhost:49100/api> · Renderer: <http://localhost:49200>
- บัญชีทดลองหลัง `pnpm db:seed`: `owner@lumio.app` / `lumio-demo-1234`

## กฎที่ต้องผ่านก่อนส่ง PR

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e:install   # ครั้งแรกครั้งเดียว
pnpm test:e2e
```

- ทุกตารางข้อมูลของเว็บต้องมี `site_id` + RLS
- Validate input ด้วย Zod จาก `packages/shared`
- ห้าม hard-code สี/ขนาดใน component — ใช้ design tokens
- ข้อความ UI ต้องผ่าน i18n (ไทยเป็นค่าเริ่มต้น, อังกฤษเสริม)
- การลบ/แก้ไขสำคัญต้องยกเลิกได้และมี audit log
- HTML จากผู้ใช้ต้อง sanitize ก่อน render

## Commit

ใช้ [Conventional Commits](https://www.conventionalcommits.org/) เช่น
`feat(editor): add slash menu`, `fix(api): reject unsafe links`

- 1 commit = 1 เรื่องที่อธิบายได้ด้วยประโยคเดียว
- ห้าม commit `.env`, คีย์, ไฟล์ใน `.crush/` ที่ไม่ใช่ skills, หรือข้อมูลผู้ใช้จริง

## ส่ง PR

1. Fork และสร้าง branch (`feat/...`, `fix/...`)
2. เขียน test สำหรับพฤติกรรมใหม่ (vitest + Playwright เมื่อเป็น UI flow)
3. อัปเดต [`docs/PROGRESS.md`](docs/PROGRESS.md) ถ้าเป็นงานก้อนใหม่
4. เปิด PR พร้อมอธิบายว่าแก้อะไร เพราะอะไร และผู้ใช้ได้อะไร

## License ของงานที่ส่ง

โค้ดที่ส่งเข้ามาจะอยู่ภายใต้ [AGPL-3.0](LICENSE) ของโปรเจกต์
การส่ง PR ถือว่าคุณยืนยันว่ามีสิทธิ์ในโค้ดนั้นและยอมให้เผยแพร่ตามสัญญานี้

ฟีเจอร์ที่ขายแยก (Membership/Paywall, Block Marketplace) ไม่อยู่ในรีโปนี้ —
ดู [`docs/COMMERCIAL.md`](docs/COMMERCIAL.md)
