# Lumio — Project Rules

> กติกากลางของโปรเจกต์ที่ Crush อ่านเป็น context ทุก session
> เอกสารออกแบบฉบับเต็มอยู่ที่ [`docs/design/`](docs/design/README.md)

## Stack

Monorepo (pnpm + turbo):
- `apps/admin` — React + Vite (admin + editor)
- `apps/api` — NestJS + Prisma + PostgreSQL (+ worker ด้วย BullMQ)
- `apps/renderer` — Next.js (public site renderer)
- `packages/{blocks,ui,tokens,sdk,shared}`

## คำสั่งหลัก

- ติดตั้ง: `pnpm i`
- ทดสอบ: `pnpm test` · E2E: `pnpm test:e2e` · Lint: `pnpm lint` · Typecheck: `pnpm typecheck`
- DB: `pnpm --filter api prisma migrate dev`
- รันทั้งหมด: `docker compose up -d && pnpm dev`
- หลังแก้โค้ดเสร็จทุกครั้ง: `docker compose --profile app up -d --build` แล้วตรวจ `docker compose ps`

## กฎเหล็ก

1. ทุกตารางที่เป็นข้อมูลของเว็บ **ต้องมี `site_id`** + RLS
2. Validate input ทุกจุดด้วย Zod (schema อยู่ใน `packages/shared`)
3. ห้ามใส่สี/ขนาด hard-code ใน component — ใช้ design tokens เท่านั้น
4. ข้อความ UI ทุกตัวต้องผ่าน i18n (th เป็นค่าเริ่มต้น, en เสริม)
5. การกระทำที่ลบ/แก้ไขสำคัญต้อง **ยกเลิกได้ (undo)** และบันทึก audit log
6. HTML จากผู้ใช้ต้อง sanitize ก่อน render เสมอ
7. ก่อนจบงาน ต้องรัน lint + typecheck + test ที่เกี่ยวข้องให้ผ่าน

## สไตล์โค้ด

TypeScript strict, ไม่ใช้ `any`, ฟังก์ชันเล็ก ตั้งชื่อสื่อความหมาย,
commit แบบ Conventional Commits

## เมื่อทำงานที่ตรงกับสกิล

ใช้สกิลใน `.crush/skills` ก่อนเสมอ (architecture, block, endpoint, migration,
design, editor-ux, seo-performance, security, template, app-sdk, versioning)

**ทุกครั้งที่แก้ไฟล์ ต้อง bump เวอร์ชันก่อนจบงาน** ด้วย
`node scripts/bump-version.mjs patch|minor|major` (ดู `.crush/skills/lumio-versioning`)

## การใช้เครื่องมือ (อ่านก่อนแก้ไฟล์ทุกครั้ง)

พาธของโปรเจกต์มี `@` และ `@@` อยู่ (`D:\@MyApp\@@\lumio-cms-system`) ซึ่งทำให้เครื่องมือ
อ่าน/เขียนไฟล์ของ Crush สับสนพาธได้เป็นครั้งคราว: ตอบ "File not found" ทั้งที่ไฟล์มี,
อ่านได้เนื้อหาเวอร์ชันเก่าจากแคช, หรือปฏิเสธการแก้ด้วยข้อความ
"you must read the file before editing it" ทั้งที่เพิ่งอ่านไปแล้ว

**กฎที่ต้องทำตามเสมอ**

1. **ใช้พาธแบบ relative ด้วย forward slash กับทุกเครื่องมือไฟล์** เช่น `apps/api/src/main.ts`
   — อย่าใช้พาธ absolute (`D:/@MyApp/...`) และอย่าปน `..` เพราะตัวบันทึก "อ่านแล้ว"
   (`read_files`) เก็บพาธคนละรูปแบบกับที่ตัว edit ค้นหา → edit จะถูกปฏิเสธ
