# 15 — ความปลอดภัย

## 15.1 มาตรการหลัก

| ด้าน | มาตรการ |
|---|---|
| Authentication | Argon2id, 2FA, ล็อกบัญชีเมื่อผิดซ้ำ, Session management |
| Reader accounts | ผู้อ่านใช้ Argon2id + โทเคน HMAC แยกจากทีมงาน (`READER_SECRET`), ระบุได้แค่ “ผู้อ่านคนนี้ของเว็บนี้”, อายุ 30 วัน, คุกกี้ httpOnly |
| Authorization | RBAC + RLS ที่ DB, ตรวจ site_id ทุก query |
| Input | Sanitize rich text (DOMPurify/allow-list), validate ด้วย Zod/class-validator |
| Block HTML/Embed | จำกัดเฉพาะ role Admin ขึ้นไป + render ใน sandbox iframe |
| Upload | ตรวจ MIME จริง, สแกนไวรัสด้วย ClamAV (`MEDIA_SCANNER=clamav`), จำกัดขนาด, ห้าม SVG script |
| Transport | HTTPS บังคับ, HSTS, CSP, SameSite cookie |
| Rate limit | Login, Form submit (+ Honeypot / Turnstile กัน spam) |
| Paywall | ตรวจสิทธิ์ที่เซิร์ฟเวอร์ทุกครั้ง (fail-closed), หน้า locked ส่ง body ว่าง + `noindex`, คำตอบที่มี Authorization เป็น `private, no-store`, ลืมรหัสผ่านตอบเหมือนกันทุกกรณีเพื่อไม่ให้เดาว่ามีบัญชี |
| Apps/Plugins | รันใน sandbox (iframe + postMessage / WASM) ไม่แตะ DB ตรง ใช้ permission scopes |
| Backup | อัตโนมัติรายวัน เก็บ 30 วัน + ปุ่ม Restore คลิกเดียว |
| Compliance | PDPA: Cookie banner ในตัว, ลบข้อมูลตามคำขอ, Data export |
| Audit | บันทึกการกระทำสำคัญทั้งหมด |

## 15.2 Threat Model (ภัยที่ต้องป้องกัน)

| ภัย | ตัวอย่าง | มาตรการ |
|---|---|---|
| XSS | ผู้ใช้ใส่ `<script>` ใน rich text | sanitize + CSP |
| SQL Injection | ผ่าน query ที่ประกอบเอง | ใช้ Prisma/parameterized เท่านั้น |
| IDOR / ข้ามเว็บ | เปลี่ยน `site_id` ใน URL | RLS + SiteGuard |
| SSRF | ใส่ URL ภายนอกให้ระบบ fetch | allow-list + block internal IP |
| CSRF | ยิง API จากเว็บอื่น | SameSite + CSRF token สำหรับ cookie auth |
| Upload abuse | อัปไฟล์ .php/.svg ที่มี script | ตรวจ MIME จริง + block list |
| Brute force | เดารหัสผ่าน | rate limit + lockout + 2FA |
| Spam form | บอทกรอกฟอร์ม | honeypot + Turnstile |
| Supply chain | dependency มีช่องโหว่ | `pnpm audit` + Dependabot ใน CI |
| Privilege escalation | author publish เอง | ตรวจ role ที่ API ทุกครั้ง |

## 15.3 กฎการจัดการ HTML/Embed

- Rich text ผ่าน `sanitizeHtml()` ด้วย allow-list เท่านั้น
- Block HTML/Code: เฉพาะ role Admin ขึ้นไป
- Render ใน sandbox iframe (`sandbox="allow-scripts"` ไม่มี `allow-same-origin`)
- ห้าม inline event handler (`onclick=`) ทุกกรณี

## 15.4 Secrets

- ห้าม commit secrets — ใช้ env + secret manager
- ห้าม log token/password/ข้อมูลอ่อนไหว
- Rotate keys เป็นระยะ + แยก key ต่อ environment
- `READER_SECRET` ใช้เซ็นเซสชันของผู้อ่าน (ถ้าไม่ตั้ง จะ fallback ไป `JWT_ACCESS_SECRET`)
  — หมุนเวียนแล้วผู้อ่านทุกคนต้องเข้าสู่ระบบใหม่
- `LUMIO_LICENSE` เป็นโทเคนที่ลงลายเซ็น ไม่ใช่ความลับระดับสูง แต่ใส่ใน env ของ production
  และตรวจได้ด้วย `POST /api/v1/public/license/verify`

## 15.5 Backup & Restore

- Backup อัตโนมัติรายวัน เก็บ 30 วัน (config ตามแพ็กเกจ)
- Restore คลิกเดียว → ต้องยืนยัน + บันทึก audit
- ทดสอบ restore จริงเป็นระยะ (ไม่ใช่แค่ backup)

## 15.6 Compliance (PDPA)

- Cookie banner ในตัว (opt-in สำหรับ non-essential)
- ลบข้อมูลตามคำขอ (data deletion) + data export
- เก็บ pageviews แบบ anonymized (session_hash, ไม่เก็บ IP เต็ม)
- ระบุใน Privacy Policy

## 15.7 Checklist ก่อน Merge (โค้ดที่แตะความปลอดภัย)

- [ ] input validate ด้วย Zod ทุกจุด
- [ ] HTML sanitize ก่อน render
- [ ] query กรอง `site_id` + RLS ทำงาน
- [ ] role ตรวจที่ API (ไม่พึ่ง UI)
- [ ] upload ตรวจ MIME จริง + จำกัดขนาด
- [ ] endpoint สาธารณะมี rate limit
- [ ] ไม่มี secret ในโค้ด/log
- [ ] มี test: 403, ข้ามเว็บ, validation error
- [ ] รัน `pnpm audit`

---

[← SEO & Performance](14-seo-performance.md) · [ถัดไป: Apps →](16-apps.md)
