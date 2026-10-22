---
name: lumio-security-review
description: Use before merging any Lumio code that touches auth, uploads, HTML/embed, forms, Apps, or database queries. Runs the security checklist (sanitize, RLS, rate limit, MIME check, sandbox, secrets) and reports findings.
---

# Lumio Security Review

อ่าน [`docs/design/15-security.md`](../../docs/design/15-security.md) ประกอบ

## Checklist (ใช้เป็นรายการตรวจ)

- [ ] input validate ด้วย Zod ทุกจุด (schema อยู่ใน `packages/shared`)
- [ ] HTML จากผู้ใช้ sanitize ก่อน render (`sanitizeHtml()` + allow-list)
- [ ] query กรอง `site_id` + RLS ทำงาน (ทดสอบข้ามเว็บ)
- [ ] role ตรวจที่ API (`@Roles`), ไม่พึ่งการซ่อน UI
- [ ] upload ตรวจ MIME จริง + จำกัดขนาด + block list (ห้าม SVG script)
- [ ] endpoint สาธารณะมี rate limit + honeypot/Turnstile
- [ ] ไม่มี secret ในโค้ด/log
- [ ] Block HTML/Embed จำกัด role Admin ขึ้นไป + sandbox iframe
- [ ] Apps รัน sandbox + ตรวจ permission scope ทุก call
- [ ] มี test: 403, ข้ามเว็บ (site A อ่าน site B ไม่ได้), validation error
- [ ] ไม่มี SSRF (allow-list + block internal IP)
- [ ] CSRF: SameSite + token สำหรับ cookie auth

## Threat ที่ต้องคิดถึง

| ภัย | จุดที่มักพลาด |
|---|---|
| XSS | rich text, embed, alt/title ที่ render เป็น HTML |
| IDOR | path/param ที่รับ id โดยไม่ตรวจ site |
| SSRF | ฟีเจอร์ "import จาก URL", webhook |
| Upload abuse | ไฟล์ที่ปลอม MIME, SVG, zip bomb |
| Brute force | login, refresh token, OTP |
| Spam | public form submit |

## ขั้นตอน

1. ระบุไฟล์/โมดูลที่เปลี่ยนและแตะด้านความปลอดภัยด้านบน
2. ไล่ checklist ทีละข้อ — ถ้าข้อไหนไม่มี ให้เปิดเป็น finding
3. รัน `pnpm audit` และ dependency check
4. สรุปผลเป็น 3 กลุ่ม: **ต้องแก้ (blocker) / ควรแก้ / ข้อสังเกต**
5. สำหรับ blocker ให้เสนอวิธีแก้พร้อมจุดที่ต้องแก้

## ตรวจสอบ

```bash
pnpm audit
pnpm test
pnpm typecheck
pnpm lint
```

## รูปแบบรายงาน

```
## Blocker
- <ไฟล์:บรรทัด> — <ปัญหา> — <วิธีแก้>

## ควรแก้
- ...

## ข้อสังเกต
- ...
```