2. **ไฟล์ที่ต้องเขียน ใช้ `write` ครั้งเดียวจบ** (เขียนทับทั้งไฟล์) ไม่ต้องไล่ `edit` หลายรอบ
3. **โฟลเดอร์ dynamic ของ Next.js (`[slug]`, `[formId]`)** — `edit` อาจตอบว่า "Applied"
   แต่ไฟล์ไม่เปลี่ยนจริง: ให้เขียนทั้งไฟล์ด้วย `write`/heredoc และย้าย logic ที่ต้องทดสอบ
   ออกมาไว้ไฟล์ปกติ (เช่น `apps/renderer/src/lib/form-submit.ts`)
   และ **vitest ไม่เก็บ test ที่อยู่ในโฟลเดอร์ `[param]`** → วาง test ไว้ข้างนอกเสมอ
4. **ยืนยันการเขียนด้วย bash** (`cat <file>` หรือ `ls -la <file>`) ทุกครั้งที่ไฟล์นั้นสำคัญ
   เพราะเครื่องมืออาจรายงานว่าสำเร็จแต่ไฟล์ยังไม่ถูกเขียน
5. **ทางที่เชื่อถือได้ที่สุดคือเขียนผ่าน bash heredoc** เมื่อเครื่องมือเริ่มพัง
   ```bash
   cat > path/to/file.ts <<'LUMIO_EOF'
   ...เนื้อหา...
   LUMIO_EOF
   ```
6. **bash ที่นี่เป็น mvdan/sh บน Windows — ไม่มี `grep`, `head`, `tail`, `sed`, `wc`, `sqlite3`**
   ให้ใช้ `cat` เดี่ยว ๆ, เครื่องมือ Grep/View หรือ `node -e "..."` (มี Node 24 ให้ใช้)
7. **เครื่องมือ Grep ไม่ค้นในพาธที่ถูก gitignore** (`.crush/`, `node_modules/`, `dist/`,
   `.next/`) — ต้องดูไฟล์ในนั้นให้ใช้ `cat` หรือ `node`
8. **อ่านไฟล์เท่าที่จำเป็น** (`limit`/`offset`, `lsp_symbols` ก่อนแก้) เพราะการอ่านไฟล์เดิมซ้ำ ๆ
   คือสิ่งที่ทำให้แคชเพี้ยนบ่อยที่สุด

**เมื่อเครื่องมือเริ่มพัง → ล้างแคช** (แคชเนื้อหาไฟล์อยู่ใน `.crush/crush.db` ตาราง `files`
กับ `read_files` และโตข้ามเซสชัน)

```bash
node scripts/prune-crush-cache.mjs                                  # ดูว่าจะลบอะไร (ไม่ลบจริง)
node scripts/prune-crush-cache.mjs --apply --vacuum                 # ลบแคชเซสชันเก่า + คืนพื้นที่
node scripts/prune-crush-cache.mjs --apply --path page.test.tsx     # บังคับให้ไฟล์นี้อ่านใหม่
```

สคริปต์สำรองฐานข้อมูลไปที่ `.crush/backups/` ก่อนลบเสมอ และไม่แตะประวัติแชท (`messages`)
ถ้ายังพังอยู่: ปิด Crush แล้วเปิดเซสชันใหม่ (ตัวกัน "อ่านก่อนแก้" แยกตามเซสชัน)

## แผนผังการอ้างอิงเอกสาร

| เรื่อง | ไฟล์ |
|---|---|
| หลักการ/วิสัยทัศน์ | `docs/design/01-vision.md` |
| UX / Editor | `docs/design/04-ux.md` |
| Admin IA | `docs/design/05-admin-ia.md` |
| Design System | `docs/design/06-design-system.md` |
| Blocks | `docs/design/07-blocks.md` |
| Architecture | `docs/design/10-architecture.md` |
| Data Model | `docs/design/11-data-model.md` |
| API | `docs/design/12-api.md` |
| RBAC | `docs/design/13-rbac.md` |
| SEO/Performance | `docs/design/14-seo-performance.md` |
| Security | `docs/design/15-security.md` |
| Deployment | `docs/design/18-deployment.md` |
