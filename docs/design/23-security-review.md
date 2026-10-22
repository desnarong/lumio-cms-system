# 23 — Security Review (เฟส 1)

> ผลตรวจตามสกิล `lumio-security-review` และเช็กลิสต์หัวข้อ [15.7](15-security.md)
> ครอบคลุมโค้ดทั้งหมดของเฟส 1 (ก้อนที่ 1–9): auth, RBAC/RLS, editor, blocks,
> renderer/public API, media, wizard/templates
>
> **ก้อนที่ 11 แก้ blocker และข้อ "ควรแก้" ทั้งหมดแล้ว** — ดูสถานะต่อท้ายแต่ละข้อ
> และสรุปที่ [ท้ายไฟล์](#ก้อนที่-11-สิ่งที่แก้ไปแล้ว)

ตรวจเมื่อ: 2026-10-23 · อัปเดตสถานะ: 2026-10-24
คำสั่งที่รัน: `pnpm audit` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build`

## สรุปคำสั่งตรวจสอบ

| คำสั่ง | ก่อนก้อนที่ 11 | หลังก้อนที่ 11 |
|---|---|---|
| `pnpm lint` | ผ่าน (13 task) | ผ่าน (13 task) |
| `pnpm typecheck` | ผ่าน (13 task) | ผ่าน (13 task) |
| `pnpm test` | ผ่าน — 579 เคส (+15 ที่ต้องมี DB) | ผ่าน — **604 เคส** (+15 ที่ต้องมี DB) |
| `pnpm build` | ผ่าน | ผ่าน |
| `pnpm audit` | **63 ช่องโหว่** (5 critical · 22 high · 29 moderate · 7 low) | **2 ช่องโหว่** (0 critical · 1 high · 1 moderate) |

## Blocker (ต้องแก้ก่อนเปิดใช้จริง)

1. **Stored XSS ผ่าน `href` ที่ไม่ตรวจ scheme** — ✅ **แก้แล้ว (ก้อนที่ 10)**
   - `packages/blocks/src/blocks/button/schema.ts` และ `packages/blocks/src/blocks/common.ts`
     (`buttonValueSchema` ที่ hero/features ใช้) กับ `packages/shared/src/public.ts`
     (`menuItemSchema.href`) เดิมรับ `z.string()` ใดก็ได้ แล้ว `ButtonBlock` /
     `SiteHeader` / `SiteFooter` เอาไปใส่ `<a href>` ตรง ๆ
   - ผลกระทบ: ผู้ใช้ระดับ author ขึ้นไปบันทึก `javascript:…` แล้วรันสคริปต์ในเบราว์เซอร์
     ของผู้เข้าชม **และของแอดมินที่เปิดหน้า editor** (access token เก็บใน localStorage
     → ขโมยเซสชันได้)
   - วิธีแก้ที่ลงแล้ว: เพิ่ม `isSafeLink()` / `safeLinkSchema` ใน
     `packages/shared/src/links.ts` (ตัด control char/ช่องว่างก่อนเทียบ scheme แล้ว
     ปฏิเสธ `javascript:` `data:` `vbscript:` `file:`) นำไปใช้กับปุ่มทุกชนิดและเมนู
     ส่วน `BlockRenderer` ถ้า props ถูกปฏิเสธจะถอยไปใช้ค่า default ของ block (`/`)
   - เทสต์: `packages/shared/src/links.test.ts`, `packages/blocks/src/blocks/blocks.test.tsx`

2. **`next@14.x` มี advisory ระดับ critical/high** — ✅ **แก้แล้ว (ก้อนที่ 11)**
   - RCE (Windows-hosted), RCE ใน Image Optimization เมื่อใช้ AVIF, SSRF ใน rewrites/
     Server Actions, DoS — patched ≥ 15.5.24
   - วิธีแก้ที่ลงแล้ว: อัปเกรด `next` เป็น `^15.5.28` (`apps/renderer/package.json`)
     พร้อมปรับโค้ดตาม breaking change ของ Next 15 (`params` เป็น `Promise`,
     `headers()` เป็น async) — ตรวจด้วย `pnpm --filter renderer build` + `test`
     และรัน `next start` ยืนยันว่า prerender/sitemap/revalidate/header ยังทำงาน

## ควรแก้

1. **dependency ที่เหลือในสาย API/dev** — ✅ **แก้แล้ว (ก้อนที่ 11)**
   - ย้าย `pnpm.overrides` ไป `pnpm-workspace.yaml` (pnpm 11 ไม่อ่าน `package.json` แล้ว)
     แล้ว pin เวอร์ชันที่ patch: `multer@>=2.3.0`, `body-parser@>=1.20.6`,
     `qs@>=6.16.0`, `postcss@>=8.5.23`, `file-type@>=21.3.2`, `tinypool`, `picomatch`,
     `glob`, `tmp`, `ajv`, `webpack` และยกเครื่อง test/build toolchain
     (`vite@^6.4.4`, `vitest@^4.1.12`)
   - ผล: `pnpm audit` 63 → 2 (ดู [ข้อที่เหลือ](#ช่องโหว่ที่ยังเหลือ))

2. **ไม่มี security header** — ✅ **แก้แล้ว (ก้อนที่ 11)**
   - API: `apps/api/src/common/security-headers.ts` ติดตั้งก่อน static mount —
     `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`,
     `Permissions-Policy`, CSP `default-src 'none'; frame-ancestors 'none'`,
     `Cross-Origin-Resource-Policy: cross-origin` (เพราะ `/media/*` ฝังข้ามโดเมน),
     HSTS เฉพาะ production
   - renderer: `next.config.mjs` เพิ่ม header ชุดเดียวกัน + `poweredByHeader: false`
     และ `src/middleware.ts` + `src/lib/csp.ts` ออก CSP ต่อ request พร้อม nonce
     (`script-src 'self' 'nonce-…'`, `frame-ancestors 'none'`, `object-src 'none'`,
     `base-uri 'self'`) ให้ Next ประทับ nonce ให้สคริปต์ของตัวเอง; dev ผ่อนเฉพาะ
     `'unsafe-eval'` ให้ HMR ทำงาน

3. **CSRF: ไม่มี token และไม่ได้เช็ค `Origin`** — ✅ **แก้แล้ว (ก้อนที่ 11)**
   - `apps/api/src/common/origin.guard.ts` (`OriginGuard`) ผูกเป็น `APP_GUARD`
     เทียบ `Origin` กับ allow-list (`ADMIN_ORIGIN`/`RENDERER_ORIGIN`/`API_PUBLIC_URL`)
     เฉพาะ method ที่เปลี่ยนข้อมูล; คำขอที่ไม่มี `Origin` (worker/renderer/curl) ผ่านได้
     และ cookie refresh ยังใช้ `sameSite: 'lax'` เป็นชั้นแรกตามเดิม

4. **ไม่ได้ตั้ง `trust proxy`** — ✅ **แก้แล้ว (ก้อนที่ 11)**
   - `apps/api/src/common/trust-proxy.ts` + `main.ts` ตั้ง
     `app.set('trust proxy', …)` จาก `TRUST_PROXY` (ค่าเริ่มต้น 1 = Caddy ใน repo)

5. **rate limit เป็น in-memory ต่อ process และ `clear()` ทั้งหมดเมื่อคีย์เกิน** — ✅ **แก้แล้ว (ก้อนที่ 11)**
   - `apps/api/src/common/rate-limit.store.ts`: `MemoryRateLimitStore` evict แบบ
     **LRU + TTL** (ไม่ clear-all) และ `RedisRateLimitStore` (Lua `INCR`+`PEXPIRE`
     atomic, fallback ลง memory เมื่อ Redis ล่ม) เลือกอัตโนมัติจาก `REDIS_URL`;
     `RateLimitModule` (`@Global`) แชร์ store เดียวและปิด connection ตอน shutdown
   - เพิ่ม `@RateLimit` ให้ `POST /v1/auth/refresh` แล้ว

6. **ไม่มี account lockout / 2FA** — ✅ **แก้แล้ว (lockout ก้อนที่ 11 · 2FA ก้อนที่ 34)**
   - `LoginThrottleService` ล็อกบัญชีชั่วคราว 15 นาทีหลังพลาด 5 ครั้ง
     (นับต่ออีเมลแบบไม่สนตัวพิมพ์, รีเซ็ตเมื่อสำเร็จ) พร้อม `Logger.warn`
   - หมายเหตุ: `audit_logs` เป็นตาราง site-scoped ใต้ RLS (`FORCE`) จึงเขียน
     เหตุการณ์ระดับแพลตฟอร์ม (ไม่มี site) ไม่ได้ → ใช้ application log แทน
     และไม่ผ่อน RLS; ต่อมาเพิ่ม TOTP + recovery codes ในก้อนที่ 34 (challenge 5 นาที, ใช้ครั้งเดียว)

7. **เทียบ secret แบบไม่ constant-time** — ✅ **แก้แล้ว (ก้อนที่ 11)**
   - `apps/renderer/src/lib/revalidate.ts` ใช้ `createHash('sha256')` +
     `timingSafeEqual` (แฮชก่อนเทียบจึงไม่รั่วความยาว)

## ข้อสังเกต (ยังไม่ต้องแก้ตอนนี้)

- **HTML/Embed/rich text ยังไม่มีในระบบ** จึงยังไม่ต้องมี `sanitizeHtml()`;
  เมื่อทำ block HTML/Code ต้องจำกัดเฉพาะ role Admin ขึ้นไป + เรนเดอร์ใน
  `sandbox="allow-scripts"` iframe (ห้าม `allow-same-origin`) ตามหัวข้อ 15.3
- **Apps runtime ยังไม่มี** — `packages/sdk` มีแค่สัญญา `bridge`/permission scope
  (ก้อนนี้เป็นเฟส 2) ยังไม่มีการบังคับ sandbox จริงตามหัวข้อ 16
- **JSON-LD ปลอดภัย** — `apps/renderer/src/components/JsonLd.tsx:6` escape `<` เป็น
  `\u003c` ก่อนใส่ `<script>` แล้ว และเป็น script ชนิดไม่รัน (`application/ld+json`)
  จึงไม่ถูก CSP บล็อก
- **จุดที่ตรวจแล้วว่าดี**: Zod validate ทุก input ที่ controller (exception filter
  ไม่คาย stack ออกไปหา client), RLS ผ่าน `forSite()`/`forUser()` ทุก query ที่มี
  `site_id`, guard 3 ชั้น + `@Roles` ต่อ route, อัปโหลดตรวจ magic bytes + จำกัดขนาด +
  กัน path ออกนอก root + presigned token แบบ HMAC, Argon2id พารามิเตอร์ตาม OWASP,
  access/refresh secret แยกกัน, prod ปฏิเสธการบูตถ้าไม่ตั้ง `JWT_*`/`MEDIA_UPLOAD_SECRET`,
  ไม่มี secret ในโค้ด/log, `.env` ถูก gitignore
- **อัปโหลดสแกนไวรัสด้วย ClamAV แล้ว** (ก้อนที่ 35): `MEDIA_SCANNER=clamav` คุย clamd ผ่าน INSTREAM,
  สแกนตอนรับไฟล์และตอน confirm, สแกนไม่ผ่านหรือ clamd ล่ม = ปฏิเสธไฟล์ (fail closed)
- **sharp ใช้ pixel limit default** ของไลบรารี; ควรตั้ง `limitInputPixels` ให้ชัด
  เพื่อกัน decompression bomb
- **ฟอร์มสาธารณะ/honeypot/Turnstile** ยังไม่มี (forms module เป็นเฟส 2) จึงยังไม่ต้องมี
  rate limit สำหรับ form submit

## ช่องโหว่ที่ยังเหลือ (หลังก้อนที่ 11)

| ช่องโหว่ | ระดับ | เหตุที่ยังแก้ไม่ได้ในก้อนนี้ |
|---|---|---|
| `braces` 3.0.3 (dev, ผ่าน `@nestjs/cli`>chokidar) | high | advisory กำหนด patched `>=3.0.4` แต่ registry ที่ใช้ยังไม่มีเวอร์ชันนั้น |
| `@nestjs/core` 10.4.22 | moderate | patch อยู่ใน Nest 11 เท่านั้น — ต้องยกเป็นก้อน major upgrade แยก |

ทั้งสองเป็น dev/build หรือต้อง major upgrade; CI มี step `Dependency audit`
(`--audit-level=high`, `continue-on-error`) และ `.github/dependabot.yml` แจ้งเตือนรอบใหม่

## ลำดับงานถัดไปที่แนะนำ

1. ✅ อัปเกรด `next` เป็น `^15.5.24` + ตรวจ renderer build/test
2. ✅ เพิ่ม `pnpm.overrides` สำหรับ `multer`/`vite`/`vitest`/`glob`/`postcss`
3. ✅ ใส่ security header ทั้ง API และ renderer (พร้อม CSP + nonce)
4. ✅ `trust proxy` + Redis rate limit + lockout
5. ✅ ยก `@nestjs/core` เป็น 11.x, เพิ่ม 2FA + virus scan + `limitInputPixels` แล้ว (ก้อนที่ 11/34/35/36)
6. ⏳ (ถัดไป) test ระดับ HTTP (supertest) สำหรับ header/CSRF/rate limit

## ก้อนที่ 11: สิ่งที่แก้ไปแล้ว

- ไฟล์ใหม่ฝั่ง API: `common/security-headers.ts`, `common/origin.guard.ts`,
  `common/rate-limit.store.ts`, `common/rate-limit.module.ts`,
  `common/trust-proxy.ts`, `modules/auth/login-throttle.service.ts`
- ไฟล์ใหม่ฝั่ง renderer: `src/middleware.ts`, `src/lib/csp.ts`
- ไฟล์ที่แก้: `main.ts` (trust proxy + header + CORS), `app.module.ts` (OriginGuard,
  RateLimitModule), `common/rate-limit.guard.ts` (async + store), `modules/auth/*`
  (lockout + `@RateLimit` ที่ refresh), `renderer/src/lib/revalidate.ts`
  (constant-time), `renderer/next.config.mjs`, dynamic routes/sitemap/robots
  (Next 15 async `params`/`headers`)
- dependency: `next` → 15.5.28, `ioredis` (ใหม่), `vitest` → 4.1.12, `vite` → 6.4.4,
  overrides ใน `pnpm-workspace.yaml`
- เทสต์ใหม่ 32 เคส: store (LRU/reset/expiry), guard (async + shared store),
  origin, security header, trust proxy, lockout, CSP, secret ยาวไม่เท่ากัน

---

[← Why Easier](22-why-easier.md)
