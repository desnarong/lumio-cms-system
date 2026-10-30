# ความคืบหน้า (Progress)

> ติดตามงานย่อยตาม [`docs/design/19-roadmap.md`](design/19-roadmap.md) หัวข้อ 19.3
> อัปเดตสถานะทุกครั้งที่จบงานหนึ่งก้อน

อัปเดตล่าสุด: 2026-10-30 (ก้อนที่ 68 เสร็จ)

## สถานะงาน (Roadmap 19.3)

| #   | งาน                                                                                                                       |  สถานะ   | หมายเหตุ                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------- | :------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | สร้างโครง monorepo                                                                                                        | ✅ เสร็จ | pnpm + turbo, apps ทั้ง 3, packages ทั้ง 5, docker-compose, CI                                                                                                                                                                                                                                                                                      |
| 2   | Database (Prisma + RLS + seed)                                                                                            | ✅ เสร็จ | Prisma schema ตามหัวข้อ 11 + RLS (FORCE) + seed ไทย 2 เว็บ + test ข้ามเว็บ                                                                                                                                                                                                                                                                          |
| 3   | Design tokens + UI kit                                                                                                    | ✅ เสร็จ | tokens ครบ (light/dark) + UI kit 27 component + Storybook 10 + a11y                                                                                                                                                                                                                                                                                 |
| 4   | Auth + Sites + RBAC                                                                                                       | ✅ เสร็จ | login/register/refresh/logout/me, sites, members, guard 3 ชั้น + audit log                                                                                                                                                                                                                                                                          |
| 5   | Block engine + 6 block แรก                                                                                                | ✅ เสร็จ | engine ครบ (shell/editable/img/renderer/paths/migrate/loader) + 6 block + panel                                                                                                                                                                                                                                                                     |
| 6   | Editor (edit-on-page)                                                                                                     | ✅ เสร็จ | Contents API + หน้า Editor (inline edit, slash, ลากวาง, panel, undo, autosave)                                                                                                                                                                                                                                                                      |
| 7   | Renderer + Publish                                                                                                        | ✅ เสร็จ | Public API + renderer อ่าน blocks_published + SEO/JSON-LD/sitemap + publish job                                                                                                                                                                                                                                                                     |
| 8   | Media library                                                                                                             | ✅ เสร็จ | presign + ตรวจ magic bytes + sharp worker (WebP/AVIF/srcset) + คลังรูปในแอดมิน                                                                                                                                                                                                                                                                      |
| 9   | Wizard + Templates                                                                                                        | ✅ เสร็จ | template 3 แบบ (ร้านอาหาร/คลินิก/ฟรีแลนซ์) + wizard 5 ขั้น + login admin + เปลี่ยนเทมเพลต                                                                                                                                                                                                                                                           |
| 10  | Security review                                                                                                           | ✅ เสร็จ | แก้ XSS ลิงก์แล้ว; เหลืออัปเกรด next + header/CSRF → [`design/23-security-review.md`](design/23-security-review.md)                                                                                                                                                                                                                                 |
| 11  | Security hardening                                                                                                        | ✅ เสร็จ | ปิด blocker/ควรแก้จากก้อนที่ 10: next 15.5, overrides, headers+CSP, CSRF, trust proxy, Redis rate limit, lockout — `pnpm audit` เหลือ 2 (แก้ไม่ได้ในก้อนนี้)                                                                                                                                                                                        |
| 12  | หน้าจอหลังบ้าน (Dashboard + ดีไซน์)                                                                                       | ✅ เสร็จ | admin shell 5 เมนู + Dashboard (สถิติ/สุขภาพเว็บ/checklist) + หน้าจอดีไซน์ครบ (สไตล์/เมนู/Header-Footer/เปลี่ยน Template/เทมเพลตส่วน) + รายการหน้าเว็บ-บทความ + ตั้งค่า (ทั่วไป/โดเมน/ทีมงาน)                                                                                                                                                       |
| 13  | ฟอร์มติดต่อ & ข้อความที่ได้รับ                                                                                            | ✅ เสร็จ | ฟอร์ม (สร้าง/แก้ช่อง/แจ้งเตือนอีเมล-LINE) + กล่องข้อความ (กรอง/อ่านแล้ว/เก็บเข้าคลัง + undo) + block ฟอร์มบนหน้าเว็บที่ส่งข้อความได้โดยไม่ใช้ JavaScript                                                                                                                                                                                            |
| 14  | ประวัติเวอร์ชัน & ถังขยะเนื้อหา                                                                                           | ✅ เสร็จ | เก็บเวอร์ชันทุกครั้งที่เผยแพร่ + บันทึกเวอร์ชันเอง/ดูตัวอย่าง/กู้คืนในหน้าแก้ไข, ถังขยะเนื้อหา (กู้คืน/ลบถาวร) ทั้งในรายการหน้าเว็บและเมนูตั้งค่า + ลบอัตโนมัติหลัง 30 วัน                                                                                                                                                                          |
| 15  | เมนู “เติบโต” (SEO/Analytics/Newsletter/Apps)                                                                             | ✅ เสร็จ | `GET /seo/health` ต่อจากคะแนนสุขภาพเว็บ, หน้าสถิติผู้เข้าชม (7/30 วัน + แนวโน้ม + หน้าที่ถูกเปิด/แหล่งที่มา/อุปกรณ์), รายชื่อผู้ติดตามข่าว (เพิ่ม/เปลี่ยนสถานะ/นำออก + undo + export CSV), คลัง Apps พร้อม permission scope                                                                                                                         |
| 16  | Command palette, สถิติจริง, App sandbox, สำรองข้อมูล, แพ็กเกจ                                                             | ✅ เสร็จ | Command Palette (Ctrl/⌘+K) ค้นคำสั่ง+เนื้อหา, beacon เก็บ pageview + Analytics ใช้งานได้จริง, App sandbox (iframe + postMessage ตรวจ scope), export/import ทั้งเว็บ (JSON), หน้าจอแพ็กเกจ/โควตา/ประวัติการชำระเงิน (migration `invoices`)                                                                                                           |
| 17  | ผู้ช่วย AI (เขียน/แปล/คำอธิบายรูป/SEO)                                                                                    | ✅ เสร็จ | provider abstraction (local ไม่ต้องมี key + OpenAI-compatible), เสนอเป็น diff ให้กด "นำไปใช้"/"ยกเลิก" + undo, โควตาตามแพ็กเกจ (ตาราง `ai_usage`) + cache + audit, ปุ่ม ✨ ใน editor/คลังรูป                                                                                                                                                        |
| 18  | หลายภาษา (i18n)                                                                                                           | ✅ เสร็จ | `contents.translation_group_id` + สร้างคำแปลจากโครงเดิม (ร่างเสมอ, แปลทั้งหน้าด้วย AI ได้), URL `/en/...` (ภาษาหลักไม่มีคำนำหน้า) + hreflang/x-default + fallback พร้อมป้าย, block ตัวสลับภาษา (ไม่มี JS), แท็บตั้งค่า › ภาษา                                                                                                                       |
| 19  | i18n ต่อ (ปุ่มแปล + ตัวกรองภาษา)                                                                                          | ✅ เสร็จ | `missingTranslationIndexes` + `POST /contents/:id/translate-content` (แปลเฉพาะข้อความที่ยังไม่ได้แปล, คืน tree ให้ editor ทำเป็น undo ขั้นเดียว), ปุ่ม ✨ ใน LanguageBar, ตัวกรองภาษา + ป้ายภาษาต่อแถวในรายการหน้าเว็บ/บทความ                                                                                                                       |
| 20  | เทสต์ HTTP + S3 + BullMQ + i18n ฝั่งเว็บ + AI ต่อ                                                                         | ✅ เสร็จ | เทสต์ระดับ HTTP 17 เคส (เจอบั๊ก 304 แล้วแก้), S3/MinIO driver จริง + ตรวจขนาด/magic bytes ตอน confirm, BullMQ จริง (`QUEUE_DRIVER=bullmq`), i18n ฝั่งเว็บครบ (Accept-Language, เมนู/ฟอร์มต่อภาษา, ซับโดเมนภาษา), AI: cache บน Redis + alt-text เป็นชุด + `/ai/generate-site`                                                                        |
| 21  | i18n หน้าจอแอดมินที่เหลือ                                                                                                 | ✅ เสร็จ | ครบทุกหน้าจอ (editor, คลังรูป, ฟอร์ม, ดีไซน์, เติบโต, ตั้งค่า, wizard, login, AI) + `translateNow` สำหรับโค้ดนอก React                                                                                                                                                                                                                              |
| 22  | ข้อความจาก API, ชื่อบล็อก, Nest 11, AI สั่งงานทั้งเว็บ                                                                    | ✅ เสร็จ | `X-Locale` + แคตตาล็อกฝั่งเซิร์ฟเวอร์, `labelEn` ใน registry, Nest 11.2.7, `/ai/site-command` เสนอ design-token diff พร้อม inverse patch                                                                                                                                                                                                            |
| 23  | AI แนะนำ meta จากหน้า เติบโต › SEO                                                                                        | ✅ เสร็จ | การ์ดผู้ช่วยในหน้ารายงาน SEO (รายหน้าที่ยังขาดชื่อเรื่อง/คำอธิบาย) + diff ก่อนบันทึก + เลิกทำได้, `PATCH /contents/:id/seo` รวมค่าเดิมแทนการทับ, ซ่อมหน้าเว็บที่เผยแพร่แล้วทันที                                                                                                                                                                    |
| 24  | สีแบรนด์จากโลโก้ใน wizard ขั้น 4                                                                                          | ✅ เสร็จ | `POST /media/:id/palette` อ่านสีจากโลโก้จริงด้วย sharp + `extractBrandPalette()` (เลือกสีหลัก/สีตัดกัน ผ่าน WCAG) · ปุ่ม "ใช้สีจากโลโก้" ในขั้น 4 พร้อมปุ่มใช้สีเดิม · โหมดเดโมให้พาเลทที่แน่นอน                                                                                                                                                    |
| 25  | เก็บงานค้างคลังรูป: ลบถังขยะอัตโนมัติ + AVIF ผ่าน picture                                                                 | ✅ เสร็จ | media.archived_at + migration, purgeExpiredTrash() ลบไฟล์/แถวตาม 30 วัน + MediaPurgeProcessor ใน worker, avifSrcSet ใน MediaItem/image value แล้ว Img เรนเดอร์ picture + source image/avif พร้อม WebP fallback                                                                                                                                      |
| 26  | จุดโฟกัสรูป (ตั้ง + ใช้ตัดภาพจริง)                                                                                        | ✅ เสร็จ | สไลเดอร์ + พรีวิวในคลังรูปบันทึกด้วย PATCH /media/:id พร้อม undo, focalPoint ส่งต่อผ่าน picker → block → Img ใช้ object-position กับ aspect ที่ block กำหนด                                                                                                                                                                                         |
| 27  | สร้างเว็บหลายภาษาเป็น background job                                                                                      | ✅ เสร็จ | site.locales + locales input, SiteLocaleService/Processor (memory/BullMQ) สร้างหน้าและแปลด้วย AI พร้อม fallback เป็น copy, GET /sites/:id/locales ให้ wizard poll สถานะ, ปุ่มเลือกภาษาในขั้น 5                                                                                                                                                      |
| 28  | แชท AI สั่งแก้เนื้อหาบล็อกที่เลือก                                                                                        | ✅ เสร็จ | POST /ai/block-command + aiBlockCommandInputSchema/AiChange.path, parser ออฟไลน์ (สั้นลง/ทางการ/กันเอง/เปลี่ยนเป็น), provider OpenAI ตรวจ path ก่อนคืน diff, ปุ่ม “แก้ข้อความที่เลือก” ในแผง AI นำไปใช้เป็น undo ขั้นเดียว                                                                                                                          |
| 29  | รับชำระเงินจริงผ่าน Stripe (บัตร + พร้อมเพย์)                                                                             | ✅ เสร็จ | POST /billing/checkout + /billing/webhook (HMAC จาก raw body), invoices.provider/provider_ref/method, async promptpay + void เมื่อหมดอายุ, PATCH /billing/plan ใช้ได้เฉพาะแพ็กเกจฟรี, โมดัลเลือกวิธีจ่ายในแอดมิน                                                                                                                                    |
| 30  | ต่ออายุอัตโนมัติ + ใบเสร็จรอบใหม่ (Stripe)                                                                                | ✅ เสร็จ | sites.stripe_*_id, บัตร = subscription รายเดือน (พร้อมเพย์ = ครั้งเดียว), webhook invoice.paid/payment_failed/subscription.updated/deleted, POST /billing/cancel, แอดมินแสดงรอบต่ออายุ + ยกเลิกได้                                                                                                                                                  |
| 31  | บังคับใช้โควตาตามแพ็กเกจ (หน้า/พื้นที่/ทีม)                                                                               | ✅ เสร็จ | QuotaService ตรวจใต้ forSite ตอนสร้างหน้า/กู้คืน/สร้างคำแปล, presign รูป, เชิญทีม; ข้อความธุรกิจไทย-อังกฤษจาก shared, ไม่จำกัดเมื่อแผน null, เกินอยู่แล้วยังใช้งานได้                                                                                                                                                                               |
| 32  | เปลี่ยนแพ็กเกจไม่ให้ต่ออายุซ้ำ                                                                                            | ✅ เสร็จ | ยกเลิก subscription เดิมทันทีหลังจ่ายรอบใหม่สำเร็จ (DELETE + 404 = จบ), void ใบแจ้งหนี้ที่ค้างจาก checkout ที่ถูกทิ้ง, audit ทั้งสำเร็จ/ล้มเหลว, แอดมินแจ้งว่าไม่คืนส่วนที่เหลือของรอบ                                                                                                                                                              |
| 33  | ล้างแคช CDN หลังเผยแพร่                                                                                                   | ✅ เสร็จ | CdnPurgeNotifier POST {host, paths} พร้อม HMAC ของ body ไป CDN_PURGE_URL, purge ล้มไม่ทำให้ publish ล้ม, renderer ปฏิเสธก็ไม่ purge, ไม่ตั้งค่า = no-op                                                                                                                                                                                             |
| 34  | ยืนยันตัวตนสองขั้น (TOTP)                                                                                                 | ✅ เสร็จ | users.totp_enabled_at/recovery_codes + migration, RFC 6238 เอง (SHA-1, 6 หลัก/30 วิ, ±1 step), login เป็น challenge 5 นาที + /auth/2fa/verify, setup/enable/disable + recovery codes ใช้ครั้งเดียว (hash), หน้าจอ login ขั้นที่สอง + การ์ดในตั้งค่า                                                                                                 |
| 35  | เก็บงานค้าง: proration, App manifest ภายนอก, pageview จาก edge, ClamAV, import ไฟล์สื่อ                                   | ✅ เสร็จ | เครดิตส่วนที่เหลือของรอบเดิมหักจากยอดเปลี่ยนแพ็กเกจ (invoices.credit), รับ manifest จากนักพัฒนาพร้อมป้องกัน SSRF และ kill switch ระดับแพลตฟอร์ม, รับ pageview แบบชุดจาก edge ด้วยโทเคน, สแกนไวรัสผ่าน clamd และนำเข้าไฟล์สื่อกลับจาก backup                                                                                                         |
| 36  | เก็บงานค้าง: เพดานพิกเซล, on-demand TLS, import โดเมน/สมาชิก                                                              | ✅ เสร็จ | `MEDIA_MAX_INPUT_PIXELS` ใช้กับ sharp ทุกจุด, `GET /public/tls/ask` + Caddy on-demand TLS, backup กู้โดเมน/สมาชิก (เฉพาะบัญชีที่มีอยู่) และ merge global blocks ตาม kind                                                                                                                                                                            |
| 37  | E-commerce (สินค้า, ตะกร้า, พร้อมเพย์, คำสั่งซื้อ)                                                                        | ✅ เสร็จ | ตาราง products/orders/order_items + RLS, API ร้านค้าและหน้าจอแอดมิน (สินค้า/คำสั่งซื้อ/ตั้งค่ารับเงิน), หน้าร้าน + ตะกร้า + checkout + ใบยืนยันทาง `/shop`, `/cart`, `/checkout`, `/order/:token` (ไม่ใช้ JS ฝั่งเว็บ)                                                                                                                              |
| 38  | Template ต่อจาก 3 เป็น 5 แบบ                                                                                              | ✅ เสร็จ | เพิ่มเทมเพลต “สานศิลป์” (ร้านค้า) และ “เมฆขาว” (บล็อก) พร้อมหน้าไทยจริง 5 หน้า, เมนู, tokens และภาพตัวอย่าง; ยังไม่แตะเนื้อหาผู้ใช้                                                                                                                                                                                                                 |
| 39  | ปิดงานค้างร้านค้า: อีเมล, backup, บัตร Stripe                                                                             | ✅ เสร็จ | แจ้งออเดอร์ใหม่/เปลี่ยนสถานะทางอีเมล (Resend, ไม่มีคีย์ = log), backup/restore สินค้า+คำสั่งซื้อ, รับบัตรผ่าน Stripe Checkout + webhook ปิดออเดอร์, ตั้งค่าเปิด/ปิดบัตรในแอดมิน                                                                                                                                                                     |
| 40  | ปิดงานค้างร้านค้า/สื่อ/ตัวอย่าง: สลิป, ตัวเลือกสินค้า, ค่าส่ง, วิธีจ่าย, ใบเสร็จ, webhook, bulk media, preview/robots/ISR | ✅ เสร็จ | สลิปพร้อมเพย์ + ตรวจอัตโนมัติ/อนุมัติ, ตัวเลือกไซซ์-สี, ค่าส่งแบบ fix/ตามน้ำหนัก/ตามพื้นที่, เปิด-ปิดวิธีจ่าย, ใบเสร็จ HTML+PDF, webhook ที่ลงชื่อ HMAC, แก้ alt หลายรูป/ย้ายโฟลเดอร์, หน้า preview draft, robots ตัด path ส่วนตัว, cache ต่อ host                                                                                                  |
| 41  | จัดการเปลี่ยนเส้นทาง (Redirect manager)                                                                                   | ✅ เสร็จ | ตาราง `redirects` เดิมถูกใช้ครั้งแรก: API `GET/POST/PATCH/DELETE /redirects` (301/302, กัน loop/ที่อยู่หน้าหลัก, audit, RLS ต่อเว็บ) + แท็บ “เปลี่ยนเส้นทาง” ในหน้าตั้งค่า (เพิ่ม/แก้/ลบพร้อมเลิกทำ) · renderer ตามกฎเดิมเมื่อไม่พบหน้านั้น                                                                                                         |
| 42  | ครอปรูปในคลังสื่อ                                                                                                         | ✅ เสร็จ | `media.crop` + PATCH /media/:id รับกรอบครอป, worker ตัดทุกระยะจากกรอบเดิม (คีย์เดิมจึงไม่ทำให้หน้าที่ยังใช้ srcset เก่าพัง), UI ครอปพร้อมพรีวิว/สไลเดอร์, กัน GIF และรูปที่ยังเรนเดอร์ไม่เสร็จ                                                                                                                                                      |
| 43  | ปิด MVP: อีเมลจริง, สำรองอัตโนมัติ, OG image, 404 monitor, static publish                                                 | ✅ เสร็จ | ตั้งค่าอีเมลของเว็บเอง (SMTP/Resend, เข้ารหัส, ทดสอบส่งจริง) + ฟอร์มส่งอีเมลจริง, สำรองข้อมูลรายวันพร้อมเก็บย้อนหลัง, OG image เจนอัตโนมัติ, เก็บ 404 30 วัน + การ์ดในหน้า SEO, ส่ง HTML ขึ้น static host พร้อม HMAC และ Lighthouse CI                                                                                                              |
| 44  | ปิด MVP ส่วนที่เหลือ: CDN ที่ลูกค้าตั้งเอง, โดเมน/SSL อัตโนมัติ, Lighthouse บังคับ                                        | ✅ เสร็จ | ตั้งค่า › การเผยแพร่ (renderer/static host/CDN + คีย์เข้ารหัส) ต่อเว็บ ไม่ต้องพึ่ง .env, กุญแจระบบสร้างเอง, เขียน static แบบขนานภายใน 10 วินาที + บันทึกเวลาล่าสุด, worker ตรวจ DNS เปิด SSL ให้เองทุก 5 นาที, LHCI บังคับ ≥ 0.9                                                                                                                    |
| 45  | เทมเพลต 5 → 10 แบบ                                                                                                        | ✅ เสร็จ | เพิ่ม “ครัวริมน้ำ”, “คลินิกใจดี”, “ภาพบ้านทุ่ง”, “ดอกไม้บ้านสวน”, “เสียงเมือง” พร้อม tokens/เมนู/หน้าไทยจริง/preview ครบทั้ง 10 แพ็ก                                                                                                                                                                                                                |
| 46  | Feature flags (สวิตช์ส่วนเสริม)                                                                                           | ✅ เสร็จ | `sites.settings.flags` + kill switch ระดับแพลตฟอร์ม, API `GET/PATCH /features`, หน้าตั้งค่า › ส่วนเสริม, ซ่อนเมนู/กัน route ของ AI/สถิติ/ข่าวสาร/Apps/ร้านค้า                                                                                                                                                                                       |
| 47  | คืนเงินคำสั่งซื้อ + ใบเสร็จในอีเมล                                                                                        | ✅ เสร็จ | สถานะ `refunded` + `POST /orders/:id/refund` (คืนผ่าน Stripe เมื่อมี payment intent, คืนสต็อก, audit, webhook `order.refunded`), แนบ PDF ใบเสร็จในอีเมลเมื่อชำระเงินสำเร็จ + แสดงยอดคืนบนหน้าคำสั่งซื้อ                                                                                                                                             |
| 48  | E2E (Playwright) + CI                                                                                                     | ✅ เสร็จ | 3 เส้นทางหลักบนแอดมินโหมดเดโม (เข้าสู่ระบบ, ปิดส่วนเสริม, คืนเงิน), `pnpm test:e2e`, job `e2e` ใน CI พร้อมเก็บ trace เมื่อล้ม                                                                                                                                                                                                                       |
| 49  | Community edition + ไลเซนส์/ลายเซ็น                                                                                       | ✅ เสร็จ | AGPL-3.0 + ไฟล์รีโปสาธารณะ, ไลเซนส์ Ed25519 ตรวจออฟไลน์ (`GET /v1/license`, `POST /v1/public/license/verify`), ฟีเจอร์ที่ต้องมีไลเซนส์, `verifyLumioSignature` ใน SDK และ `git init`                                                                                                                                                                |
| 50  | เอกสารปฏิบัติการจริง + กุญแจผู้ขาย                                                                                        | ✅ เสร็จ | `docs/OPERATIONS.md` (checklist production), `TRADEMARK.md`, 24.6.1 การเก็บ/สำรอง/หมุนกุญแจ + fingerprint                                                                                                                                                                                                                                           |
| 51  | ถอดโดเมนของบุคคลอื่นออกจากค่าเริ่มต้น                                                                                     | ✅ เสร็จ | เปลี่ยน `lumio.app` → `example.com` ทั้ง repo (code/seed/docs/tests), เตือน production ให้ตั้ง `PUBLIC_ROOT_DOMAIN`/`EMAIL_FROM` เอง                                                                                                                                                                                                                |
| 52  | รีดีไซน์ UX/UI หลังบ้าน + ใช้ไอคอนแทน emoji                                                                               | ✅ เสร็จ | ปรับ shell/หน้าเนื้อหา/editor/ดีไซน์/ตั้งค่าให้ใช้ design tokens และไอคอนร่วมกัน, เพิ่มสถานะว่าง/คำอธิบาย และทดสอบ a11y                                                                                                                                                                                                                             |
| 53  | เทมเพลตครบ 20 แบบ + เทมเพลตแรงบันดาลใจจาก B-Lighting                                                                      | ✅ เสร็จ | เพิ่มเทมเพลตเป็น 20 แพ็กพร้อม tokens/เมนู/หน้าไทยจริง/preview และโหมดเดโมของ wizard 13 แพ็ก                                                                                                                                                                                                                                                         |
| 54  | Docker ทั้งระบบ (profiles, migrate, volumes, healthchecks)                                                                | ✅ เสร็จ | แยก profile infra/app, migrate service, volume ที่ต้องสำรอง, healthcheck/restart, Node 22.13, `API_INTERNAL_URL` ของ renderer และ Caddy dev/prod                                                                                                                                                                                                    |
| 55  | UX/UI polish รอบสอง + ลิงก์ตัวอย่างใน Docker                                                                              | ✅ เสร็จ | หน้าจอร้านค้า/แอป/เมนู/สื่อ/ตั้งค่าเป็น section ที่อ่านง่าย, แอปแยก “ติดตั้งแล้ว/พร้อมติดตั้ง”, ฟอร์มและตารางกระชับขึ้น, ปุ่มดูตัวอย่างใช้ `RENDERER_PUBLIC_URL`, `ADMIN_ORIGIN` รับหลาย origin, เทสต์กันความล้มเหลวจาก timeout                                                                                                                     |
| 56  | ต่ออายุเซสชันอัตโนมัติ + กลับหน้าเข้าสู่ระบบเมื่อหมดอายุจริง                                                              | ✅ เสร็จ | admin เรียก `/auth/refresh` ครั้งเดียวแบบ single-flight เมื่อเจอ 401 แล้วยิงคำขอเดิมซ้ำ, ถ้า refresh ไม่ผ่านหรือยังถูกปฏิเสธจะล้างเซสชันและพากลับหน้า login พร้อมบอกเหตุผล; ไม่แตะ 401 ของการเข้าสู่ระบบหรือลิงก์อัปโหลด                                                                                                                            |
| 57  | ปรับหน้าสำรองข้อมูล/แพ็กเกจ + เอา “กลับไปภาพรวม” ออก                                                                      | ✅ เสร็จ | หน้าสำรองข้อมูลแยกเป็นการ์ดดาวน์โหลด/นำเข้าที่อ่านง่ายและซ่อน file input แบบ native, หน้าแพ็กเกจไฮไลต์แพ็กเกจที่ใช้อยู่และแสดงฟีเจอร์ด้วยไอคอน, และเอาแถบ “กลับไปภาพรวม” ในคลังสื่อออก                                                                                                                                                              |
| 58  | แก้เมนู “เพิ่มส่วนใหม่” ใน editor ให้ปิดได้จริง + toolbar บนมือถือ                                                        | ✅ เสร็จ | ป๊อปอัปเกาะตำแหน่งปุ่มที่กด (ไม่กระโดดไปล่างหน้า), มีฉากหลังกดปิด, ปุ่มปิด, Esc ปิดได้ทุกที่, คืนโฟกัสกลับปุ่มเดิม, ไอคอนบล็อกตรงชนิด, เปลี่ยนไอคอนลาก/ทำซ้ำ และให้ toolbar ขึ้นบรรทัดใหม่บนมือถือ                                                                                                                                                  |
| 59  | หน้าเข้าสู่ระบบของผู้ซื้อบนเว็บสาธารณะ (`/signin`)                                                                        | ✅ เสร็จ | เปิดคำสั่งซื้อด้วยเลขคำสั่งซื้อ + เบอร์โทร/อีเมลที่ใช้สั่ง (`POST /public/:host/shop/orders/lookup`, rate limit 10/นาที, ตอบ 404 เดียวกันทั้งเลขผิดและข้อมูลติดต่อผิด), จำรายการที่เปิดไว้บนเครื่องด้วยคุกกี้ httpOnly, ออกจากระบบได้, ไม่มี JS ฝั่งเว็บ, `noindex` + robots disallow                                                               |
| 60  | Membership / Paywall (ก้อนถัดไป A)                                                                                        | ✅ เสร็จ | บัญชีผู้อ่านแยกจากทีมงาน (สมัคร/เข้าสู่ระบบ/ลืมรหัสผ่าน/ยืนยันอีเมล), แพ็กเกจต่อเว็บ (รายเดือน/รายปี), หน้าบทความ-หน้าเว็บตั้ง `access: members` ได้จากแผงข้าง editor, หน้าถูกล็อกแสดงตัวอย่าง + ฟอร์มเข้าร่วม, Stripe Subscription + webhook, หน้าจอ เติบโต › สมาชิก (แพ็กเกจ/รายชื่อ/รายได้/หยุดต่ออายุ) — เปิดเฉพาะเมื่อไลเซนส์ระบุ `membership` |
| 61  | Block Marketplace (ก้อนถัดไป B)                                                                                           | ✅ เสร็จ | ชุดส่วนสำเร็จรูปที่ลงลายเซ็น Ed25519 (`lumio_pack_v1.…`), แพ็กทางการ 4 ชุด, ติดตั้ง/อัปเดต/เปิดปิด/ถอนต่อเว็บ + audit, ส่วนของแพ็กโผล่ในเมนู `/` ของ editor, หน้าจอ เติบโต › ตลาดบล็อก, kill switch + ไลเซนส์ `marketplace`, ถอนแล้วหน้าไม่พังเพราะอ้างได้เฉพาะบล็อกที่บิลด์มี                                                                      |
| 62  | Integration test ที่ยิง Stripe จริง (test account)                                                                        | ✅ เสร็จ | 7 เคสยิง Stripe จริง (Checkout payment/subscription, คูปอง, ร้านค้า, สมาชิก, charge+refund) ด้วย `sk_test_` จาก env/.env ที่ไม่ถูก commit, ปฏิเสธ live key, ข้ามเมื่อไม่มีคีย์ — ระหว่างทางพบและแก้บั๊กบัญชี Stripe ใหม่ไม่รับ `payment_method_types` และปิดช่องสมาชิก aktif ก่อนเงินเข้า (unpaid/async)                                            |
| 63  | ป้ายเวอร์ชัน + ตรวจรุ่นใหม่ + อัปเดตตัวเองบน host                                                                         | ✅ เสร็จ | แอดมินแสดงเวอร์ชันที่ footer ทุกหน้าและเตือนเมื่อมีรุ่นใหม่ (`GET /v1/updates`, cache 6 ชม., ตรวจใหม่ 10/นาที), `scripts/update.mjs` (`--check`/`--auto`) ทำ checkout tag → rebuild compose → รอ health → ย้อนกลับอัตโนมัติถ้าไม่ขึ้น, systemd timer 6 ชม., ปฏิเสธเมื่อ working tree ไม่สะอาด, ปล่อยเป็น 0.24.0                                     |
| 64  | ตรวจหาอัปเดตจาก release feed แบบ private                                                                                  | ✅ เสร็จ | repo เป็น private ทำให้ GitHub ตอบ 404 ให้คำขอไม่ระบุตัวตน → API และสคริปต์อ่าน `LUMIO_UPDATE_TOKEN`/`GITHUB_TOKEN` แบบ read-only ส่งเป็น Bearer เฉพาะเมื่อมีค่า, token อยู่ฝั่งเซิร์ฟเวอร์ไม่ส่งไปเบราว์เซอร์, ปล่อยเป็น 0.24.1                                                                                                                    |
| 65  | ระบบจองคิว (งานนอก MVP)                                                                                                   | ✅ เสร็จ | ตาราง `booking_services`/`bookings` + RLS, ตั้งค่าเวลาทำการ/รอบจองต่อเว็บ, หน้าจอ เติบโต › การจองคิว (บริการ/ตาราง/รายการนัด + ยืนยัน/เสร็จสิ้น/ยกเลิก + audit), หน้า `/booking` สาธารณะที่ไม่ใช้ JS พร้อมลิงก์ยืนยัน/ยกเลิกด้วยโทเคน และอีเมลแจ้งเจ้าของเว็บ, feature flag `booking` ฟรี                                                           |
| 66  | Agency / White-label (งานนอก MVP)                                                                                         | ✅ เสร็จ | ตารางระดับแพลตฟอร์ม `agency_branding` (ไม่มี site_id/RLS), `GET/PATCH /v1/agency`, หน้าตั้งค่า › แบรนด์องค์กร (ชื่อ/โลโก้/อีเมลช่วยเหลือ/สีเน้น/ซ่อนเครดิต), ต้องมีไลเซนส์ `whitelabel` จึงบันทึกได้                                                                                                                                                |
| 67  | Public API keys (งานนอก MVP)                                                                                              | ✅ เสร็จ | ตาราง `api_keys` + RLS, กุญแจ `lum_<site>.<secret>` เก็บเฉพาะ SHA-256 แสดงจริงครั้งเดียว, `GET/POST /v1/api-keys` + `DELETE` (audit), `GET /v1/public-api/pages                                                                                                                                                                                     | posts`ด้วย`X-Api-Key` (เฉพาะที่เผยแพร่และไม่ใช่ members), หน้าตั้งค่า › กุญแจ API, rate limit 240/นาที |

| สัญลักษณ์: ✅ เสร็จ · 🔄 กำลังทำ · ⏳ ยังไม่เริ่ม · ⚠️ ติดปัญหา |

## งานที่ทำเสร็จ (ก้อนที่ 1)

- Root workspace: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, ESLint (flat), Prettier
- `packages/shared`: Zod schema (blocks/content/site) + RBAC matrix
- `packages/tokens`: design tokens + `theme.css`
- `packages/ui`: Button, Input, Card (+ `styles.css`)
- `packages/blocks`: BlockRegistry + heading, paragraph
- `packages/sdk`: manifest, permission scopes, bridge contract
- `apps/api`: NestJS bootstrap + `/api/health` + worker entry
- `apps/admin`: Vite + React shell
- `apps/renderer`: Next.js App Router + SEO helper
- Infra: `docker-compose.yml`, Caddyfile, Dockerfiles, GitHub Actions CI

## งานที่ทำเสร็จ (ก้อนที่ 2)

- `apps/api/prisma/schema.prisma`: 18 ตารางตามหัวข้อ 11 (users, sites, site_members, domains, media,
  contents, content_versions, taxonomies, content_taxonomies, menus, global_blocks, forms,
  form_submissions, subscribers, redirects, site_apps, pageviews, audit_logs)
- Migration `20261020000000_init`: CHECK constraints, index ตามหัวข้อ 11.6,
  `pageviews` แบบ PARTITION BY RANGE (ts) + BRIN index, RLS ทุกตารางที่มี `site_id`
- RLS: policy `site_isolation` ใช้ `app.current_site`; เปิด `FORCE ROW LEVEL SECURITY` กับตารางเนื้อหา
  (site_members/domains ไม่ FORCE เพราะต้อง resolve ก่อนรู้ site, users/sites เป็นระดับแพลตฟอร์ม)
- `PrismaService.forSite(siteId, fn)` + `runForSite()` ตั้ง `app.current_site` แบบ transaction-local
- Seed ข้อมูลตัวอย่างไทย 2 เว็บ (กาแฟบ้านดอย, คลินิกทันตกรรมยิ้มสวย) ครบทุกตาราง
- Test `site-isolation.spec.ts`: ผู้ใช้ site A อ่าน/เขียนข้อมูล site B ไม่ได้ (ข้ามเมื่อไม่มี DATABASE_URL)
- CI: เพิ่ม service Postgres + `prisma migrate deploy` + `prisma db seed` ก่อนรัน test

## งานที่ทำเสร็จ (ก้อนที่ 3)

- `packages/tokens`: เพิ่ม brand ramp 200-900, สี soft ของสถานะ, overlay/focus-ring,
  z-index scale, layout token (sidebar/ความสูง control) และ typography แยก size/line-height
- `theme.css` สร้างจาก `buildThemeCss()` ที่เดียว + test กันไฟล์หลุดซิงก์
- `packages/ui`: 27 component ครบกลุ่ม Actions / Forms / Feedback / Overlay / Navigation / Data
  (TextField, Select, Switch, Slider, ColorPicker, ImagePicker, LinkPicker, Toast + Provider,
  Banner, Skeleton, Progress, EmptyState, Modal, Drawer, Popover, Tooltip, Tabs, Breadcrumb,
  Pagination, Sidebar, DataTable, StatCard, IconButton, SplitButton)
- ทุก component ใช้ token เท่านั้น ไม่มีสี/ขนาด hard-code และรองรับครบ 4 สถานะ
  (loading / empty / error / success)
- Storybook 10 (react-vite) + addon a11y + themes สลับ light/dark พร้อม story ครบทุก component
- Test 55 เคส (SSR markup + a11y attributes) และ CI build Storybook

## งานที่ทำเสร็จ (ก้อนที่ 4)

- `packages/shared`: Zod schema สำหรับ auth (register/login/email/password/session) และส่วนเพิ่มของ
  site (updateSite, updateMember, pagination) — API ใช้ schema ชุดเดียวกัน ไม่นิยามซ้ำ
- `apps/api/src/common`: response envelope มาตรฐาน `{ data, meta }` + exception filter ที่แปลง
  `ApiException` / `ZodError` เป็น `{ error, message, details }` (ข้อความไทย) + rate limit guard
  แบบ in-memory (10/นาที/IP สำหรับ login/register)
- Auth module: Argon2id (`@node-rs/argon2`) สำหรับ password, access token 15 นาที +
  refresh token 24 ชั่วโมง (`@nestjs/jwt`, secret จาก `JWT_*` env), refresh เก็บใน httpOnly cookie
  (`/api/v1/auth`), endpoint `POST /auth/register|login|refresh|logout`, `GET /auth/me`
- Guard 3 ชั้นตามหัวข้อ 13.4: `AuthGuard` (Bearer) → `SiteGuard` (หา site จาก `:id`/`X-Site-Id`
  แล้วเช็ค membership ใต้ RLS) → `RolesGuard` (`@Roles(...)`)
- Sites module: `GET /sites` (เว็บที่ผู้ใช้เป็นสมาชิก), `POST /sites` (สร้างเว็บ + เป็น owner +
  audit), `GET/PATCH /sites/:id`, `POST /sites/:id/publish-all`
- Members module: `GET/POST /members`, `PATCH/DELETE /members/:userId` — ห้ามกำหนด/ลบ owner,
  ต้องมี role owner/admin และเขียน audit log ทุกครั้ง
- `AuditService` + migration `20261021000000_site_members_user_policy`: policy `user_isolation`
  บน `site_members` ให้ผู้ใช้เห็น membership ของตัวเองก่อนรู้ site (ต้องมีให้ `GET /sites` ทำงาน)
  พร้อม helper `runForUser()` / `PrismaService.forUser()`
- Seed: บัญชีตัวอย่างมีรหัสผ่าน (demo: `lumio-demo-1234`) จึง login ได้ทันที
- Test 60 เคส: password/token, auth service, guard ทั้ง 3 (403, ข้ามเว็บ, validation), sites/members
  service, exception filter, smoke test ที่ยืนยันว่า Nest resolve DI ได้ครบ และ test กับ DB จริง
  (login, list sites, ข้ามเว็บ, policy `user_isolation`)

## งานที่ทำเสร็จ (ก้อนที่ 5)

- `packages/shared`: เพิ่ม `BlockData<Props>` (`version` + `props` + `style`), `defaultBlockStyle`
  และ `BlockEditorMode` — ทุก block ใช้สัญญาเดียวกันทั้งตอน validate และตอนเก็บ
- Block engine (`packages/blocks/src/engine`): `BlockShell` (spacing/พื้นหลัง/visibility/อนิเมชัน
  จาก style ผ่าน data attribute), `Editable` (ทำเครื่องหมาย path ให้ editor), `Img`
  (บังคับ alt, lazy/priority, srcset+sizes, placeholder ตอนยังไม่มีรูป), `BlockRenderer`
  - `BlockTreeRenderer` (validate props ด้วย schema ของ block ถ้าไม่ผ่านใช้ค่า default),
    `getPath`/`setPath` (แก้ `props.…` / `style.…` แบบ immutable), `migrateBlock`/`upgradeBlockTree`,
    `registerLoader`/`loadBlockData` (block ที่ดึงข้อมูลต้องประกาศ loader, กรอง siteId เสมอ)
- `attachInlineEditing(root, { onChange, paths })` — ฝั่ง editor ค่อยเปิด contentEditable
  ให้ `[data-editable-path]`; หน้า public จึงเป็น static HTML ที่ไม่มี JS ของ block เลย
- 6 block แรก มีครบ 5 ไฟล์ (`schema.ts`, `Block.tsx`, `Panel.tsx`, `defaults.ts`, `index.ts`):
  heading, paragraph, image, button, hero, features — defaults เป็นข้อความไทยจริง,
  panel จัดกลุ่ม "เนื้อหา / หน้าตา / ขั้นสูง" (ขั้นสูงโผล่ใน mode Pro) และใช้
  `CommonStylePanel` + `PanelItemList` ร่วมกัน
- Block schema รวม `version: z.literal(1)` + `props` + `style` ตามหัวข้อ 7.4, panel ส่งค่าเป็น
  dot path ทำให้ editor ไม่ต้องรู้โครงสร้างของแต่ละ block
- `packages/blocks/src/styles.css` + export `@lumio/blocks/styles.css`: ทุกค่ามาจาก token,
  visibility เป็น media query, อนิเมชัน 250ms และเคารพ `prefers-reduced-motion`
- เพิ่ม token `--color-on-accent` (หมึกเข้มบนพื้น accent) ให้คอนทราสต์ผ่าน WCAG AA
- `@lumio/ui/cn` เป็น subpath export เพื่อให้โค้ดฝั่ง server ใช้ `cn` ได้โดยไม่ลาก UI kit
  (ที่ใช้ hook) เข้าไปในหน้า public
- Renderer: หน้าแรกตัวอย่างประกอบจาก `hero` + `features` ผ่าน `BlockTreeRenderer`,
  import `theme.css` + `ui/styles.css` + `blocks/styles.css` (Next prerender เป็น static)
- Test 54 เคสใน `@lumio/blocks` (registry, engine, ทุก block + panel) และ test renderer
  ที่ยืนยันว่าหน้าแรกมี `h1` เดียวและ render ผ่าน block engine

## งานที่ทำเสร็จ (ก้อนที่ 6)

- `packages/shared`: เพิ่มสัญญาของเนื้อหา — `contentListQuerySchema` (type/status/q + cursor),
  `saveContentBlocksInputSchema` (`blocks` + `baseRevision`), `ContentSummary`/`ContentDetail`/
  `ContentVersionSummary`, `isContentType`/`isContentStatus` และ `slugify` ที่คืนค่า fallback
  เมื่อชื่อเป็นภาษาไทยล้วน (editor ยังให้ผู้ใช้พิมพ์ "ชื่อลิงก์" เองได้)
- `packages/blocks` engine สำหรับ editor (pure ทั้งหมด มี test ครอบ):
  - `tree.ts` — `readBlockAt`/`writeBlockAt`/`insertBlockAt`/`removeBlockAt`/`moveBlock`/
    `duplicateBlockById`/`updateBlockById`/`setBlockVisibility`/`findBlockIndexPath`
    ทำงานกับ index path (`[1, 0]`) และไม่แก้ของเดิม (immutable)
  - `history.ts` — undo/redo แบบไม่จำกัด (ตั้ง `limit` ได้เพื่อคุมหน่วยความจำ)
  - `autosave.ts` — คิว debounce 2 วินาที, เก็บค่าใหม่สุดค่าเดียว, `flush()` รอจนเขียนจบ
    (ใช้ตอนกดเผยแพร่ จึงไม่มีทางเผยแพร่ร่างเก่า) และรายงาน error ให้ UI ตัดสินใจ
  - `drop.ts` — `resolveDropIndex()` หา "ช่อง" ที่จะวางจากตำแหน่งตัวชี้ (แสดงเส้น drop indicator)
  - `catalog.ts` — `createBlockNode()` สร้าง block จาก default ของแต่ละ block,
    `listBlockCatalog()`/`filterBlockCatalog()` ป้อน slash menu (ค้นได้ทั้งชื่อไทยและ type)
  - `device.ts` — ความกว้างพรีวิว มือถือ 390 / แท็บเล็ต 768 / เดสก์ท็อปเต็มความกว้าง
  - `media-picker.tsx` — `MediaPickerProvider`/`useMediaPicker()` ให้ block panel เปิดคลังรูปได้
    โดยไม่ import คลังจริง (หน้า public ไม่มี provider → ปุ่มถูก disable ไม่มีปุ่มตาย)
- `apps/api` Contents module (`/api/v1/contents`, ใช้ `X-Site-Id` เสมอเพราะ path เป็น `:contentId`):
  `GET /contents` (กรอง type/status/q + cursor), `POST /contents`, `GET/PATCH/DELETE /contents/:contentId`,
  `PUT /contents/:contentId/blocks` (autosave + optimistic lock → 409 "มีคนอื่นแก้หน้านี้ไปแล้ว"),
  `POST /contents/:contentId/publish` (คัดร่างขึ้นเว็บจริง + snapshot version + audit),
  `GET /contents/:contentId/versions`, `POST /contents/:contentId/restore/:versionId`
  - guard 3 ชั้น + `@Roles` แยกชุดอ่าน/เขียน/เผยแพร่, ทุก query อยู่ใน `forSite()` (RLS),
    ชื่อลิงก์ซ้ำตอบ 409 ภาษาคน, blocks/seo ที่เก็บเพี้ยนถูกอ่านแบบกันพัง (fallback เป็น `[]`/`{}`)
- `apps/admin` หน้า Editor (edit-on-page ตามหัวข้อ 4.2 + wireframe 6.7):
  - `editor/state.ts` — reducer ของ block tree + history (insert/remove/duplicate/move/
    set-block-path/toggle-visibility/undo/redo/saved/published/conflict/reset) ทดสอบแยกได้
  - `editor/useEditor.ts` — โหลดเนื้อหา, ต่อ autosave, คีย์ลัด Ctrl+Z / Ctrl+Shift+Z / Ctrl+S /
    Esc, เขียนทับเมื่อชนกัน (`overwriteConflict`) และ `publish()` ที่ flush autosave ก่อนเสมอ
  - `BlockCanvas` — เรนเดอร์หน้าจริงด้วย `BlockTreeRenderer` แล้วต่อ `attachInlineEditing()`
    ทีละ block (คลิกข้อความ = พิมพ์แก้, Esc = ย้อน), ปุ่ม ＋ ระหว่าง block ทุกจุด, handle ⋮⋮
    ลากสลับลำดับพร้อมเส้น drop indicator, เมนูย่อต่อ block (ทำซ้ำ/ซ่อนบนอุปกรณ์นี้/ลบ)
  - `SlashMenu` — กด `/` หรือปุ่ม ＋ แล้วค้นหา block ด้วยคีย์บอร์ด (↑↓ + Enter + Esc)
  - `BlockInspector` — แผงด้านข้างเรนเดอร์ `Panel` ของ block ที่เลือก (ไม่ต้องเขียนใหม่ต่อ block)
    - สวิตช์ "แสดงตัวเลือกขั้นสูง" (Simple/Pro ตามหัวข้อ 4.4) และกลายเป็น bottom sheet ที่จอ < 1024px
  - `EditorToolbar` — แถบเครื่องมือลอย: ◀ กลับ, ชื่อหน้า, สถานะ ● ร่าง/✓ เผยแพร่แล้ว,
    ปุ่มสลับ 📱/▭/💻, ↶/↷, โหมด แก้ไข/ดีไซน์, สถานะบันทึกอัตโนมัติ และปุ่ม **เผยแพร่** เพียงปุ่มเดียว
  - `MediaPickerBridge` — คลังรูปชั่วคราวที่รับ "ที่อยู่รูป" (contract เดียวกับคลังจริงในก้อนที่ 8)
  - ลบสำเร็จแสดง Toast "ลบแล้ว — เลิกทำ" (ไม่มี confirm dialog), autosave ไม่เด้ง toast,
    แบนเนอร์ "มีคนอื่นแก้หน้านี้อยู่ ต้องการเขียนทับไหม?" พร้อมปุ่มเขียนทับ/ใช้เวอร์ชันล่าสุด
  - `App` เปิด editor บนหน้าตัวอย่างด้วย `createDemoContentApi()` (in-memory, ล็อก revision
    เหมือนของจริง) จึงลองใช้ได้ทันทีโดยไม่ต้องต่อ API
- Test เพิ่ม 76 เคส: shared 9 (slug/schema), blocks 41 (tree 18, history 8, autosave 5, drop 5,
  catalog 9, media picker 3 — รวมของเดิมเป็น 102), api 18 (contents service),
  admin 30 (reducer 14, api client 7, media bridge 3, หน้าจอ 6)
- แก้บั๊กที่ test จับได้: `insert` แล้ว selection ไม่ถูกตั้งเพราะลำดับ spread ใน reducer

## งานที่ทำเสร็จ (ก้อนที่ 7)

- `packages/shared`: เพิ่มสัญญาของฝั่งสาธารณะ — `publicSiteSchema`, `publicContentSchema`
  (`blocks` = `blocks_published` เท่านั้น), `publicPageSchema` (รองรับ `redirect` และ `content: null`),
  `publicPostListSchema`, `publicSitemapSchema`, `menuItemSchema` (เมนูซ้อนได้) และ `publicPathFor`
  (หน้าแรก = `/`, post = `/posts/:slug`) ที่ทั้ง API และ renderer ใช้ร่วมกันจึงไม่หลุดกัน
  พร้อม `seo.ts` กลาง: `buildPageSeo`, `resolvePageSeo` (เติม title/description/canonical ให้เอง)
  และ `buildJsonLd` ที่เจน Organization/WebSite/Article/FAQPage/LocalBusiness จาก block + seo
- `packages/blocks`: แยก entry สำหรับ render — `@lumio/blocks/render` (`src/render.ts`,
  `builtins.render.ts`) มี block component + shell + engine ที่ pure แต่ **ไม่มี Panel**
  ทำให้หน้า public ไม่ลาก UI kit/panel เข้า bundle; `BlockDefinition.Panel` กลายเป็น optional
  (admin `BlockInspector` รองรับ block ที่ไม่มี panel)
- `apps/api` Public delivery module (`/api/v1/public/:host/...`, ไม่มี auth guard แต่มี rate limit):
  - `GET /pages/:slug`, `GET /posts`, `GET /posts/:slug`, `GET /sitemap` (รายการ URL ให้ renderer
    ทำ XML เอง — API ไม่ render HTML) โดยทุก response แนบข้อมูล `site` มาด้วย
  - `host.ts` resolve tenant จาก `domains` → subdomain ของ `PUBLIC_ROOT_DOMAIN`;
    host ที่ไม่รู้จักตอบ 404 (loopback ใช้ `PUBLIC_DEFAULT_SITE` ได้เฉพาะตอน dev)
  - ทุก query อยู่ใน `forSite()` (RLS) และอ่าน `blocks_published` เท่านั้น, `seo.noindex` ถูกกันออกจาก sitemap
  - `PublicCacheInterceptor`: `Cache-Control` + `ETag` (weak) และตอบ 304 เมื่อ `If-None-Match` ตรง
- `apps/api` Publish pipeline (`modules/publish`): `PublishQueue` (interface + `InMemoryPublishQueue`),
  `PublishService` (หา host หลักของเว็บ + สร้าง job พร้อม path ของหน้าและ `/sitemap.xml`),
  `RendererNotifier` (POST `/api/revalidate` พร้อม `x-lumio-revalidate-secret`),
  `PublishProcessor` (drain queue, นับสำเร็จ/ล้มเหลว) — `ContentsService.publish` และ `delete`
  (เฉพาะหน้าที่เคยเผยแพร่) กับ `SitesService.publishAll` enqueue job **หลัง transaction commit**
  เพื่อไม่ให้ renderer สร้างหน้าใหม่จากข้อมูลที่ rollback; `worker.ts` boot Nest app context แล้ว consume job
- `apps/renderer` (Next.js): อ่านจาก Public API ผ่าน `lib/api.ts` (validate ด้วย schema กลาง,
  แยก `ContentNotFoundError` / `ApiUnavailableError`), `lib/content.ts` เลือก API จาก `NEXT_PUBLIC_API_URL`
  และถอยไปใช้ demo site (`lib/demo.ts` สร้างจาก default ของ block จริง) เฉพาะตอน dev
  - หน้า `/` (slug `home`), `/[slug]`, `/posts`, `/posts/[slug]` + `sitemap.xml` + `robots.txt`
    จาก metadata route และ `POST /api/revalidate` (ตรวจ secret + รับเฉพาะ path ที่ขึ้นต้นด้วย `/`)
  - `PageView` (server component ล้วน): header/footer จากเมนู, block tree ผ่าน
    `@lumio/blocks/render`, JSON-LD, theme token ของเว็บ (`colorBrand` → `--color-primary`)
    และเติม `<h1>` จากชื่อหน้าเมื่อ block ไม่มี h1 (SEO score ต้องการ H1 เดียว)
  - redirect manager: 301 → `permanentRedirect`, อื่น ๆ → `redirect`
  - `next.config.mjs` ตั้ง `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
    ให้ CDN cache HTML ได้; publish job จะ revalidate data cache ของ path นั้นทันที
  - ผล build: หน้า public เพิ่ม JS เพียง 149 B/หน้า (shared runtime 87 kB) — ไม่มี JS ของ block/UI kit
- Test รวมทั้งโปรเจกต์: shared 24, blocks 106, ui 55, api 99 (+10 เคสที่ต้องมี DB), admin 30, renderer 43
  เคสใหม่ของก้อนนี้: public schema/path, render entry (ยืนยันว่าไม่มี Panel และไม่มี `<script>`),
  host resolution, public service (ข้ามเว็บ/redirect/noindex/cover image), cache interceptor
  (`Cache-Control`/ETag/304), publish queue + processor + notifier, SEO/JSON-LD,
  sitemap/robots, revalidate secret และการถอยไปใช้ demo เมื่อ API ล่ม

## งานที่ทำเสร็จ (ก้อนที่ 8)

- `packages/shared`: สัญญาของคลังสื่อ — `UPLOAD_MIME_TYPES` (JPEG/PNG/WebP/AVIF/GIF, **ไม่มี SVG**),
  `MEDIA_MAX_UPLOAD_BYTES` (15 MB), `MEDIA_STATUSES`, `mediaVariantSchema` (`{w,h,format,url,sizeBytes}`),
  `presignUploadInputSchema`/`presignUploadResultSchema`/`confirmUploadInputSchema`/`updateMediaInputSchema`/
  `mediaListQuerySchema` + `MediaItem`, และ helper ที่ใช้ร่วมทั้งโปรเจกต์: `mediaUrlFor`, `pickVariant`,
  `buildSrcSet` (เลือก format เดียวต่อความกว้าง จึงไม่พังกับเบราว์เซอร์ที่ยังไม่รองรับ AVIF) และ
  `resolveVariantUrl`
- `packages/blocks`: `PickedImage` เพิ่ม `mediaId`/`srcSet`/`width`/`height`, `imageValueSchema` เพิ่ม
  `srcSet`/`width`/`height` (optional จึงเข้ากับข้อมูลเก่าได้), `imageFromPick()` เก็บทั้งแลดเดอร์ และ
  block image/hero ส่ง `srcSet` ให้ `Img` จริงแล้ว
- `apps/api` Media module (`/api/v1/media`, ทุก route ใช้ `X-Site-Id` เพราะ path เป็น `:mediaId`)
  - `MediaStorage` (interface) + `LocalMediaStorage`: presign คืน URL ที่เซ็น HMAC (key + mime + ขนาด +
    เวลาหมดอายุ) → `PUT /v1/media/upload/:token` รับไฟล์แบบไม่ต้องมี session, ตรวจ **magic bytes**
    เทียบกับ mime ที่แจ้ง, จำกัดขนาดทั้งตอน stream และตอนเขียน, และกัน path ที่พยายามออกนอก root
  - `MediaService`: `POST /media/presign` (สร้างแถว `pending` + audit), `POST /media/:id/confirm`
    (ไฟล์ต้องมาถึงจริงก่อน), `GET /media` (q/โฟลเดอร์/cursor), `GET /media/folders`, `GET/PATCH/DELETE`
    (`delete` = soft delete → `trashed`), `POST /media/:id/restore` (undo), `purge()` สำหรับลบไฟล์จริง —
    ทุก query อยู่ใน `forSite()` (RLS) และเขียน audit log ทุกครั้ง
  - `MediaProcessor` + `SharpImagePipeline` (sharp): อ่านขนาดจาก metadata, สร้าง WebP + AVIF ทุกความกว้าง
    480/768/1024/1600/2048 ที่ไม่เกินต้นฉบับ + เก็บต้นฉบับไว้เป็น fallback, เขียนไฟล์ข้าง ๆ ต้นฉบับ,
    อัปเดต `variants`/`width`/`height`/`sizeBytes` เป็น `ready` (ล้มเหลว → `failed` ไม่ทำให้ queue ตาย)
    — GIF ปล่อยไว้ทั้งไฟล์เพื่อไม่ให้เสียภาพเคลื่อนไหว; `worker.ts` consume ทั้ง publish และ media job
  - `main.ts` เสิร์ฟไฟล์ของ driver local ที่ `/media/*` (prod ตั้ง `MEDIA_PUBLIC_BASE_URL` ชี้ CDN แทน)
- Migration `20261022000000_media_status`: เพิ่ม `media.status` (default `pending`) + CHECK ตามสถานะ +
  index `(site_id, status, created_at DESC)`; seed เดิมติด `status: 'ready'`
- `apps/admin` คลังรูปภาพจริงแทนที่ `MediaPickerBridge`:
  - `media/api.ts` — `createHttpMediaApi` (presign → PUT ตรงไป storage โดยไม่ส่ง token → confirm),
    `createDemoMediaApi` (ลองใช้ได้ทันที), `checkUploadCandidate` เตือนชนิด/ขนาดก่อนอัปโหลด 1 ไบต์
  - `media/useMediaLibrary.ts` — สถานะกลางของทุกหน้าจอ (โหลด, ค้นหา, โฟลเดอร์, อัปโหลด, ลบ+undo,
    แก้ alt) พร้อมข้อความ error ภาษาคน
  - `MediaLibraryBody` (ใช้ร่วมทั้ง dialog และหน้าเต็ม), `MediaLibraryProvider` (ป้อน picker ให้ panel
    ของ block ตามสัญญา `MediaPickerApi`), `MediaLibraryPage` (หน้าเต็มตาม IA 5.x) — markup/UX เป็นภาษาไทย
    และใช้ design tokens เท่านั้น, ลบ/แก้ไขสำเร็จเด้ง Toast "ลบแล้ว — เลิกทำ"
  - `App` ห่อ editor ด้วย `MediaLibraryProvider` (demo API) จึงเปิดคลังรูปจาก panel ได้ทันที
- Test ใหม่ 84 เคส (shared 15, api 41, admin 28 — รวมทั้งโปรเจกต์เป็น 467 จาก 383):
  token/sniff/path-escape, service (presign/confirm/soft delete/restore/purge/ข้ามเว็บ),
  sharp pipeline กับไฟล์จริง (ยืนยันว่าไบต์บนดิสก์เป็น WebP จริง), processor (สำเร็จ/ล้มเหลว/skip),
  `media.integration.spec.ts` กับ DB จริงผ่าน role ที่ไม่ใช่ owner (RLS + audit + แลดเดอร์ครบ),
  admin api client (presign→upload→confirm, ไม่รั่ว token ไป storage), คลังรูป markup

## งานที่ทำเสร็จ (ก้อนที่ 9)

- `templates/` — template pack 3 แบบตามหัวข้อ 8.2 (โครงตามสกิล `lumio-template-pack`):
  `baandoi-cafe` (ร้านอาหาร), `yimsuay-clinic` (คลินิก), `studio-freelance` (ฟรีแลนซ์)
  แต่ละ pack มี `manifest.json`, `tokens.json`, `global-blocks.json`, `menus.json`,
  `section-styles.json`, `pages/*.json` 4-5 หน้า (ข้อความไทยจริงตามประเภทธุรกิจ ไม่มี lorem)
  และ `preview.png` ที่สร้างจากสีของ pack เองด้วย `node templates/generate-previews.mjs`
  (เขียน PNG เองด้วย zlib ไม่ต้องพึ่งไลบรารีภาพ), `templates/index.json` เป็นสารบัญ pack
- `packages/shared` — สัญญาของธีมและเทมเพลต:
  - `theme.ts`: `ThemeTokens` แบบมีโครง (colors/fonts/radius/button/density/colorMode/animation)
    - `normalizeThemeTokens` ที่ยังอ่าน token แบบแบนเดิม (`colorBrand` ฯลฯ) ได้
    - `themeTokensPatchSchema`/`applyThemeTokensPatch`, `buildBrandRamp` (50-900 จากสีเดียว),
      `contrastRatio`/`readableInk`/`isAccessiblePrimary`/`ensureAccessiblePrimary`,
      `themeCssVariables` (semantic vars + `--density-scale` + motion) และ `themeDataAttributes`
      (`data-button-style`/`data-color-mode`/`data-density`/`data-animation`)
    - 6 สไตล์การ์ด (`THEME_STYLE_PRESETS`) และ 24 พาเลทสำเร็จรูป (`COLOR_PALETTES` พาเลทที่ผ่าน AA)
  - `template.ts`: schema ของ pack (manifest/tokens/global blocks/menus/section styles/pages),
    `TemplateSummary`, `DesignTokens`, `WizardSiteResult`, `menuLocationSchema`,
    `updateMenuInputSchema`, `withSectionStyles`
  - `section-template.ts`: `createSectionTemplateInputSchema` + `SectionTemplate`
  - `site.ts`: `siteSummarySchema`/`SiteSummary` ย้ายมาใช้ร่วมกันระหว่าง API กับ admin
  - `public.ts`: `publicGlobalBlocksSchema` (header/footer), `logoUrl`, `parseMenuItems`
    (เมนูที่เพี้ยนบางรายการถูกข้าม ไม่ล้มทั้งเมนู)
- `packages/blocks` — `insertBlocksAt` (แทรกหลายบล็อกพร้อมกัน) และ `cloneTreeWithNewIds`
  (แทรกเซกชันที่บันทึกไว้ซ้ำได้โดย id ไม่ชน), `BlockShell` คูณระยะห่างด้วย `--density-scale`
  และ `styles.css` เพิ่มสไตล์ปุ่มตาม token ของเว็บ (`[data-button-style]`)
- `packages/tokens` — `theme.css` เพิ่ม `[data-color-mode="auto"]` ตาม `prefers-color-scheme`
  เพื่อให้เว็บที่ตั้ง `colorMode: auto` เปลี่ยนโหมดสีตามผู้เข้าชม (สร้างจาก `buildThemeCss()` ที่เดียว)
- `apps/api`:
  - `TemplateStore`: อ่าน pack จาก `TEMPLATES_DIR` หรือหาเองจากโครง repo, validate ทุกไฟล์ด้วย Zod,
    ปฏิเสธ pack ที่หน้าตัวอย่าง < 4 หน้า/ไม่มีภาพตัวอย่าง และอธิบายไฟล์ที่ผิดเป็นภาษาคน
  - `GET /templates`, `GET /templates/:templateId` (สรุป pack ไม่มี path ภายในออกไป,
    `previewUrl` เป็น URL เต็มของ API) และ `main.ts` เสิร์ฟโฟลเดอร์ pack ที่ `/templates/*`
    (ภาพตัวอย่างเป็นไฟล์สาธารณะ ไม่มีข้อมูลลับ)
  - `DesignService`/`DesignController`: `GET /design/tokens`, `PATCH /design/tokens`,
    `POST /design/tokens/reset`, `POST /design/template/:templateId/apply`
    (`applyHeaderFooter` เลือกได้ว่าจะใช้ header/footer ของเทมเพลตใหม่ไหม) — **ไม่แตะ `contents.blocks_*`**
  - `MenusService`/`MenusController`: `GET/PUT /menus/:location` (เมนูซ้อนได้, เขียน audit)
  - `SectionTemplatesService`/`SectionTemplatesController`: `GET/POST /section-templates`,
    `DELETE /section-templates/:id` + migration `20261023000000_section_templates`
    (ตาราง `section_templates` มี `site_id` + RLS `FORCE` + index `(site_id, created_at DESC)`)
  - Wizard ขั้น 5 = `POST /sites` (schema `createSiteFromTemplateInputSchema`):
    `SiteWizardService` สร้าง site + สมาชิกเจ้าของ + global blocks (header/footer) + เมนู +
    หน้าตัวอย่าง 4-5 หน้า (ใช้ section styles ของ pack, snapshot version) ใน transaction เดียว
    แล้วค่อย enqueue publish หลัง commit (ปิดได้ด้วย `publishNow: false`)
  - `PublicService` ส่ง `globalBlocks` (header/footer) และ `logoUrl` (จาก `settings.logoMediaId`)
    ไปให้ renderer
  - Seed: เว็บตัวอย่าง 2 เว็บใช้ token แบบมีโครง + `template_id` + `businessType`/`styleId`
    (เว็บกาแฟมี `logoMediaId` ให้เห็นโลโก้จริงบนหน้าเว็บ)
- `apps/admin`:
  - `auth/`: `createHttpAuthApi` (เก็บ access token ระหว่างรอบ, refresh ผ่าน httpOnly cookie),
    `createDemoAuthApi`, `createSessionStore` (localStorage + fallback หน่วยความจำ, ทนข้อมูลเสีย)
    และหน้า `LoginPage` ภาษาไทย (ปุ่มหลักปุ่มเดียว, บอกเหตุผลที่เข้าไม่ได้, โชว์บัญชีทดลองในโหมด demo)
  - `wizard/`: `WizardPage` 5 ขั้น (ประเภทธุรกิจ → ชื่อ + ที่อยู่ + โลโก้ → สไตล์ 6 การ์ด →
    พาเลท 24 ชุด/เลือกสีเอง + ตัวตรวจคอนทราสต์ → สรุป + สร้างเว็บ พร้อมภาพตัวอย่างของเทมเพลต)
    เปิดต่อจากขั้นไหนก็ได้ด้วย `initialStepId`/`initialAnswers` มีแถบความคืบหน้า,
    `steps.ts` เก็บกติกาที่ทดสอบแยกได้ (ตรวจขั้น, preview token, สร้าง payload) และ
    `createHttpWizardApi`/`createDemoWizardApi`
  - `route.ts`: ตัดสินใจว่าเปิดหน้า login / wizard / editor และเลือกหน้าแรกของเว็บมาแก้
  - `clients.ts`: ประกอบ client ทั้งหมดจาก `VITE_API_URL` (ว่าง = โหมดทดลองทั้งชุด)
  - Editor: เมนูย่อของ block มี **บันทึกเป็นเทมเพลต** (เปิด modal ตั้งชื่อ) และเมนู `/`
    มีกลุ่ม "เทมเพลตของฉัน" ให้แทรกเซกชันที่บันทึกไว้ (`insert-tree` + clone id ใหม่),
    toolbar มีปุ่ม "ออกจากระบบ"
  - `main.tsx` โหลด `auth.css` + `wizard.css` และ CSS ทุกไฟล์ใช้ design tokens เท่านั้น
- `apps/renderer`: `siteTheme()` แปลง theme token เป็น CSS variables + data attributes
  (`data-theme="dark"` เมื่อเว็บเลือกโหมดมืด), header/footer เรนเดอร์ global blocks ของเทมเพลต
  และ show โลโก้ที่อัปโหลดแทนชื่อเว็บ, หน้า `/posts` ก็ใช้ธีมเดียวกับหน้าแรก
- Test ใหม่ 139 เคส (shared 25, blocks 3, api 26, admin 81, renderer 4 — รวมทั้งโปรเจกต์ 573):
  pack บนดิสก์จริง (ไทยจริง/4 หน้า/preview/สรุปไม่รั่ว path/ไฟล์เสีย), theme token + ramp + คอนทราสต์,
  wizard service (หน้าตัวอย่าง/global blocks/เมนู/publish job/subdomain ซ้ำ/transaction ล้ม),
  design service (สลับเทมเพลตไม่แตะ content/รีเซ็ต token), menus, section templates,
  public service (global blocks + logo), admin (session, auth client, wizard client + steps,
  route, sections client, reducer insert-tree, หน้า login/wizard/editor), renderer (ธีม, โลโก้, global blocks)

- แก้บั๊กที่เจอตอนตรวจ build: `@lumio/shared` ไม่มีเงื่อนไข `require` ใน `exports`
  ทำให้ API ที่ build แล้ว (`node apps/api/dist/main.js` ซึ่งเป็นคำสั่งใน Dockerfile) โหลดโมดูลไม่ได้เลย
  (`ERR_PACKAGE_PATH_NOT_EXPORTED`) — เพิ่ม `"require": "./dist/index.js"` แล้ว (Node ≥ 20.19/22.12
  รองรับ `require()` ของ ESM) ตรวจด้วยการโหลดทุกไฟล์ใน `apps/api/dist` (72 ไฟล์) และลองบูต
  `dist/main.js` จน Nest map route ครบทุกตัว (หยุดเพราะไม่มี DATABASE_URL ตามคาด)

## งานที่ทำเสร็จ (ก้อนที่ 10)

- รันเช็กลิสต์สกิล `lumio-security-review` ครอบทั้งเฟส 1 (auth, RBAC/RLS, editor, blocks,
  renderer/public API, media, wizard/templates) แล้วสรุปเป็น 3 กลุ่ม — บันทึกที่
  [`docs/design/23-security-review.md`](design/23-security-review.md)
- แก้ **blocker ข้อ 1 (stored XSS ผ่าน `href`)**:
  - `packages/shared/src/links.ts` — `isSafeLink()` (ตัด control char/ช่องว่างก่อนเทียบ scheme
    แล้วปฏิเสธ `javascript:` `data:` `vbscript:` `file:`) + `safeLinkSchema`
  - นำไปใช้กับปุ่มทุกชนิด (`button/schema.ts`, `common.ts` ที่ hero/features ใช้) และ
    `menuItemSchema.href` — `BlockRenderer` ถอยไปใช้ค่า default ของ block เมื่อ props ไม่ผ่าน
  - เทสต์ใหม่: `links.test.ts` (5 เคส) และ `blocks.test.tsx` (ยืนยันว่า href ที่เป็น
    `javascript:` ถูกแทนด้วย `/` ตอน render)
- เพิ่ม `.github/workflows/ci.yml` step `Dependency audit` (`continue-on-error`) และ
  `.github/dependabot.yml` ให้แจ้งเตือน/อัปเดต dependency เป็นรอบ
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` ผ่านทั้งหมด (579 เคส ไม่นับ 15 เคสที่ต้องมี DB)
  · `pnpm audit` พบ 63 ช่องโหว่ (5 critical / 22 high) — ส่วนใหญ่มาจาก `next`/`multer`/dev tooling
- blocker ที่ยังเปิดอยู่ (ตั้งใจยกไปก้อนถัดไป): อัปเกรด `next` เป็น `^15.5.24`,
  เพิ่ม security header + `trust proxy`/CSRF/Redis rate limit, `pnpm.overrides` สำหรับ multer

## งานที่ทำเสร็จ (ก้อนที่ 11)

ปิด blocker + ข้อ "ควรแก้" ทั้งหมดจากก้อนที่ 10 (ตามลำดับงานใน
[`design/23-security-review.md`](design/23-security-review.md))

- **อัปเกรด `next` 14.2.35 → 15.5.28** (`apps/renderer`) ปิด advisory ระดับ critical/high
  ทั้งชุด (RCE/SSRF/DoS) — ปรับโค้ดตาม breaking change ของ Next 15:
  `params` เป็น `Promise` และ `headers()` เป็น async จึงแก้ `[slug]/page.tsx`,
  `posts/[slug]/page.tsx`, `sitemap.ts`, `robots.ts` และเปลี่ยน `requestHost()`
  ให้คืน `Promise<string>` (ทุกหน้าจอ `await` หมด)
- **`pnpm.overrides` ย้ายไป `pnpm-workspace.yaml`** (pnpm 11 ไม่อ่าน `package.json` แล้ว):
  pin `multer@>=2.3.0`, `body-parser@>=1.20.6`, `qs@>=6.16.0`, `postcss@>=8.5.23`,
  `file-type@>=21.3.2`, `vite@^6.4.4`, `vitest@^4.1.12`, `@vitest/mocker`, `tinypool`,
  `picomatch`, `glob`, `tmp`, `ajv`, `webpack` — โดยจำกัดช่วง (`@<version`) ให้กระทบเฉพาะ
  เวอร์ชันที่มีช่องโหว่; อัปเกรด `vitest` เป็น 4.1.12 + `vite` เป็น 6.4.4 ทุกแพ็กเกจ
  (รวม `admin`, `@lumio/ui`)
  - ผล: `pnpm audit` **63 → 2 ช่องโหว่** (0 critical) — เหลือ `braces` (ยังไม่มีเวอร์ชัน
    patch บน registry) และ `@nestjs/core` (ต้องอัปเป็น Nest 11)
- **security header ครบทั้งสองฝั่ง** (ตามหัวข้อ 15.2):
  - API: `apps/api/src/common/security-headers.ts` — `X-Content-Type-Options: nosniff`,
    `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, CSP
    `default-src 'none'; frame-ancestors 'none'`, `Cross-Origin-Resource-Policy: cross-origin`
    (เพราะ `/media/*` ถูกฝังข้ามโดเมน) และ HSTS เฉพาะ production — ติดตั้งก่อน static mount
  - renderer: `next.config.mjs` เพิ่ม header ชุดเดียวกัน + `poweredByHeader: false` และ
    `src/middleware.ts` + `src/lib/csp.ts` ออก CSP ต่อ request พร้อม **nonce**
    (`script-src 'self' 'nonce-…'`) ให้ Next ประทับ nonce ให้สคริปต์ของตัวเอง
    (dev ผ่อนเป็น `'unsafe-eval'`); ตรวจจริงด้วยการรัน `next start` แล้วยืนยันว่า nonce
    บน header ตรงกับใน HTML และหน้าตอบ 200
- **CSRF**: `apps/api/src/common/origin.guard.ts` — `OriginGuard` ผูกเป็น `APP_GUARD`
  เทียบ `Origin` กับ allow-list (`ADMIN_ORIGIN`/`RENDERER_ORIGIN`/`API_PUBLIC_URL`,
  คั่นด้วย comma ได้) เฉพาะ method ที่เปลี่ยนข้อมูล; คำขอที่ไม่มี `Origin`
  (worker/renderer/curl) ผ่านได้ และ CORS ใช้ allow-list ชุดเดียวกัน
- **`trust proxy`**: `apps/api/src/common/trust-proxy.ts` + `main.ts` ตั้ง
  `app.set('trust proxy', …)` จาก `TRUST_PROXY` (ค่าเริ่มต้น 1 = Caddy ใน repo)
  ทำให้ `request.ip` ที่ rate limit ใช้คือ IP จริง ไม่ใช่ IP ของ proxy
- **rate limit ใช้ store ร่วม**: `apps/api/src/common/rate-limit.store.ts`
  (`RateLimitStore` + `hit`/`reset`) มี `MemoryRateLimitStore` ที่ **evict แบบ LRU/TTL**
  (ไม่ `clear()` ทั้งหมดอีก จึง flood คีย์เพื่อรีเซ็ตตัวนับไม่ได้) และ
  `RedisRateLimitStore` (Lua `INCR`+`PEXPIRE` atomic, fallback ลง memory เมื่อ Redis ล่ม)
  เลือกอัตโนมัติจาก `REDIS_URL`; `RateLimitModule` เป็น `@Global()` แชร์ store เดียว
  และปิด connection ตอน shutdown (`ioredis` เป็น dependency ใหม่ของ API)
  - เพิ่ม `@RateLimit` ให้ `POST /v1/auth/refresh` (เดิมไม่มี) และตัวนับใช้ร่วมกันทุก instance
- **account lockout**: `LoginThrottleService` ล็อกบัญชีชั่วคราว 15 นาทีหลังพลาด 5 ครั้ง
  (นับต่ออีเมลแบบไม่สนตัวพิมพ์, รีเซ็ตเมื่อล็อกอินสำเร็จ) พร้อม `Logger.warn`;
  หมายเหตุ: `audit_logs` เป็นตาราง site-scoped ใต้ RLS จึงบันทึกเหตุการณ์ระดับแพลตฟอร์ม
  ไม่ได้ → ใช้ application log (prod ส่งเข้า log collector) แทนการผ่อน RLS
- **เทียบ secret แบบ constant-time**: `apps/renderer/src/lib/revalidate.ts` ใช้
  `createHash('sha256')` + `timingSafeEqual` (แฮชก่อนเทียบจึงไม่รั่วความยาว)
- env ใหม่/เอกสาร: `TRUST_PROXY` ใน `.env.example`, CI comment ของ step `Dependency audit`
- Test ใหม่ 32 เคส (api 21: store/guard/origin/headers/trust-proxy/lockout,
  renderer 6: csp + secret ยาวไม่เท่ากัน) — รวมทั้งโปรเจกต์ **604 เคส**
  (shared 69, tokens 10, sdk 6, ui 55, blocks 110, api 192 (+15 เคสที่ต้องมี DB), admin 111, renderer 51)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  และบูต `node apps/api/dist/main.js` จน Nest map route ครบ (หยุดเพราะไม่มี DATABASE_URL ตามคาด)

สิ่งที่ยังไม่ทำในก้อนที่ 11 (ตั้งใจเลื่อน):

- `@nestjs/core` ยังเป็น 10.x (advisory moderate แก้ใน Nest 11) — ต้องยกเป็นก้อน major upgrade
- `braces` ยังไม่มีเวอร์ชัน patch (`>=3.0.4`) บน registry ที่ใช้อยู่
- ยังไม่มี **2FA** และ virus scan (ClamAV) — เฟส 2; `sharp` ยังใช้ `limitInputPixels` default
- ยังไม่มี test ระดับ HTTP (supertest) ของ header/CSRF (ทดสอบที่ระดับ unit + รันจริงมือ)

## งานที่ทำเสร็จ (ก้อนที่ 12)

หน้าจอหลังบ้านชุดแรกตาม IA 5.1 (Dashboard + ดีไซน์) พร้อมเส้นทางและเมนูที่ผูกกับสิทธิ์
— งานที่ PROGRESS ของก้อนที่ 9 ระบุว่า "ควรทำเป็นก้อนถัดไปพร้อมหน้า Dashboard"

- `packages/shared`:
  - `dashboard.ts` — `dashboardSummarySchema` (site/stats/health/checklist), `dashboardMetricSchema`
    (ค่า + ค่าก่อนหน้า + % เปลี่ยนแปลง เป็น `null` เมื่อไม่มีฐานเทียบ), `siteHealthSchema`
    (คะแนน 0–100 + "สิ่งที่ควรแก้" ≤ 3 พร้อม `impact` และ `href`), `siteChecklistSchema`
    (6 ข้อ + `doneCount`/`complete`/`dismissed`), `SITE_CHECKLIST_KEYS`/`SITE_CHECKLIST_LABELS`
    และ `updateChecklistInputSchema`
  - `global-blocks.ts` — `GLOBAL_BLOCK_KINDS` (header/footer), `globalBlocksSchema`, `updateGlobalBlockInputSchema`
  - `site.ts` — `isSslStatus`, `domainSummarySchema`, `domainListSchema` (แนบ `cnameTarget`),
    `domainVerifyResultSchema`, `memberSummarySchema` และ `addDomainInputSchema` ที่ตรวจรูปโดเมนจริง
    - `lowercase`
  - `section-template.ts` — `updateSectionTemplateInputSchema` (เปลี่ยนชื่อเทมเพลตส่วน)
- `apps/api`:
  - `modules/dashboard` — `GET /v1/dashboard`: `summary()` คำนวณทุกอย่างจากข้อมูลจริง
    (ผู้เข้าชม = `COUNT(DISTINCT session_hash)` จาก `pageviews` ที่เป็น partitioned table
    จึงใช้ raw SQL ใต้ RLS, ข้อความใหม่/สมัครรับข่าว = จำนวนของ "วันนี้" เทียบ "เมื่อวาน",
    คะแนนสุขภาพ = 100 ลบน้ำหนักของปัญหาที่ตรวจได้จริง แล้วจัดอันดับตามผลกระทบ) และ
    `PATCH /v1/dashboard/checklist` เก็บ `settings.checklist.dismissed` + audit log
  - `modules/global-blocks` — `GET /v1/global-blocks` และ `PUT /v1/global-blocks/:kind`
    (สร้างแถวถ้ายังไม่มี + audit log)
  - `modules/domains` — `GET/POST /v1/sites/:id/domains`, `POST /:domainId/verify`,
    `DELETE /:domainId`; `DomainVerifier` (interface + `DOMAIN_VERIFIER` token) ใช้ `node:dns`
    ตรวจ CNAME/A ว่าชี้มาที่ `<subdomain>.<PUBLIC_ROOT_DOMAIN>` จริง แล้วจึงเปิด `sslStatus: active`
  - `section-templates` — เพิ่ม `PATCH /:id` (เปลี่ยนชื่อ ไม่แตะ blocks) + audit log
  - `members` — `MemberSummary` ย้ายไป `packages/shared` (เลิกนิยามซ้ำ)
- `apps/admin`:
  - `shell/` — `nav.ts` (เมนูตาม IA 5.1 พร้อมซ่อนเมนูที่ role เข้าไม่ได้), `router.ts` (path router
    จิ๋วที่ผูก `pushState`/`popstate` ให้ deep link ใช้ได้), `AdminShell.tsx` (sidebar + topbar +
    bottom nav บนมือถือ) และ `shell.css` (token ล้วน)
  - `route.ts` — `AdminRoute` ต่อหน้าจอ, `routePath`/`parseRoute` (round-trip ได้),
    `isRouteAllowed(route, role)` และ `resolveRoute` พาไป Dashboard
  - `dashboard/` — `DashboardPage` + `DashboardView` (แยกไว้ทดสอบได้): ปุ่มลัด 4 ปุ่ม
    (แก้เว็บ/หน้าใหม่/เขียนบทความ/ดูเว็บ — primary ปุ่มเดียว), สถิติวันนี้พร้อมแนวโน้ม,
    วงแหวนคะแนนสุขภาพ + "สิ่งที่ควรแก้" ที่กดแล้วไปแก้ได้, checklist 6 ข้อที่หายไปเมื่อครบหรือกดซ่อน,
    skeleton ตอนโหลด และ empty/error state ที่ลองใหม่ได้
  - `content/` — `ContentListPage` + `ContentView` (ค้นหา/กรองสถานะ/cursor pagination),
    `CreateContentDialog` (ถามชื่อ + ชื่อลิงก์ก่อนสร้าง แล้วพาเข้า editor) และ
    `useContentList` ที่ "ลบ" เป็นการย้ายไปถังขยะ (PATCH `status: archived`) พร้อม toast "เลิกทำ"
  - `design/` — `DesignPage` 5 แท็บ: `StylePanel` (สี/ฟอนต์/มุมโค้ง/ปุ่ม/ความแน่น/โหมดสี/อนิเมชัน
    - ตัวอย่างสดด้วย `themeCssVariables` + เตือนคอนทราสต์ + คืนค่าเทมเพลต), `MenusPanel`
      (เมนูบน/ล่าง ซ้อนได้หนึ่งชั้น), `HeaderFooterPanel` (แก้ global blocks ด้วย `BlockInspector`
      ตัวเดิม + เพิ่ม/ลบ/เลื่อน/ทำซ้ำ/ซ่อน), `TemplatePanel` (การ์ดเทมเพลต + สวิตช์ว่าจะเอา
      Header/Footer ใหม่ด้วยไหม + แบนเนอร์ยืนยันว่าเนื้อหาไม่หาย), `SectionsPanel` (เปลี่ยนชื่อ/ลบ
      พร้อม undo ที่สร้างกลับให้)
  - `settings/` — `SettingsPage` 3 แท็บ: ทั่วไป (ชื่อเว็บ/ที่อยู่ฟรี), โดเมน (ที่อยู่ฟรี + CNAME,
    เพิ่ม/ตรวจสอบ/ลบ พร้อม undo), ทีมงาน & สิทธิ์ (เพิ่ม/เปลี่ยน role/นำออก พร้อม undo)
  - `clients.ts` — เพิ่ม `dashboard`/`design`/`settings` ทั้งแบบ HTTP และ demo
    (โหมดทดลองจึงเปิดได้ทุกหน้าจอโดยไม่ต้องมี API) และ `ContentApi` เพิ่ม `list`/`create`/`update`/`remove`
  - `api-error.ts` แยกออกมาใช้ร่วมทุก client (พร้อม `isForbidden`/`isNotFound`)
- Test ใหม่ 98 เคส (shared 11, api 20, admin 67 — รวมทั้งโปรเจกต์เป็น 702):
  dashboard service (สถิติ/แนวโน้มที่ไม่มีฐาน/สุขภาพ/checklist/การซ่อน), global blocks,
  domains (โดเมนซ้ำ/ที่อยู่ฟรี/ตรวจ DNS ไม่ผ่าน/ผ่าน), section template rename,
  schema ใหม่ทั้งหมด, nav + สิทธิ์, AdminShell, DashboardView, ContentView,
  GeneralView/DomainView/TeamView, http client ของ dashboard/design/settings/contents
  และ demo API ของ design/settings

หมายเหตุการออกแบบ

- "ลบ" เนื้อหาในรายการใช้การย้ายไปถังขยะ (`archived`) แทนการลบถาวร เพื่อให้กฎ "ยกเลิกได้"
  ทำได้จริงด้วย API ที่มีอยู่ (ยังไม่มีถังขยะถาวร/กู้คืนระดับฐานข้อมูล)
- ลบเทมเพลตส่วน/โดเมน/ทีมงาน เลิกทำได้โดยสร้างกลับด้วยข้อมูลเดิม (id ใหม่)
- `sites.settings.checklist` เก็บเฉพาะ `dismissed` เพราะสถานะ 6 ข้อคำนวณจากข้อมูลจริงทุกครั้ง

## งานที่ทำเสร็จ (ก้อนที่ 13)

ฟอร์มติดต่อ & ข้อความที่ได้รับ — MVP ส่วนที่ยังขาด ปิดครบทั้งสัญญาข้อมูล, API, หน้าจอหลังบ้าน,
block บนหน้าเว็บ และการส่งข้อความ **โดยไม่ต้องใช้ JavaScript** บนหน้า public

- `packages/shared` — `forms.ts`:
  - `FORM_FIELD_TYPES` (ข้อความสั้น/อีเมล/เบอร์โทร/ข้อความยาว/เลือกจากรายการ/ติ๊กยืนยัน/ตัวเลข),
    `formFieldSchema` (ชื่อฟิลด์เป็น `a-z0-9_`, ช่องแบบเลือกต้องมีตัวเลือก, ชื่อซ้ำไม่ผ่าน),
    `formFieldsSchema` (1–20 ช่อง), `formNotifySchema` (อีเมล ≤ 5 + LINE token),
    `createFormInputSchema`/`updateFormInputSchema`, `submissionListQuerySchema`/`updateSubmissionInputSchema`,
    `publicFormSchema` (ส่งออกเฉพาะที่จำเป็น ไม่มีค่าแจ้งเตือน), `submitFormInputSchema` + `FORM_HONEYPOT_FIELD`
  - `validateFormSubmission()` ตรวจคำตอบกับนิยามฟอร์มและคืนข้อความไทย ("กรุณากรอกชื่อของคุณ", "อีเมลไม่ถูกต้อง", ...)
    ใช้ทั้งฝั่ง API (ตัวตัดสินจริง) และตอนพรีวิว, `isHoneypotFilled()`, `DEFAULT_CONTACT_FORM_FIELDS`
  - `publicPageSchema.forms` — ฟอร์มที่หน้านั้นใช้ เพื่อให้ renderer วาดช่องได้โดยไม่ต้องเรียก API เพิ่ม
- `apps/api` `modules/forms`:
  - `FormsService` — CRUD ฟอร์ม + กล่องข้อความ (cursor pagination, กรอง `new`/`read`/`archived`),
    `submitPublic()` resolve tenant จาก host → validate → เก็บข้อความ (ทุก query อยู่ใน `forSite` = RLS)
  - `FormsController` (`/v1/forms`) ใช้ guard 3 ชั้น + `@Roles`; `PublicFormsController`
    (`POST /v1/public/:host/forms/:formId/submit`) ไม่มี auth แต่ rate limit 20/นาที/IP + honeypot
  - `DefaultFormNotifier` (`FORM_NOTIFIER`) เขียน application log และถ้าฟอร์มมี LINE token ก็ push ผ่าน LINE Notify
    — แจ้งเตือนล้มเหลวไม่ทำให้ข้อความของลูกค้าหาย
  - `resolveSiteByHost()` แยกออกมาจาก `PublicService` แล้วให้ทั้ง public delivery และการส่งฟอร์มใช้ร่วมกัน
  - `PublicService` แนบ `forms` ของหน้า โดยสแกน `props.formId` ใน block tree (รวม children)
- `packages/blocks` — block `form` (`schema`/`defaults`/`Block`/`Panel`/`index`):
  panel เลือกฟอร์มจาก `FormsCatalogProvider` (context ฝั่ง editor เท่านั้น) ส่วน renderer ได้ `forms`
  ผ่าน prop ที่ไล่ลงมาจากหน้าจอ (`BlockRenderer`/`BlockTreeRenderer`) จึงไม่มี JS ของ block บนหน้า public;
  ข้อความขอบคุณ/ผิดพลาดแสดงด้วย CSS `:target` (`#sent-:id`, `#error-:id`)
- `apps/admin` — หน้า **ฟอร์ม & ข้อความ** (`/content/forms`): รายการฟอร์ม + กล่องข้อความของฟอร์มที่เลือก,
  กรองสถานะ, ทำเป็น "อ่านแล้ว", เก็บเข้าคลังพร้อม "เลิกทำ", สร้าง/แก้ฟอร์มด้วยตัวสร้างช่อง,
  ตั้งอีเมล/LINE แจ้งเตือน, เมนูใหม่ใน "เนื้อหา" และ `canManage` ซ่อนปุ่มเขียนสำหรับ viewer/author;
  editor โหลดฟอร์มทั้งเว็บให้ panel และ preview ของ block
- `apps/renderer` — block ฟอร์ม render เป็น `<form method="post" action="/forms/:id">` (ไม่มี client JS),
  `app/forms/[formId]/route.ts` รับโพสต์แล้วส่งต่อไป API ผ่าน `lib/form-submit.ts` แล้วตอบ 303 กลับหน้าที่มา
  พร้อม `#sent-:id`/`#error-:id`; `lib/form-return.ts` กัน open redirect (รับเฉพาะ path บน host เดียวกัน)
  และ `lib/demo.ts` มีฟอร์มตัวอย่างให้ลองได้ทันทีโดยไม่ต้องมี API
- Test ใหม่ 59 เคส (shared 13, blocks 5, api 16, admin 17, renderer 8) — รวมทั้งโปรเจกต์ **761 เคส**
  (shared 93, tokens 10, sdk 6, ui 55, blocks 115, api 227 (+15 เคสที่ต้องมี DB), admin 196, renderer 59)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  (หน้า public ยังเพิ่ม JS เพียง 143 B/หน้า; route `/forms/[formId]` เป็น server-rendered ไม่มี JS ฝั่งผู้ชม)

หมายเหตุการออกแบบ

- หน้า public ต้องเร็วและ SEO ดี จึงเลือก "ฟอร์ม HTML ธรรมดา + route handler ฝั่งเซิร์ฟเวอร์" แทน client component
  ทำให้หน้าเว็บยังไม่ต้องส่ง JavaScript ของ block เลย และไม่ต้องอ่าน `searchParams` (จึงไม่ทำให้หน้าเป็น dynamic เกินจำเป็น)
- ข้อความขอบคุณแสดงด้วย `:target` ของ fragment แทน query string เพื่อคงหลักการเดิม (static-first, ไม่มี JS)

## งานที่ทำเสร็จ (ก้อนที่ 14)

ประวัติเวอร์ชัน & ถังขยะเนื้อหา — ปิดช่องว่างจาก IA 5.1 "Backup & ประวัติเวอร์ชัน" และหลักการ
"ทุกการลบ/แก้ไขสำคัญต้องยกเลิกได้" (AGENTS.md ข้อ 5)

- `packages/shared` — `content.ts`:
  - `ContentSummary.archivedAt` (เวลาเข้าถังขยะ), `CONTENT_TRASH_RETENTION_DAYS = 30`
  - ตัวช่วยล้วน ๆ ที่ทดสอบได้: `trashPurgeAt()` / `trashDaysLeft()` / `isTrashExpired()`
  - `ContentVersionSummary` เพิ่ม `authorName` + `blockCount`; `ContentVersionDetail` (มี `blocks`),
    `createContentVersionInputSchema` (บันทึกเวอร์ชันเองพร้อมโน้ต ≤ 120 ตัวอักษร)
- `apps/api/prisma` — คอลัมน์ `contents.archived_at` + index `(site_id, status, archived_at)`
  ใน migration `20261024000000_content_archive` (ไม่ทำลายข้อมูลเดิม เพราะ nullable)
- `apps/api` `modules/contents`:
  - `PATCH /contents/:id` ตั้ง `archived_at` เมื่อย้ายเข้าถังขยะ (และล้างเมื่อออก) และถ้าหน้านั้น
    เคยเผยแพร่อยู่ จะ enqueue publish ให้ renderer ลบหน้านั้นออกจากเว็บทันที
  - `POST /contents/:id/restore` — กู้คืนจากถังขยะ (กลับเป็นร่าง, audit `content.restore`)
  - `GET /contents/:id/versions` แนบชื่อผู้บันทึก + จำนวนส่วน · `GET .../versions/:versionId`
    คืน block tree สำหรับตัวอย่าง · `POST .../versions` บันทึกเวอร์ชันเอง
  - `purgeExpiredTrash()` ลบหน้าที่อยู่ในถังขยะเกิน 30 วัน (ไล่ทีละ site เพราะ `sites` อยู่นอก RLS)
    - `TrashPurgeProcessor` ที่ `worker.ts` สั่ง `start()` (ค่าเริ่มต้นวันละครั้ง, `TRASH_PURGE_INTERVAL_MINUTES`)
- `apps/admin`:
  - หน้าแก้ไขเว็บมีปุ่ม **ประวัติ** เปิด `VersionHistoryPanel` (Drawer): ดูรายการเวอร์ชัน + ตัวอย่าง
    ที่เรนเดอร์จริง + กู้คืน, และบันทึกเวอร์ชันใหม่พร้อมโน้ต
  - รายการหน้าเว็บ/บทความ: แถวที่อยู่ในถังขยะสลับเป็น "กู้คืน" + "ลบถาวร" พร้อม "ลบอัตโนมัติในอีก N วัน"
    (ลบถาวรมี dialog ยืนยัน เพราะย้อนกลับไม่ได้ — ต่างจาก "ย้ายไปถังขยะ" ที่ใช้ toast "เลิกทำ")
  - ตั้งค่า → **สำรองข้อมูล & ประวัติ**: อธิบายว่าประวัติเวอร์ชันอยู่ที่ปุ่ม "ประวัติ" ในหน้าแก้ไข
    - ถังขยะรวมทุกหน้า/บทความ พร้อมกู้คืน/ลบถาวรและวันที่จะถูกลบ
- Test ใหม่ 31 เคส (shared 4, api 14, admin 13) — รวมทั้งโปรเจกต์ **792 เคส**
  (shared 97, tokens 10, sdk 6, ui 55, blocks 115, api 241 (+15 เคสที่ต้องมี DB), admin 209, renderer 59)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` ผ่านทั้งหมด

หมายเหตุการออกแบบ

- เลือกใช้ `status = 'archived'` + `archived_at` แทนตาราง trash แยก เพื่อให้ทุก query เดิม
  (list/RLS/publish) ใช้ได้ทันที และ index เดียวรองรับทั้งหน้าถังขยะและงาน purge
- งาน purge เป็น "กวาดตามเวลา" ไม่ใช่คิว เพราะงานคือ "หาทุกอย่างที่หมดอายุ" ซึ่งทำซ้ำได้ปลอดภัย
  และไม่มีอะไรต้อง enqueue; `worker` เป็นเจ้าของ (API รันเฉพาะเมื่อ `TRASH_PURGE_INLINE=true`)
- กู้คืนกลับเป็น **ร่าง** เสมอ เพราะสถานะเดิม (เช่น published) อาจไม่เหมาะสมแล้วหลังผ่านไป 30 วัน

## งานที่ทำเสร็จ (ก้อนที่ 15)

เมนู **"เติบโต" (Growth)** ตาม IA 5.1 — ปิดช่องว่างที่ PROGRESS ของก้อนที่ 9/12 ระบุว่า
"เมนู เติบโต (SEO/Analytics/Newsletter/Apps) ยังไม่มีหน้าจอ" และต่อ `GET /seo/health`
เข้ากับคะแนนสุขภาพเว็บที่มีอยู่แล้วใน Dashboard

- `packages/shared` — สัญญาข้อมูลของทั้งสี่หน้าจอ (leaf ล้วน มี test ครอบ):
  - `seo-health.ts` — `SeoHealth` (คะแนน 0–100 + `grade` + รายการตรวจ), `SeoCheck`
    (`kind`/`label`/`done`/`count`/`impact`/`href` + ตัวอย่าง ≤ 5 รายการ),
    `SEO_ISSUE_KINDS`/`SEO_ISSUE_LABELS`/`SEO_GRADE_LABELS`, `seoGradeFor`,
    `blocksHaveHeadingOne` (ย้ายตรรกะ H1 มาไว้ที่เดียว แล้วให้ renderer เรียกใช้),
    `hasSeoText`/`isNoindex` (อ่าน JSON ที่เก็บมาแบบกันพัง)
  - `analytics.ts` — `AnalyticsSummary` (ผู้เข้าชม/การเปิดหน้า + `changePercent` +
    `series` รายวัน + `topPages`/`topReferrers`/`devices`), `ANALYTICS_RANGES` (`7d`/`30d`),
    `analyticsRangeDays`, `analyticsChangePercent`, `deviceLabel`
  - `newsletter.ts` — `Subscriber`/`SubscriberList`/`SubscriberExport`, สถานะ
    (`active`/`unsubscribed`) + label ไทย, `createSubscriberInputSchema` (trim + lowercase),
    `subscribersToCsv` (มี BOM ให้ Excel อ่านไทยได้ + escape ทุกเซลล์)
  - `app.ts` — `APP_CATALOG` (5 App: ตัวช่วย SEO, Google Analytics, แจ้งเตือนผ่าน LINE,
    ส่งข่าวสาร, ระบบจองคิว), `APP_PERMISSIONS` + label ไทยของทุก scope,
    `AppStoreEntry`/`InstalledApp` + schema ติดตั้ง/แก้ไข
- `apps/api`:
  - `modules/seo` — `GET /v1/seo/health`: ตรวจชื่อเรื่อง/คำอธิบายหน้า/หัวข้อหลัก/คำอธิบายรูป/
    noindex/การเผยแพร่ จากข้อมูลจริง (blocks_published สำหรับ H1) ให้คะแนนแบบถ่วงน้ำหนัก
    พร้อมลิงก์ไปหน้าที่ต้องแก้ (ไม่แตะเนื้อหา)
  - `modules/analytics` — `GET /v1/analytics?range=7d|30d`: อ่าน `pageviews` (partitioned,
    ใช้ raw SQL ใต้ RLS) สรุปผู้เข้าชม (distinct session)/การเปิดหน้า, เทียบช่วงก่อนหน้า,
    เติมวันที่ไม่มีการเข้าชมเป็นศูนย์ให้กราฟ, จัดอันดับหน้า/แหล่งที่มา/อุปกรณ์ (ตัด referrer
    เป็น host)
  - `modules/newsletter` — `GET/POST /v1/subscribers`, `PATCH/DELETE /v1/subscribers/:id`,
    `GET /v1/subscribers/export` (CSV ส่งในซอง JSON ให้ client เซฟไฟล์) — cursor pagination,
    กรองสถานะ + ค้นอีเมล, กันอีเมลซ้ำเป็น 409 ภาษาคน, audit log ทุกการเขียน
  - `modules/apps` — `GET /v1/apps` (คลัง + ติดตั้งแล้วหรือยัง), `GET /v1/site-apps`,
    `POST/PATCH/DELETE /v1/site-apps/:appKey` — ติดตั้งได้เฉพาะ App ในคลัง, เขียน audit log,
    ทุก query อยู่ใน `forSite` (RLS) และการติดตั้งจำกัดเฉพาะ owner/admin
- `apps/admin` — โฟลเดอร์ `growth/` (เมนูที่ 4 ตาม IA, มี 4 หน้าจอย่อย):
  - `nav.ts` เพิ่มเมนู "เติบโต" (SEO/สถิติผู้เข้าชม/ข่าวสาร/Apps) โดยซ่อน Apps จาก editor,
    `route.ts` เพิ่มเส้นทาง `/growth/:tab` (round-trip + `isRouteAllowed` แยกตาม role),
    `clients.ts` เพิ่ม client ทั้ง 4 แบบ (HTTP + demo), `App.tsx` ต่อหน้าจอ
  - `SeoPage` — วงแหวนคะแนน + เกรด + รายการตรวจที่กดแล้วไปแก้ได้ (ใช้ `HealthRing` ตัวเดิม)
  - `AnalyticsPage` — สลับช่วง 7/30 วัน, การ์ดผู้เข้าชมพร้อมแนวโน้ม, กราฟแท่งจาก
    design token (SVG/`span` ไม่มีไลบรารีกราฟ), วงแหวนไม่มี — ใช้บาร์ของหน้า/แหล่งที่มา/อุปกรณ์
  - `NewsletterPage` — เพิ่มผู้ติดตามด้วยอีเมล, กรอง/ค้นหา, เปลี่ยนสถานะ/นำออกพร้อม toast
    "เลิกทำ", ดาวน์โหลด CSV, `canManage` ซ่อนการเขียนจาก viewer
  - `AppsPage` — การ์ด App พร้อมรายการ permission ที่ขอ (ภาษาไทย), ติดตั้ง/เปิด-ปิด (Switch)/
    ถอนการติดตั้งพร้อม undo, `canManage` ทำให้ viewer ดูอย่างเดียว
  - `growth.css` ใช้ design token เท่านั้น, ปุ่ม Primary ไม่เกิน 1 ต่อหน้า, มีครบ 4 สถานะ
- Test ใหม่ 64 เคส — รวมทั้งโปรเจกต์ **856 เคส**
  (shared 113, tokens 10, sdk 6, ui 55, blocks 115, api 262 (+15 เคสที่ต้องมี DB),
  admin 236, renderer 59): seo service (คะแนนเต็ม/ของที่ขาด/ยังไม่เผยแพร่/จำกัด 5 ตัวอย่าง),
  analytics service (แนวโน้ม/เติมวันว่าง/ตัด referrer เป็น host), newsletter service
  (list/create/409/update/remove/export), apps service (คลัง/ติดตั้ง/ซ้ำ/ไม่รู้จัก/ถอน),
  shared (เกรด/H1/CSV/แคตตาล็อก), admin view ทั้ง 4 + http client + cross-check
  `APP_PERMISSIONS` กับ `PERMISSION_SCOPES` ของ SDK, nav/route ของเมนูใหม่
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  และบูต `node apps/api/dist/main.js` จน Nest map route ใหม่ครบ (`/v1/seo/health`,
  `/v1/analytics`, `/v1/subscribers`, `/v1/subscribers/export`, `/v1/apps`, `/v1/site-apps`)

หมายเหตุการออกแบบ

- SEO score ต่อจากสุขภาพเว็บเดิม (ถ่วงน้ำหนักตามผลกระทบ) จึงมี "3 สิ่งที่ควรแก้" ใน Dashboard
  อยู่แล้ว และหน้า SEO แสดงรายการตรวจเต็ม; ยังไม่เผยแพร่ = 45 คะแนน (ต่ำกว่าเกณฑ์ "ควรปรับปรุง")
- Analytics อ่าน `pageviews` ด้วย raw SQL เหมือน Dashboard (ตาราง partitioned ที่ Prisma ไม่โมเดล)
  จึงไม่ต้องมี migration ใหม่ในก้อนนี้; ยังไม่มีตัวเก็บ pageview (จะมาในก้อน Analytics/Deploy ถัดไป)
- Apps เป็นคลังในโค้ด (`APP_CATALOG`) ไม่ใช่ข้อมูลใน DB — ติดตั้งเพียงบันทึกว่าเว็บนี้มี App ไหน
  (ตาราง `site_apps` เดิม) และแสดง permission scope ให้เห็นก่อนติดตั้งตาม 16-apps.md
- Export CSV ส่ง `{ filename, content }` ในซอง JSON เพื่อให้ทุก endpoint ยังใช้ envelope เดียวกัน
  แล้วให้ admin สร้างไฟล์เอง (ไม่ต้อง special-case raw response)

ผลจาก security review ของก้อนนี้ (ใช้สกิล `lumio-security-review`):

- ผ่าน: Zod ทุก input (query/body), ทุก query อยู่ใน `forSite` (RLS), `@Roles` ทุก route
  (ติดตั้ง/ถอน App และแก้รายชื่อผู้ติดตาม = owner/admin/editor ขึ้นไป; อ่าน = ทุก role),
  ไม่มี endpoint สาธารณะใหม่ (จึงไม่ต้อง rate limit เพิ่ม), ไม่มี SSRF (ไม่รับ URL จากผู้ใช้),
  ไม่มี secret ในโค้ด/log, กัน IDOR ด้วย RLS (`:subscriberId`/`:appKey` ของเว็บอื่นมองไม่เห็น),
  `pnpm audit` ยังเหลือ 2 (braces, @nestjs/core) เท่าเดิม — ไม่มีช่องโหว่ใหม่จากก้อนนี้
- ควรแก้ (ยกไปก้อนถัดไป): ยังไม่มี runtime sandbox ของ App (iframe + postMessage ตรวจ scope)
  — ก้อนนี้ทำเฉพาะคลัง/ติดตั้ง/แสดง scope; ยังไม่มี test ระดับ HTTP (403/ข้ามเว็บ) ของ route ใหม่
  (ใช้ guard ชุดเดิมที่มี test อยู่แล้ว เหมือนก้อนก่อน ๆ); ยังไม่มีตัวบันทึก `pageviews` จริง
- ข้อสังเกต: `GET /subscribers/export` เปิดให้ viewer ได้ เพราะเท่ากับข้อมูลที่อ่านได้อยู่แล้ว
  จาก `GET /subscribers`; ถ้าต้องการจำกัดวงกว้างขึ้นให้เปลี่ยนเป็น `WRITE_ROLES`

## งานที่ทำเสร็จ (ก้อนที่ 17)

ผู้ช่วย AI (docs/design/09-ai-assistant.md) งานแรกของเฟส 4 ตาม roadmap และต่อกับโควตา
"AI ครั้ง/เดือน" ที่ตารางแพ็กเกจเตรียมไว้ตั้งแต่ก้อนที่ 16

กติกาเหล็กของก้อนนี้: **AI เสนอเป็น diff เสมอ ไม่แก้ข้อมูลเอง** ทุก endpoint ตอบเป็นข้อเสนอ
(before/after) แล้วผู้ใช้กด "นำไปใช้" ผ่านหน้าจอเดิม (editor/คลังรูป) จึงยกเลิกได้ด้วย Ctrl+Z
และ toast "เลิกทำ" ของโปรเจกต์

- `packages/shared` — `ai.ts`: สัญญาของทั้งก้อน
  - `AI_REWRITE_STYLES` (ทำให้สั้นลง/ทางการขึ้น/เป็นกันเองขึ้น/ขยายความ/อ่านง่ายขึ้น) + label ไทย,
    `AI_LOCALES`, `AI_ACTIONS`
  - schema ของ input ทุก action (`aiRewriteInputSchema` รับได้ถึง 5 ข้อความ ๆ ละ ≤ 2000 ตัวอักษร,
    `aiTranslateInputSchema`, `aiAltTextInputSchema`, `aiSeoInputSchema`) และ output
    (`aiProposalSchema` = label/summary/changes/provider, `aiResultSchema`, `aiStatusSchema`)
  - โควตา: `aiQuotaForPlan` (อ่านจากตารางแพ็กเกจ), `aiUsageFor`, `aiQuotaPercent`,
    `isAiQuotaExhausted`, `isAiQuotaLow` (เตือนเมื่อเหลือ ≤ 20%), `aiProposalSummary`
  - ตัวช่วยข้อความที่ทดสอบแยกได้: `collapseWhitespace`, `truncateText` (ตัดที่ขอบคำ),
    `sentenceChunks`, และ `collectHeadingTexts`/`collectBodyTexts` ที่ไล่ block tree
    หาหัวข้อ/เนื้อหาจริงของหน้า (ใช้ร่วมกับ API และ renderer ได้)
- `apps/api/prisma` — ตาราง `ai_usage` (site_id + RLS FORCE + index `(site_id, created_at DESC)`
  - CHECK action/items) ใน migration `20261026000000_ai_usage` — นับเฉพาะแถวของเดือนปัจจุบันเป็น
    โควตา และเก็บ provider/model/items ไว้ตรวจย้อนหลัง
- `apps/api` `modules/ai`:
  - `AiProvider` (token `AI_PROVIDER`) + `LocalAiProvider` (ไม่ต้องมี key/เน็ต: ปรับข้อความด้วย
    text tools จริง, เขียนคำอธิบายรูปจากชื่อไฟล์+folder, ร่างชื่อเรื่อง/คำอธิบายจากหัวข้อและเนื้อหา
    ของหน้า; **ปฏิเสธ** การแปลพร้อมบอกวิธีตั้งค่า แทนการแต่งคำแปลปลอม) +
    `OpenAiCompatibleProvider` (chat completions แบบ JSON + timeout + ข้อความ error ภาษาไทย)
  - `MemoryAiCache` (LRU 200 รายการ + TTL 30 นาที) แคชตาม hash ของ prompt+context โดย `AiCache`
    เป็น interface ให้ย้ายไป Redis ได้
  - `AiService`: ตรวจแพ็กเกจ/โควตาก่อนทุกครั้ง (แพ็กเกจที่ไม่มี AI → 403 "แพ็กเกจนี้ยังไม่รวมผู้ช่วย AI",
    ใช้ครบ → 409 พร้อมบอกจำนวนครั้ง), เรียก provider ผ่าน cache, สร้าง proposal (ถ้าไม่ได้ปรับอะไรเลย
    จะบอกตรง ๆ), แล้วบันทึก `ai_usage` + audit `ai.<action>` ใน transaction เดียวกัน
  - `AiController` (`/v1/ai`) — `GET /status`, `POST /rewrite|translate|alt-text|seo`,
    guard 3 ชั้น + `@Roles` (owner/admin/editor/author ตาม content.write) + rate limit 30/นาที
- `apps/admin`:
  - `ai/api.ts` (http client), `ai/demo.ts` (โหมดทดลองใช้ได้ทันที), `AiDiffDialog`
    (ก่อน/หลัง + ปุ่ม "ยกเลิก"/"นำไปใช้" คู่เดียว และบอกว่า engine ไหนตอบ), `AiAssistant`
    (เลือกข้อความที่จะปรับ, เลือกรูปแบบ, แปลเป็นอังกฤษ, ขอชื่อเรื่อง/คำอธิบายหน้า + โควตาที่เหลือ)
  - Editor: `BlockCanvas` อ่านข้อความที่แก้ได้ (`data-editable-path`) ของ block ที่เลือกส่งให้ผู้ช่วย,
    `BlockInspector` มีช่อง `aiPanel`, reducer เพิ่ม `apply-paths` (นำข้อเสนอทั้งหมดไปใช้เป็น
    **หนึ่ง** ขั้น undo) และ `seo` (บันทึกชื่อเรื่อง/คำอธิบายผ่าน `PATCH /contents/:id`
    โดยไม่แตะ block tree)
  - คลังรูป: ปุ่ม "✨ ให้ผู้ช่วยคิดคำอธิบาย" ต่อจาก flow เดิม (diff → บันทึก alt) ทั้งหน้าเต็มและ
    dialog เลือกรูปของ editor
  - `clients.ts`/`App.tsx` ส่ง `ai` ให้ editor + คลังรูป; ไม่ตั้ง `VITE_API_URL` = `createDemoAiApi()`
- Test ใหม่ 154 เคส — รวมทั้งโปรเจกต์ **1,010 เคส**
  (shared 148, tokens 10, sdk 11, ui 58, blocks 115, renderer 61, admin 280, api 327)
  - shared: โควตา/ข้อความ/text helpers/หัวข้อและเนื้อหาจาก block tree
  - api: provider (local + OpenAI-compatible ด้วย fetch stub: ไม่มี key/บริการล่ม/ตอบผิดรูป),
    cache (TTL/LRU), service (แพ็กเกจไม่มี AI, โควตาครบ, 404 ข้ามเว็บ, 404 หน้า/รูป,
    เหตุการณ์ที่ไม่ได้ปรับอะไร, cache hit ไม่เรียก provider ซ้ำ)
  - admin: http client, demo client, diff dialog, ป้ายชื่อ block text (`labelForPath`),
    reducer `apply-paths`/`seo`, editor ที่ซ่อนแผงผู้ช่วยเมื่อไม่ส่ง `ai`
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  (บูตแมนนวลถูกหยุดกลางทางเพราะไม่มี `DATABASE_URL` จึงยืนยัน route `/v1/ai/*` จากไฟล์ build
  และ smoke test ของ `AppModule` แทน)

ผลจาก security review ของก้อนนี้ (ใช้สกิล `lumio-security-review`):

- ผ่าน: Zod ทุก input (controller parse ทุก body ด้วย schema กลาง), ทุก query อยู่ใน `forSite` (RLS)
  และมี test ข้ามเว็บ (รูป/หน้าของเว็บอื่น → 404), `@Roles` ทุก route (owner/admin/editor/author
  ตาม content.write) พร้อม rate limit 30/นาที/ผู้ใช้, ไม่มี endpoint สาธารณะใหม่,
  ไม่มี SSRF (URL ของผู้ให้บริการมาจาก env ไม่ใช่ input ผู้ใช้), ไม่มี secret ในโค้ด/log
  (ข้อความ error บอกชื่อ env ไม่บอกค่า), ข้อเสนอของ AI ไม่ถูก render เป็น HTML (ผู้ใช้กดนำไปใช้กับ
  prop ข้อความ ซึ่ง render เป็น text ปกติ), ส่งให้ผู้ให้บริการเฉพาะข้อความของหน้าและชื่อไฟล์รูป
  ของเว็บนั้น ไม่ส่งข้อมูลฟอร์ม ลูกค้า หรือรหัสผ่าน (ตาม [09](design/09-ai-assistant.md) 9.7),
  `pnpm audit` ยังเหลือ 2 (braces, @nestjs/core) เท่าเดิม — ไม่มีช่องโหว่ใหม่จากก้อนนี้
- ควรแก้ (ยกไปก้อนถัดไป): ยังไม่มี test ระดับ HTTP (403/429/ข้ามเว็บ) ของ `/ai/*`;
  cache ยังอยู่ในหน่วยความจำ (Redis เป็นงานถัดไป) และยังไม่จำกัดความยาวข้อความตอบกลับ
  ของงาน rewrite/translate ก่อนนำไปใช้

หมายเหตุการออกแบบ

- เลือกให้ API รับข้อความและคืนข้อความ แล้วให้ admin ประกอบเป็น diff เอง เพราะ API ไม่ควรรู้จัก path
  ของ block ทำให้ผู้ใช้นำข้อเสนอไปใช้กับ path ที่ editor รู้จริงได้
- engine ในเครื่องทำ rewrite/alt/SEO ได้จริง (ไม่ใช่ข้อความตัวอย่าง) แต่ **ไม่แอบถอย** ไปตอบแทน
  เมื่อทำไม่ได้: การแปลและ (ในอนาคต) สร้างทั้งเว็บต้องตั้งค่า provider จึงจะทำงาน
- ยังไม่ทำในก้อนนี้: `/ai/generate-site` (สร้างทั้งเว็บจาก prompt), แชทสั่งงานภาพรวม
  (เช่น "เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม"), ปุ่มแปลบนแถบเลือกข้อความ (ตอนนี้อยู่ที่แผงด้านข้าง),
  cache บน Redis, แนะนำ meta จากหน้า เติบโต › SEO (ปัจจุบันอยู่ที่แผงของ editor),
  และ test ระดับ HTTP (supertest) ของ route ใหม่

## คำสั่งเฉพาะก้อนที่ 17

```bash
pnpm --filter @lumio/shared test        # โควตา/ข้อความ/collectHeadingTexts
pnpm --filter api test src/modules/ai   # provider + cache + service
pnpm --filter admin test src/ai         # http client, demo client, diff dialog
pnpm --filter admin dev                 # ไม่ตั้ง VITE_API_URL = โหมดทดลอง (เลือกส่วน → แผง "ผู้ช่วย AI")
curl -H "Authorization: Bearer <token>" -H "X-Site-Id: <siteId>" http://localhost:49100/api/v1/ai/status
```

env ที่ก้อนนี้เพิ่ม (ดู `.env.example`): `AI_PROVIDER` (`local` = ค่าเริ่มต้น, `openai` = ของจริง),
`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_MS`
หมายเหตุ: แพ็กเกจ `free`/`starter` ยังไม่มีโควตา AI (ตามตารางแพ็กเกจเดิม) — ลองด้วยเว็บเดโม
`baandoi` (แพ็กเกจ โปร) หรือเปลี่ยนแพ็กเกจที่หน้าตั้งค่า › แพ็กเกจ

## งานที่ทำเสร็จ (ก้อนที่ 18)

หลายภาษา (i18n) ตาม [`design/17-i18n.md`](design/17-i18n.md) — งานแรกของหัวข้อ i18n ในเฟส 4
ต่อจากผู้ช่วย AI ของก้อนที่ 17 โดยใช้ AI แปลทั้งหน้าได้ด้วย

กติกาของก้อนนี้: **หน้าแต่ละภาษาเป็นคนละ record เชื่อมกันด้วย `translation_group_id`**
และ **คำแปลที่ AI ทำต้องออกมาเป็นร่างเสมอ** ให้ผู้ใช้ตรวจก่อนเผยแพร่

- `packages/shared` — `i18n.ts` (leaf ล้วน มี test ครอบ):
  - `SUPPORTED_LOCALES` (`th`/`en`), `DEFAULT_LOCALE`, `localeLabel`, `normalizeLocale`,
    `normalizeLocales`/`otherLocales`/`isLocaleOffered` (เรียงภาษาหลักก่อน + ตัดซ้ำ),
    `updateSiteLocalesInputSchema`
  - URL: `localePathFor(type, slug, locale, defaultLocale)` (ภาษาหลักไม่มีคำนำหน้า ภาษาอื่นอยู่ที่
    `/en/...`) และ `splitLocalePath(pathname, locales)` ที่ middleware ใช้แยกคำนำหน้าออก
  - hreflang: `buildHreflangLinks` และ `hreflangMap` (เพิ่ม `x-default` ชี้ภาษาหลักเสมอ)
  - สัญญาคำแปล: `createTranslationInputSchema` (`locale`/`slug`/`title`/`translate`),
    `ContentTranslationLink`/`ContentTranslations`, `translationCoverage` (เติมภาษาที่ยังไม่มีให้ครบ)
  - ตัวช่วยแปลข้อความใน block: `collectBlockTexts`/`applyBlockTranslations`/`mapBlockTexts`
    (whitelist เฉพาะ prop ที่เป็นข้อความผู้ใช้ — ไม่แตะ href/mediaId/variant/สี ฯลฯ)
  - `content.ts` — `ContentSummary.translationGroupId` และตัวกรอง `locale` ใน `contentListQuerySchema`
  - `public.ts` — `publicPageSchema` เพิ่ม `locale`/`isFallback`/`translations[]`,
    `publicPostListSchema.locale`, `publicSitemapUrlSchema.alternates[]`
  - `seo.ts` — `PageSeo.alternates.languages` (ส่งต่อ `hreflang` เข้า metadata)
- `apps/api/prisma` — migration `20261027000000_content_locale_group`:
  `contents.translation_group_id` (nullable) + index `(translation_group_id, locale)`
  — ไม่ทำลายข้อมูลเดิม (แถวที่ยังไม่มีคำแปลถือว่าตัวเองเป็นกลุ่ม, `UNIQUE (site_id, locale, type, slug)` เดิมคงอยู่)
- `apps/api`:
  - `ContentsService` — `translations()` (คืนทุกรูปแบบภาษาของหน้า + สถานะ),
    `createTranslation()` (คัดลอกโครง block ด้วย id ใหม่ → **ร่าง**, ผูกเข้า `translation_group_id`
    เดียวกันกับต้นฉบับ, กันชื่อลิงก์ซ้ำต่อภาษา, กันภาษาที่ยังไม่เปิดใช้) และถ้า `translate: true`
    จะเรียกผู้ช่วย AI แปลข้อความทั้งหน้าเป็นชุด (`AiService.translateTexts` แบ่งชุดละ 5 ข้อความ,
    นับโควตาต่อชุดจริง) — ตัว engine ในเครื่องจะปฏิเสธอย่างตรงไปตรงมาถ้าไม่ได้ตั้งค่า provider
  - `ContentsController` — `GET /contents/:id/translations`, `POST /contents/:id/translate`,
    และตัวกรอง `?locale=` ใน `GET /contents`
  - `PublicService` — เลือกภาษาตามที่ขอ ถ้าไม่มีจะ **fallback** ไปภาษาหลักพร้อม `isFallback`
    และคำนวณ `translations[]` (path + สถานะว่ามีแล้วหรือยัง) ให้ renderer;
    `listPosts` กรองตามภาษาและ fallback; `sitemap` ให้ URL ต่อภาษา + `alternates` สำหรับ hreflang
  - `PublishService` — job ล้าง cache ทั้ง URL ภาษาหลักและ URL ที่มีคำนำหน้า (ตอนสร้างคำแปลใหม่)
  - `SitesService` — `PATCH /sites/:id` รับ `locales`/`localeDefault` และ **normalize** ให้เสมอ
    (ภาษาหลักอยู่ลำดับแรก + ตัดซ้ำ)
- `packages/blocks` — block ใหม่ `language-switcher` (schema/defaults/Block/Panel/index):
  เรนเดอร์เป็นลิงก์ HTML ล้วนต่อภาษา (`hreflang` + `aria-current`), รายการภาษาส่งลงมาจากหน้า
  (`BlockRenderProps.languages`) เหมือน `forms` — หน้า public จึงยังไม่มี JS ของ block,
  panel เลือกการจัดวาง/โชว์ภาษาที่ยังไม่มีคำแปลแบบจาง, เพิ่มสไตล์ใน `styles.css` ด้วย token
- `apps/renderer`:
  - middleware อ่านคำนำหน้าภาษา: `/en/about` → rewrite เป็น `/about` พร้อม header `x-lumio-locale`
    และ `/th/about` (ภาษาหลัก) → 308 ไป `/about` (canonical), CSP/nonce เดิมคงอยู่
    (แยก `splitLocalePath` ไว้ใน `lib/locale.ts` เพื่อไม่ลาก `@lumio/shared` เข้า edge bundle)
  - `lib/request-locale.ts` ให้ทุกหน้า/เลย์เอาต์รู้ภาษาที่ขอ, `<html lang>` เปลี่ยนตามภาษา,
    `lib/languages.ts` แปลง `translations[]` เป็น `LanguageLink[]` ให้ block
  - `PageView` เรนเดอร์ประกาศ fallback + ส่ง `languages` ให้ block; `seo.ts` เพิ่ม
    `alternates.languages` (hreflang) และ canonical ชี้ภาษาของหน้า; `sitemap` ส่ง `alternates`
  - หน้า `/posts` และลิงก์บทความใช้ path ตามภาษา
  - demo (`lib/demo.ts`) มีหน้าอังกฤษ (home/about) + ตัวสลับภาษา จึงลองได้โดยไม่ต้องมี API
- `apps/admin`:
  - `editor/` — `LanguageBar` (container) + `LanguageBarView` (presentational, ทดสอบแยกได้)
    แสดง badge ต่อภาษาพร้อมสถานะ กดเพื่อสลับภาษา และเปิด dialog "สร้างคำแปล" (เลือกภาษา, ชื่อหน้า,
    ชื่อลิงก์, แปลด้วย AI ไหม) — มี primary ปุ่มเดียว; `ContentApi` เพิ่ม `translations`/`createTranslation`,
    `App.tsx` ต่อ `onOpenContent` เพื่อสลับไปหน้าที่แปลแล้ว
  - `settings/` — แท็บ **ภาษา** (`LanguageView`): เลือกภาษาที่เว็บเปิดใช้ + ตั้งภาษาหลัก บันทึกผ่าน
    `PATCH /sites/:id` (normalize ฝั่ง client ด้วย)
- Test ใหม่ 65 เคส — รวมทั้งโปรเจกต์ **1,080 เคส**
  (shared 169, tokens 10, sdk 11, ui 58, blocks 119, api 346, admin 295, renderer 72)
  - shared: locale/path/split/hreflang/coverage/ตัวช่วยแปล block + schema ใหม่
  - api: `translations`/`createTranslation` (คัดลอกโครง id ใหม่/ผูกกลุ่ม/ร่าง/กันซ้ำ/กันภาษาที่ไม่เปิด/
    เรียก AI เฉพาะเมื่อสั่ง), `translateTexts` (แบ่งชุด 5, นับโควตา, ปฏิเสธเมื่อไม่มี provider),
    public service (ภาษาที่ขอ/fallback/translations), sitemap (URL ต่อภาษา + alternates),
    publish (path ภาษา), sites (normalize locales)
  - blocks: ตัวสลับภาษา (ลิงก์ + hreflang + aria-current + ภาษาที่ไม่มีคำแปล + กรณีภาษาเดียว)
  - renderer: splitLocalePath ในตัว, api ส่ง `?locale=`, metadata language alternates,
    sitemap alternates, PageView (ตัวสลับภาษา/declaration/หน้าอังกฤษ), demo หลายภาษา
  - admin: LanguageBarView, LanguageView, http client (`translations`/`createTranslation`/locale filter),
    demo client (translations/createTranslation)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  (หน้า public ยังเป็น static-first; middleware 34.8 kB หลังแยก logic ไม่อ้าง `@lumio/shared`)

ผลจาก security review ของก้อนนี้ (ใช้สกิล `lumio-security-review`):

- ผ่าน: Zod ทุก input (`createTranslationInputSchema`, `updateSiteLocalesInputSchema`, `?locale=`),
  ทุก query อยู่ใน `forSite` (RLS) จึงกัน IDOR/ข้ามเว็บของ `translations`/`createTranslation`,
  `@Roles` ทุก route ใหม่ (อ่าน = ทุก role, เขียนคำแปล = owner/admin/editor/author),
  ไม่มี endpoint สาธารณะใหม่ (จึงไม่เพิ่ม rate limit), ไม่มี SSRF (URL ของ AI มาจาก env),
  ไม่มี secret ในโค้ด/log, คำแปลของ AI ไม่ถูก render เป็น HTML (เป็น prop ข้อความธรรมดา
  ที่ผ่าน block schema เดิม), `pnpm audit` ยังเหลือ 2 (braces, @nestjs/core) เท่าเดิม
- ควรแก้ (ยกไปก้อนถัดไป): ยังไม่มี test ระดับ HTTP (403/ข้ามเว็บ) ของ route ใหม่;
  ตัวสลับภาษา/การกรอง locale ในหน้ารายการหน้าเว็บของแอดมินยังไม่ทำ UI (API รองรับแล้ว);
  การแปลทั้งหน้ายังนับโควตาเป็นชุดละ 5 ข้อความ (หน้าใหญ่ใช้หลายครั้ง) และยังไม่มีปุ่ม
  "แปลเฉพาะข้อความที่ยังไม่ได้แปล"; i18n ของ **ข้อความ UI ในแอดมิน** และ i18n ของเนื้อหา
  ระดับเมนู/ฟอร์ม/SEO ยังไม่ได้ทำในก้อนนี้ (เนื้อหาหลักทำครบแล้ว)

หมายเหตุการออกแบบ

- เลือก "ภาษาหลักไม่มีคำนำหน้า" เพื่อไม่ให้ URL เดิมของทุกเว็บเปลี่ยน และ middleware
  rewrite `/en/...` กลับเป็น route เดียว จึงไม่ต้องมีสำเนาหน้าจอต่อภาษา
- เลือก `translation_group_id` แบบ nullable แล้วให้ "แถวที่ยังไม่มีคำแปล = กลุ่มของตัวเอง"
  ทำให้ข้อมูลเดิมไม่ต้อง backfill และ query เดิมใช้ได้ทันที (`UNIQUE (site_id, locale, type, slug)` คงอยู่)
- คำแปลจาก AI ลงเป็น **ร่าง** เสมอตาม 17.4 ข้อ 3 และใช้ `collectBlockTexts` แบบ whitelist
  เพื่อไม่ให้ AI ไปแก้ href/รูป/สี
- fallback ไปภาษาหลักเป็นค่าเริ่มต้น (17.4 ข้อ 4) พร้อมป้ายบอกผู้ชม และ canonical ชี้ภาษาตัวเอง
  ส่วน hreflang/x-default ครอบทุกภาษาที่มีจริง
- ยังไม่ทำในก้อนนี้: i18n ข้อความ UI แอดมิน, i18n ของเมนู/ฟอร์ม/SEO, โดเมนย่อยต่อภาษา,
  ตัวสลับภาษาแบบอัตโนมัติจาก `Accept-Language`, แปลเฉพาะข้อความที่ยังว่าง, และ UI กรองภาษาในรายการหน้าเว็บ

## คำสั่งเฉพาะก้อนที่ 18

```bash
pnpm --filter @lumio/shared test          # localePathFor/splitLocalePath/hreflang/coverage/collectBlockTexts
pnpm --filter api test src/modules/contents  # translations + createTranslation (+ AI translate)
pnpm --filter api test src/modules/public     # ภาษาที่ขอ/fallback/translations/sitemap alternates
pnpm --filter @lumio/blocks test              # block ตัวสลับภาษา (+ hreflang/aria-current)
pnpm --filter renderer test                   # splitLocalePath/metadata alternates/PageView หลายภาษา
pnpm --filter admin test                      # LanguageBar/LanguageView/api client/demo
pnpm --filter admin dev                       # ไม่ตั้ง VITE_API_URL = โหมดทดลอง (editor → 🌐 ภาษา)
pnpm --filter api prisma migrate deploy       # เพิ่มคอลัมน์ translation_group_id
psql "$DATABASE_URL" -c "\\d contents"        # ยืนยันคอลัมน์/index
```

ไม่มี env ใหม่ในก้อนนี้ (ใช้ `AI_*` เดิมของก้อนที่ 17 สำหรับ "แปลหน้านี้ด้วย AI";
ตัวสลับภาษาใช้ `locales`/`locale_default` ของตาราง `sites` ที่มีอยู่แล้ว)

## งานที่ทำเสร็จ (ก้อนที่ 16)

ก้อนนี้ปิดงานที่ค้างใน "ก้อนงานถัดไปที่แนะนำ" ของก้อนที่ 15 ทั้ง 5 เรื่อง:
Command Palette, สถิติผู้เข้าชมที่เก็บจริง, App sandbox, สำรอง/กู้คืนทั้งเว็บ และหน้าจอแพ็กเกจ

- **Command Palette (Ctrl/⌘+K)** ตาม [04.3](design/04-ux.md#43-command-palette-ctrl--k):
  `CommandPalette` ใน `packages/ui` (focus/Escape/ลูกศร/Enter, Thai-safe) +
  `shell/commands.ts` + `shell/useCommands.ts` ค้นทั้งคำสั่ง (ไปที่/ทำอะไร) และเนื้อหา
  (ค้นหน้า/บทความผ่าน `ContentApi.list` แบบ debounce) เปิดจากปุ่มค้นหาใน `AdminShell`
- **ตัวเก็บ pageview + Analytics จริง**: `POST /public/:host/collect` (rate limit 240/นาที)
  เขียน `pageviews` ด้วย raw SQL ใน transaction ที่ตั้ง RLS, hash ผู้เข้าชมแบบหมุนรายวัน
  (ไม่เก็บ IP เต็ม; `device`/`country` มาจาก header) · renderer มี `PageViewTracker`
  (client component) ยิง beacon ไป `/api/track` ของตัวเอง แล้ว route handler ส่งต่อฝั่ง server
  (ไม่ต้องเปิด CORS/CSP) — หน้าสถิติของก้อนที่ 15 จึงมีข้อมูลจริงแล้ว
- **App sandbox จริง (iframe + postMessage)**: `POST /site-apps/:appKey/bridge` ตรวจ scope
  ทุก call (`AppBridgeService` + `apps.controller`) · `packages/sdk` เพิ่ม `createBridgeClient`
  / `createBridgeHost`/`answerBridgeRequest` · แอดมินมี `AppSandbox` รัน App ใน
  `sandbox="allow-scripts"` (ไม่มี `allow-same-origin`) พร้อมตัวอย่าง App ฝังใน `srcDoc`
  → เปิดได้จากปุ่ม "เปิดใน sandbox" ในหน้า Apps
- **สำรอง/กู้คืนทั้งเว็บ**: `GET /backup/export` (JSON: เนื้อหา/เมนู/global blocks/เทมเพลตส่วน/
  ฟอร์ม/ผู้ติดตาม + ธีม/การตั้งค่า) และ `POST /backup/import` (merge ไม่ทับของเดิม,
  ข้าม slug ที่มีอยู่ + audit `site.import`) · หน้าตั้งค่า › สำรองข้อมูล มีปุ่มดาวน์โหลด/นำเข้า
- **แพ็กเกจ & การชำระเงิน** (IA 5.1, [18.6-18.7](design/18-deployment.md)):
  ตารางแพ็กเกจ/โควตาใน `packages/shared` (billing), `GET /billing` + `PATCH /billing/plan`
  (เฉพาะเจ้าของเว็บ) คิดโควตาจากข้อมูลจริง (หน้า/ไบต์สื่อ/ทีม) · migration ใหม่ `invoices`
  (RLS) · หน้าจอแสดงโควตาที่ใช้ แพ็กเกจให้เลือก และประวัติการชำระเงิน (gateway จริงเป็นเฟส 3
  จึงออกใบเสร็จสถานะ `pending`)
- แท็บ `billing` เป็น **owner-only** ทั้ง route guard (`isRouteAllowed`) และเมนู (`nav.ts`);
  `AdminClients` เพิ่ม `billing` และตั้งค่า/แพ็กเกจผูกกับ `VITE_API_URL` เหมือนเดิม

ผลการตรวจ: `pnpm lint` · `pnpm typecheck` · `pnpm test` ผ่านทุกแพ็กเกจ
(shared 132, sdk 11, tokens 10, ui 58, blocks 115, renderer 61, admin 257, api 290)

## คำสั่งเฉพาะก้อนที่ 16

```bash
pnpm --filter @lumio/shared test      # command/billing/pageview/backup schemas
pnpm --filter @lumio/ui test          # CommandPalette
pnpm --filter @lumio/sdk test         # bridge client/host
pnpm --filter api test                # billing, backup, app-bridge, public-tracking
pnpm --filter admin test              # commands, BillingPanel, AppSandbox, backup view
pnpm --filter renderer test           # api collectPageview + page beacon
```

การย้ายเครื่อง/โดเมนใหม่ให้ตั้ง `ANALYTICS_HASH_SALT` เป็นค่าสุ่ม (ดู `.env.example`)
เพื่อไม่ให้ hash ผู้เข้าชมคาดเดาได้; ค่าอื่นใช้ของเดิม

## คำสั่งเฉพาะเมนูเติบโต (ก้อนที่ 15)

```bash
pnpm --filter @lumio/shared test      # seoGradeFor/H1/CSV/แคตตาล็อก App
pnpm --filter api test                # seo + analytics + newsletter + apps service
pnpm --filter admin test              # view ทั้ง 4 หน้า + http client + nav/route
pnpm --filter admin dev               # ไม่ตั้ง VITE_API_URL = โหมดทดลอง (เติบโต → SEO/สถิติ/ข่าวสาร/Apps)
curl -H "Authorization: Bearer <token>" -H "X-Site-Id: <siteId>" http://localhost:49100/api/v1/seo/health
```

ไม่มี env ใหม่ในก้อนนี้ (Analytics ใช้ตาราง `pageviews` เดิม, Apps ใช้ตาราง `site_apps` เดิม)

## คำสั่งเฉพาะประวัติ & ถังขยะ (ก้อนที่ 14)

```bash
pnpm --filter @lumio/shared test      # trashPurgeAt/trashDaysLeft/isTrashExpired + version schema
pnpm --filter api test                # contents: archived_at/restore/versions/purge + TrashPurgeProcessor
pnpm --filter admin test              # VersionHistoryPanel + ถังขยะในรายการ + ตั้งค่า backup + api client
pnpm --filter api start:worker        # worker ที่กวาดถังขยะ (ต้อง build ก่อน)
node -e "console.log(require('@lumio/shared').CONTENT_TRASH_RETENTION_DAYS)"   # 30
```

env ที่ก้อนนี้เพิ่ม (ดู `.env.example`): `TRASH_PURGE_INTERVAL_MINUTES` (ค่าเริ่มต้น 1440 = วันละครั้ง),
`TRASH_PURGE_INLINE` (ค่าเริ่มต้น false — ให้ worker เป็นคนกวาด)

## คำสั่งเฉพาะฟอร์ม (ก้อนที่ 13)

```bash
pnpm --filter @lumio/shared test      # formField/validation/honeypot
pnpm --filter @lumio/blocks test      # block ฟอร์ม + panel picker
pnpm --filter api test -- forms       # forms service (CRUD/submissions/public submit/notifier)
pnpm --filter admin test              # หน้าฟอร์ม + api client + ตัวสร้างช่อง
pnpm --filter renderer test           # form-return + form-submit + PageView ที่มีฟอร์ม
pnpm --filter admin dev               # ไม่ตั้ง VITE_API_URL = โหมดทดลอง (login → เนื้อหา → ฟอร์ม & ข้อความ)
```

ไม่มี env ใหม่ในก้อนนี้ (LINE token ตั้งต่อฟอร์มในหน้าจอ ไม่ใช่ env)

## คำสั่งเฉพาะหน้าจอหลังบ้าน (ก้อนที่ 12)

```bash
pnpm --filter admin test              # shell/nav/DashboardView/ContentView/Settings views + api clients
pnpm --filter admin dev               # ไม่ตั้ง VITE_API_URL = โหมดทดลอง (login → dashboard → ดีไซน์ → ตั้งค่า)
pnpm --filter api test                # dashboard + global-blocks + domains + section-template rename
pnpm --filter api start:worker        # ยังต้อง build ก่อน (publish/media job)
curl -H "Authorization: Bearer <token>" -H "X-Site-Id: <siteId>" http://localhost:49100/api/v1/dashboard
```

ไม่มี env ใหม่ในก้อนนี้ (โดเมนใช้ `PUBLIC_ROOT_DOMAIN` เดิมในการเทียบ CNAME)

## คำสั่งเฉพาะ security hardening (ก้อนที่ 11)

```bash
pnpm audit                       # ควรเหลือ 2 (braces, @nestjs/core)
pnpm --filter api test           # store, guard, origin, headers, trust-proxy, lockout
pnpm --filter renderer test      # csp + secret constant-time
pnpm --filter renderer build     # ยืนยัน middleware + next 15 ผ่าน
REDIS_URL=redis://localhost:49537 pnpm --filter api dev   # ใช้ Redis store จริง
```

## คำสั่งเฉพาะ wizard + templates (ก้อนที่ 9)

```bash
node templates/generate-previews.mjs          # สร้างภาพตัวอย่างจากสีของแต่ละ pack
pnpm --filter api test                        # template store + design + menus + section templates + wizard
pnpm --filter admin test                      # login, wizard, route, editor sections
pnpm --filter admin dev                       # ไม่ตั้ง VITE_API_URL = โหมดทดลอง (login → wizard → editor)
pnpm --filter renderer dev                    # ดูธีม/โลโก้/global blocks ของเว็บตัวอย่าง
```

env ที่ก้อนนี้เพิ่ม (ดู `.env.example`): `TEMPLATES_DIR` (ไม่ตั้ง = หาเองจากโครง repo) และ
`VITE_PUBLIC_ROOT_DOMAIN` (โดเมนที่ปุ่ม "เปิดดูเว็บของฉัน" ชี้ไป)

สิ่งที่ยังไม่ทำในก้อนที่ 9 (ตั้งใจเลื่อน):

- **หน้าจอดีไซน์เต็มรูปแบบ** (แก้สี/ฟอนต์/มุมโค้ง/Header-Footer/เมนู ในเมนู "ดีไซน์" ตาม IA 5.1):
  API พร้อมแล้ว (`/design/tokens`, `/design/template/:id/apply`, `/menus/:location`)
  แต่ UI ยังมีแค่ตอนสร้างเว็บ — ควรทำเป็นก้อนถัดไปพร้อมหน้า Dashboard
- **Dashboard + Checklist เริ่มต้น 6 ข้อ** (หัวข้อ 4.1/5.2) ยังไม่มีหน้าจอ (route ปัจจุบันเข้า editor ตรง)
- **AI เติมข้อความ/สร้างพาเลทจากโลโก้** (ขั้น 4 ของ wizard) ยังใช้พาเลทสำเร็จรูปกับสีที่ผู้ใช้เลือก
- **หน้ารวมเทมเพลตส่วนที่บันทึกไว้** (แก้ชื่อ/ลบ/จัดหมวด): มี API + แทรกได้จากเมนู `/` แล้ว
  แต่ยังไม่มีหน้าจอจัดการในเมนู "ดีไซน์"
- **เปลี่ยนเทมเพลตของเว็บที่มีเนื้อหาอยู่แล้ว**: API รองรับแล้ว แต่ยังไม่มีปุ่ม/หน้ายืนยันใน admin
- ยังไม่มี test ระดับ HTTP (supertest) ของ route ใหม่ ๆ — ใช้ guard ชุดเดิมที่มี test อยู่แล้ว

## คำสั่งตรวจสอบ

````bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```## คำสั่งเฉพาะ block (ก้อนที่ 5)

```bash
pnpm --filter @lumio/blocks test
pnpm --filter @lumio/blocks typecheck
pnpm --filter renderer build
````

## คำสั่งเฉพาะ editor (ก้อนที่ 6)

```bash
pnpm --filter admin test
pnpm --filter api test          # contents service (ไม่ต้องมี DB ก็รันได้)
pnpm --filter admin dev         # เปิด editor ด้วย demo API ที่ http://localhost:49300
```

## คำสั่งเฉพาะ renderer + publish (ก้อนที่ 7)

```bash
pnpm --filter renderer test
pnpm --filter renderer build          # ตรวจ JS/CSS ที่ส่งหน้า public
pnpm --filter renderer dev            # ไม่ตั้ง NEXT_PUBLIC_API_URL = ใช้ demo site ในตัว
pnpm --filter api test                # public service + publish pipeline (ไม่ต้องมี DB)
pnpm --filter api dev                 # API ที่ http://localhost:49100/api
pnpm --filter api start:worker        # worker ที่ consume publish job (ต้อง build ก่อน)
```

env ที่ก้อนนี้เพิ่ม (ดู `.env.example`): `PUBLIC_ROOT_DOMAIN`, `PUBLIC_DEFAULT_SITE`,
`MEDIA_PUBLIC_BASE_URL`, `RENDERER_URL`, `REVALIDATE_SECRET`, `PUBLISH_INLINE`

## คำสั่งเฉพาะ media (ก้อนที่ 8)

```bash
pnpm --filter api test                # media service/storage/processor + integration (ต้องมี DB)
pnpm --filter api test -- media       # เฉพาะไฟล์ที่เกี่ยวกับ media
pnpm --filter admin test              # คลังรูป + media api client
pnpm --filter admin dev               # เปิด editor + คลังรูป (demo) ที่ http://localhost:49300
pnpm --filter api start:worker        # worker ที่สร้าง WebP/AVIF (ต้อง build ก่อน)
packages/blocks typecheck             # block ส่ง srcSet ให้ Img แล้ว
```

env ที่ก้อนนี้เพิ่ม (ดู `.env.example`): `API_PUBLIC_URL`, `MEDIA_STORAGE`, `MEDIA_LOCAL_DIR`,
`MEDIA_UPLOAD_SECRET`, `MEDIA_UPLOAD_TTL_MINUTES`, `MEDIA_INLINE` (และเปลี่ยนความหมายของ
`MEDIA_PUBLIC_BASE_URL` เป็น "ไม่ตั้ง = ใช้ `/media` ของ API เอง")

ลองทั้ง flow ด้วยมือ (dev): `POST /api/v1/media/presign` → เอา `uploadUrl` ไป `PUT` ไฟล์ →
`POST /api/v1/media/:mediaId/confirm` → รอ worker/API drain แล้ว `GET /api/v1/media`
ทุก call ต้องมี `Authorization: Bearer …` และ `X-Site-Id` (ยกเว้นตัว `PUT uploadUrl` ที่ไม่ต้องมี)

## คำสั่งเฉพาะ security review (ก้อนที่ 10)

```bash
pnpm audit --audit-level=high        # รายการช่องโหว่ dependency (ดูวิธีแก้ใน 23-security-review.md)
pnpm --filter @lumio/shared test     # isSafeLink + safeLinkSchema + เมนูที่ href ไม่ปลอดภัย
pnpm --filter @lumio/blocks test     # ปุ่มที่ href เป็น javascript: ต้องถอยไปใช้ค่า default
pnpm lint && pnpm typecheck && pnpm test
```

## งานฐานข้อมูล (ก้อนที่ 2)

```bash
docker compose up -d db
pnpm db:migrate     # prisma migrate deploy
pnpm db:seed        # ข้อมูลตัวอย่าง
pnpm --filter api test   # ต้องมี DATABASE_URL จึงจะรัน test RLS
```

## คำสั่ง Storybook (ก้อนที่ 3)

```bash
pnpm --filter @lumio/ui storybook         # เปิดที่ http://localhost:49800
pnpm --filter @lumio/ui build-storybook   # สร้าง static ลง packages/ui/storybook-static
```

## งานที่ทำเสร็จ (ก้อนที่ 19)

i18n ต่อจากก้อนที่ 18 — เครื่องมือแปลเนื้อหาและตัวกรองภาษา ตามที่ PROGRESS ของก้อนที่ 18
ระบุว่า "ยังไม่มีปุ่ม 'แปลเฉพาะข้อความที่ยังไม่ได้แปล' และ UI กรองภาษาในรายการหน้าเว็บ"

กติกาของก้อนนี้: **ผู้ช่วย AI แปลได้ แต่ไม่เขียนข้อมูลเอง** — API คืน block tree ที่แปลแล้ว
ให้ editor นำไปใช้เป็น **หนึ่งขั้น undo** แล้ว autosave จึงบันทึก (เหมือนก้อนที่ 17)

- `packages/shared` — `i18n.ts`:
  - `missingTranslationIndexes(current, source)` — ตำแหน่งข้อความที่ยัง "เหมือนภาษาต้นฉบับ"
    หรือว่าง (ตำแหน่งที่ต้นฉบับไม่มีก็นับเป็นยังไม่แปล) เพื่อให้กดซ้ำแล้วเติมเฉพาะที่ขาด
  - `translateContentInputSchema` (`onlyMissing` ค่าเริ่มต้น true) และ `TranslateContentResult`
    (`translatedCount`/`totalCount`/`blocks`)
- `apps/api` `ContentsService.translateContent` + `POST /contents/:contentId/translate-content`
  (guard 3 ชั้น + `@Roles` ชุดเขียน, ทุก query อยู่ใน `forSite` = RLS):
  - กันแปลภาษาหลัก (409) และภาษาที่ผู้ช่วยยังไม่รองรับ (400), ข้ามข้อความที่แปลแล้ว,
    นับโควตา AI จริงผ่าน `AiService.translateTexts` และบันทึก audit `content.translate-texts`
  - **ไม่เขียนฐานข้อมูล** — คืน block tree ให้ editor ตัดสินใจ
- `apps/admin`:
  - `ContentApi.translateContent` (HTTP + demo ที่ติดป้าย `(en)` แทนการเรียก AI)
  - `LanguageBar` มีปุ่ม **✨ แปลข้อความที่เหลือ** (โผล่เฉพาะหน้าที่ไม่ใช่ภาษาหลัก, แสดง "กำลังแปล…"
    ระหว่างทำงาน) → `EditorPage` นำผลไปใช้ผ่าน reducer action ใหม่ `translate-blocks`
    (`useEditor.replaceBlocks`) เป็น undo ขั้นเดียว พร้อม toast บอกจำนวนข้อความที่แปล
  - รายการหน้าเว็บ/บทความ: **ตัวกรองภาษา** + ป้ายภาษาต่อแถว (แสดงเฉพาะเว็บที่เปิดมากกว่าหนึ่งภาษา)
    โดยส่ง `locales` จาก `ShellContext` (มาจาก `site.locales`)
- Test ใหม่ 21 เคส — รวมทั้งโปรเจกต์ **1,101 เคส**
  (shared 173, tokens 10, sdk 11, ui 58, blocks 119, api 353, admin 305, renderer 72)
  - shared: `missingTranslationIndexes` (ว่าง/เหมือนต้นฉบับ/เลยท้ายต้นฉบับ) + schema
  - api: `translateContent` (แปลและคืน tree/ข้ามข้อความที่แปลแล้ว/`onlyMissing:false`/audit/
    กันภาษาหลัก/กันภาษาที่ไม่รองรับ/ข้ามเว็บ = not_found)
  - admin: reducer `translate-blocks`, ปุ่มบน `LanguageBarView`, ตัวกรองภาษา + ป้ายภาษา,
    http client และ demo client
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด

ผลจาก security review ของก้อนนี้ (ใช้สกิล `lumio-security-review`):

- ผ่าน: Zod ทุก input (`translateContentInputSchema`), ทุก query อยู่ใน `forSite` (RLS)
  จึงกัน IDOR/ข้ามเว็บของ `:contentId` และมี test ข้ามเว็บ, `@Roles(...WRITE_ROLES)`,
  ไม่มี endpoint สาธารณะใหม่ (จึงไม่เพิ่ม rate limit), ไม่มี SSRF (URL ของ AI มาจาก env),
  ไม่มี secret ในโค้ด/log, ข้อความที่แปลไม่ถูก render เป็น HTML (เป็น prop ข้อความธรรมดา),
  ส่งให้ผู้ช่วยเฉพาะข้อความของหน้านั้น (ไม่ส่งข้อมูลฟอร์ม/ลูกค้า),
  `pnpm audit` ยังเหลือ 2 (braces, @nestjs/core) เท่าเดิม — ไม่มีช่องโหว่ใหม่จากก้อนนี้
- ควรแก้ (ยกไปก้อนถัดไป): ยังไม่มี test ระดับ HTTP (supertest) ของ route ใหม่ และยังไม่มี
  เพดานความยาวข้อความที่ผู้ช่วยตอบกลับก่อนนำไปใช้

หมายเหตุการออกแบบ

- นิยาม "ยังไม่ได้แปล" = ข้อความว่าง หรือเหมือนภาษาต้นฉบับในตำแหน่งเดียวกัน (จับคู่ตามลำดับของ
  `collectBlockTexts` ซึ่งใช้ walker ตัวเดียวกับ `mapBlockTexts`) — ถ้าโครงสร้างถูกแก้ไปมาก
  จะถือว่ายังไม่แปล เพื่อไม่ข้ามข้อความของผู้ใช้
- เลือกให้ API ไม่บันทึกเอง เพื่อให้ผู้ใช้เห็นผลก่อน แล้ว Ctrl+Z ย้อนได้ทั้งชุด (กติกาเหล็กข้อ 5)
- กดซ้ำได้: ครั้งต่อไปข้อความที่แปลแล้วจะต่างจากต้นฉบับ จึงถูกข้ามและรายงานว่าแปลครบแล้ว

## คำสั่งเฉพาะก้อนที่ 19

```bash
pnpm --filter @lumio/shared test              # missingTranslationIndexes/translateContentInputSchema
pnpm --filter api test src/modules/contents   # translateContent (แปล/ข้าม/กันภาษาหลัก/ข้ามเว็บ)
pnpm --filter admin test                      # LanguageBar/ตัวกรองภาษา/state/demo/api client
pnpm --filter admin dev                       # ไม่ตั้ง VITE_API_URL = โหมดทดลอง (editor → 🌐 → ✨ แปลข้อความที่เหลือ)
```

ไม่มี env ใหม่ในก้อนนี้ (ใช้ `AI_*` เดิมของก้อนที่ 17)
หมายเหตุ: engine ในเครื่อง (ค่าเริ่มต้น) **ปฏิเสธการแปล** อย่างตรงไปตรงมา จึงต้องตั้ง `AI_PROVIDER=openai`
พร้อม key จึงจะเห็นผลจริง; โหมดทดลองของแอดมินใช้ผู้ช่วยจำลองที่ติดป้าย `(en)` แทน

## งานที่ทำเสร็จ (ก้อนที่ 20)

ก้อนนี้ปิดงานที่ค้างใน "ก้อนงานถัดไปที่แนะนำ" ของก้อนที่ 19 สี่เรื่อง: **เทสต์ระดับ HTTP,
S3/MinIO จริง, BullMQ จริง และ i18n ฝั่งเว็บให้ครบ** พร้อมกับปิดช่องโหว่ที่เทสต์ใหม่เจอ

- **เทสต์ระดับ HTTP (supertest-free)** — `apps/api/src/http/api.spec.ts` (17 เคส):
  บูต `AppModule` จริงบนพอร์ตว่างแล้วคุยด้วย `fetch` ยืนยัน security header ทุก response
  (รวม error), CSRF allow-list, rate limit 10/นาที → 429, 401/403 ของ Auth/Site/Roles,
  cookie ของ refresh, `Cache-Control` + ETag → 304 และ validation ของ beacon
  - เพื่อให้ Nest DI ทำงานใต้ vitest: เพิ่ม `apps/api/vitest.config.ts` + `unplugin-swc`
    (`@swc/core`) เพราะ esbuild ไม่ปล่อย `design:paramtypes` ทำให้ทุก provider ถูกสร้าง
    โดยไม่มี dependency (เทสต์เดิมผ่านได้เพราะไม่เคยประกอบ DI จริง)
  - เทสต์ใหม่เจอบั๊กจริง: `PublicCacheInterceptor` คืน `EMPTY` แล้ว `lastValueFrom` โยน
    `EmptyError` → filter พยายามตอบ 500 ทับ response ที่ `end()` ไปแล้ว
    (`ERR_HTTP_HEADERS_SENT`) → แก้ด้วย `NotModifiedException` + ให้ filter ตอบ 304 เปล่า ๆ
    (`common/not-modified.ts`)
- **S3/MinIO driver จริง** — `media.s3.storage.ts` (`@aws-sdk/client-s3` +
  `s3-request-presigner`): presign `PutObject` ที่ผูก `ContentType`, `put/read/size/remove`,
  `readHead` ด้วย `Range` และเลือก driver จาก `MEDIA_STORAGE=s3` ผ่าน `createMediaStorage()`
  - `MediaStorage.presign` กลายเป็น async และเพิ่ม `readHead` (local อ่านไม่กี่ไบต์แรก)
  - `MediaService.confirm` ตรวจ **ขนาดจริงกับ magic bytes** ก่อนรับรูป (presigned PUT
    กำหนดขนาด/ชนิดเองไม่ได้) แล้วลบไฟล์ทิ้งถ้าไม่ผ่าน — ปิดช่อง "upload abuse" ของ S3
  - `s3Settings()` ปฏิเสธการสตาร์ทถ้าตั้ง `MEDIA_STORAGE=s3` แต่ขาด `S3_*`
- **BullMQ จริง** — `common/job-queue.ts` (สัญญากลาง + `InMemoryJobQueue`) และ
  `common/bullmq-queue.ts` (`BullMqJobQueue` + `createJobQueue`): `QUEUE_DRIVER=bullmq`
  ใช้ Redis เป็นคิวร่วม (attempts 3 + backoff, ชื่อคิวถูก sanitize เพราะ BullMQ ห้าม `:`),
  `consume()` เป็น push ผ่าน `Worker` ส่วน `take()` เป็น null, ล้มเหลวถูกจำไว้ ≤ 100 รายการ
  และ fallback ลง memory ได้; `PublishProcessor`/`MediaProcessor` เปลี่ยนไปใช้ `consume()`
  (ยังคง `drain()` ไว้ให้เทสต์) และ `worker.ts` บูตคิวตาม driver
  - ตรวจกับ Redis จริงแล้ว: `add` → worker รับงาน → handler ทำงาน (สคริปต์ชั่วคราว, ลบแล้ว)
- **i18n ฝั่งเว็บให้ครบ**
  - `packages/shared`: `locale.ts` แยกเป็น leaf module (ตัด circular import ที่ทำให้
    `forms.ts` อ่าน `localeSchema` ไม่ได้), `parseAcceptLanguage`/`negotiateLocale`/
    `splitLocaleHost` + `publicLocalesSchema`
  - `menus.locale` + `forms.locale`/`forms.translation_group_id`
    (migration `20261028000000_locale_menus_forms`: partial unique index สำหรับเมนูที่ใช้ร่วม
    ทุกภาษา) — ค่า `NULL` = ใช้ร่วมทุกภาษา จึงไม่ต้อง backfill
  - API: `GET /v1/public/:host/locales` (ให้ middleware รู้ว่าภาษาไหนมีจริง),
    เมนู/ฟอร์มเลือกตามภาษา (ภาษาเฉพาะ > ใช้ร่วม), ฟอร์มสลับเป็นภาษาที่ขอผ่าน
    `translation_group_id`, โดเมนย่อยต่อภาษา (`en.site.com`) และ
    `GET/PUT /v1/menus/:location?locale=`, `POST /v1/forms/:formId/locale`
  - renderer: middleware เจรจาภาษาจาก `Accept-Language` **เฉพาะภาษาที่เว็บมี**
    (ผ่าน `lib/site-locales.ts` ที่แคช 5 นาที + `lib/accept-language.ts` ที่ทดสอบแยกได้),
    รองรับซับโดเมนภาษา, ไม่ redirect prefetch/คำขอที่ไม่ใช่ HTML และยัง canonicalise
    `/th/...` เป็น 307/308 เหมือนเดิม
  - admin: เมนูนำทางมีแท็บภาษา ("ใช้ร่วมทุกภาษา" + ภาษาของเว็บ), ฟอร์มมีป้ายภาษาต่อแถว +
    ปุ่ม "แปลเป็นภาษาอื่น" (คัดลอกช่องให้แปล, กล่องข้อความยังรวมที่เดียว)
- **AI ต่อ** — cache บน Redis (`RedisAiCache`, interface เป็น async + fallback memory),
  `POST /ai/alt-text/batch` (ทุกรูปที่ยังไม่มีคำอธิบาย, นับโควตาตามจำนวนรูปจริง, ข้ามรูปที่มีอยู่แล้ว),
  `POST /ai/generate-site` (ร่างประเภทธุรกิจ/ชื่อ/สไตล์/พาเลท/หน้า 4-5 หน้า — ผู้ช่วยเสนอ
  ผู้ใช้ยืนยัน) และปุ่มในแอดมิน: "✨ ใส่คำอธิบายให้รูปที่ยังไม่มี" ในคลังรูป และ
  "✨ ให้ผู้ช่วยร่างให้" ในขั้นที่ 1 ของ wizard
- **ลดเสียงรบกวนใน log**: `RedisRateLimitStore`/`RedisAiCache` รายงาน Redis ล่มครั้งเดียว
  ไม่ใช่ทุกครั้งที่ ioredis reconnect
- **pnpm/CI**: ตั้ง `packageManager: pnpm@11.18.0` (ตรงกับ CI) เพราะ pnpm 10 อ่าน store v11
  ไม่ได้ ทำให้คำสั่งติดตั้งทั้งหมดพัง; `msgpackr-extract: false` ใน `allowBuilds`
  (msgpackr ใช้ JS แทนได้ ไม่ต้องคอมไพล์ native)
- env ที่เพิ่ม (ดู `.env.example`): `QUEUE_DRIVER` (`memory` ค่าเริ่มต้น / `bullmq`)
- **i18n ข้อความ UI ของแอดมิน — กลไก + หน้าจอแรก** (`packages/ui/src/i18n.tsx`):
  - แคตตาล็อกกลาง `TH_MESSAGES` (ต้นฉบับ) + `EN_MESSAGES` (เสริม) + `createTranslator(locale)`,
    `interpolate('{name}')`, `MessagesProvider`/`useT()` — **ไม่มี provider = ไทย** เทสต์เดิม
    จึงยังยืนยันข้อความไทยได้เหมือนเดิม และคีย์ที่ยังไม่แปลถอยไปใช้ไทย (ไม่โชว์คีย์ดิบ
    หน้าจอจึงไม่ครึ่งไทยครึ่งอังกฤษ)
  - UI kit ใช้ตัวแปลกับค่าปริยายที่มันเป็นเจ้าของ: ปุ่มปิดของ Modal/Drawer, ปุ่มปิด Banner,
    ป้าย/aria ของ Pagination, Breadcrumb, CommandPalette (placeholder/empty), ColorPicker,
    ImagePicker, LinkPicker; `groupCommands()` ใน shared รับป้ายกำกับที่แปลแล้วได้
  - admin: เมนูทั้ง 5 (`shell/nav.ts`) เปลี่ยนจากข้อความ → `labelKey`, `AdminShell` แปลทุกข้อความ
    (รวม aria ของ landmark), command palette ทั้งชุด (ป้าย/คำค้น/ป้ายกลุ่ม) แปลตามภาษา และมี
    **ปุ่มสลับภาษา** บนท็อปบาร์ (จำค่าใน `localStorage` ผ่าน `shell/locale-preference.ts`)
    · หน้า **Dashboard** แปลครบทั้งหน้า (ปุ่มลัด/แนวโน้ม/คะแนนสุขภาพ/checklist)
  - หน้าจอที่ยังเหลือ (ยังเป็นไทยล้วน ไม่ครึ่ง ๆ): editor + แผงข้าง, คลังรูป, รายการหน้าเว็บ/บทความ,
    ฟอร์ม & ข้อความ, ดีไซน์ 5 แท็บ, เติบโต 4 หน้า, ตั้งค่า 5 แท็บ, wizard, หน้า login —
    วิธีทำต่อ: เพิ่มคีย์ใน `packages/ui/src/i18n.tsx` แล้วเรียก `useT()` ในไฟล์นั้น
- Test ใหม่ 132 เคส (จาก 1,101 เป็น **1,233 เคส** รวม 15 เคสที่ต้องมี DB)
  (shared 183, tokens 10, sdk 11, ui 67, blocks 119, api 431, admin 325, renderer 87)
  - ใหม่ในรอบ i18n: แคตตาล็อกครบ/ถอยไปไทย/`interpolate`/`MessagesProvider` (ui 9),
    เมนู+palette ตามภาษา, ปุ่มสลับภาษา, การจำภาษา, AdminShell ภาษาอังกฤษ, Dashboard อังกฤษ (admin 12)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  · บูต `node apps/api/dist/main.js` บน DB+Redis จริง: route ใหม่ครบ
  (`/v1/public/:host/locales`, `/v1/ai/alt-text/batch`, `/v1/ai/generate-site`,
  `/v1/forms/:formId/locale`) และยิงจริงได้ `200 / 404 / 200+ETag / 304` ตามคาด

ผลจาก security review ของก้อนนี้ (ใช้สกิล `lumio-security-review`):

- ผ่าน: Zod ทุก input (`aiAltTextBatchInputSchema`, `aiGenerateSiteInputSchema`,
  `updateMenuInputSchema.locale`, `copyFormToLocaleInputSchema`), ทุก query อยู่ใน `forSite`
  (RLS) และมีเทสต์ข้ามเว็บ, `@Roles` ทุก route ใหม่, endpoint สาธารณะใหม่
  (`/public/:host/locales`) มี rate limit + cache, `Accept-Language` ถูก parse แบบกันพัง
  (ค่าเสียหายไม่ทำให้พังหรือ redirect ผิด), โดเมนย่อยภาษาถูกยอมรับเฉพาะเมื่อเว็บมีภาษานั้นจริง,
  presigned PUT ของ S3 ถูกตรวจซ้ำที่ `confirm` (ขนาด + magic bytes) แล้วลบของที่ไม่ผ่าน,
  ไม่มี secret ในโค้ด/log (`s3Settings` บอกชื่อ env ไม่บอกค่า)
- ควรแก้ (ยกไปก้อนถัดไป): ยังไม่มี test ระดับ HTTP ที่รันกับ DB จริง (ชุดใหม่ใช้ service
  ที่ override), S3/MinIO ยังทดสอบผ่าน stub ของ SDK (ยังไม่เคยยิง MinIO จริงใน CI),
  BullMQ ยังไม่มี dead-letter/UI และ `QUEUE_DRIVER=bullmq` ยังไม่ถูกทดสอบใน CI

หมายเหตุการออกแบบ

- เลือก "S3 presign ตรง + ตรวจซ้ำที่ confirm" แทน POST policy เพราะ client เดิมใช้ PUT อยู่แล้ว
  และการตรวจที่ confirm ใช้ได้ทั้งสอง driver
- คิวใหม่ยังคงสัญญา `add/take/complete/fail` ไว้ (memory driver ใช้จริง) แล้วเพิ่ม `consume()`
  เป็นครึ่ง push เพื่อให้ BullMQ เข้ามาแทนได้โดยไม่ต้องรื้อ service
- เมนู/ฟอร์มใช้ `NULL = ใช้ร่วมทุกภาษา` เพื่อไม่ต้อง backfill และให้เว็บภาษาเดียวไม่เห็นความซับซ้อน
- middleware แคชรายการภาษาต่อ host 5 นาที เพราะ edge ไม่ควรยิง API ทุกครั้งที่เปิดหน้า

## งานที่ทำเสร็จ (ก้อนที่ 21)

ก้อนนี้ปิดงาน i18n ข้อความ UI ของแอดมินให้ครบทุกหน้าจอที่เหลือจากก้อนที่ 20 (เดิมเหลือ ~60 ไฟล์
ที่ยังเป็นไทยล้วน) โดยไม่ให้หน้าจอไหนกลายเป็นครึ่งไทยครึ่งอังกฤษ

- **กลไกใน `packages/ui/src/i18n.tsx`**
  - เพิ่มคีย์ไทย/อังกฤษอีก ~450 คีย์ ครอบคลุมทุกหน้าจอ (ชื่อคีย์ขึ้นต้นด้วยโมดูล: `editor.`,
    `media.`, `forms.`, `design.`, `menus.`, `headerFooter.`, `sections.`, `template.`,
    `analytics.`, `seo.`, `newsletter.`, `apps.`, `settings.`, `billing.`, `wizard.`,
    `auth.`, `ai.`, `demo.`) — คีย์ที่ยังไม่แปลยังถอยไปใช้ไทยเหมือนเดิม
  - **`translateNow(key, params)`** สำหรับข้อความที่เกิดนอก React (fallback ของ API client,
    ป้ายผู้ให้บริการ AI, ข้อความโหมดทดลอง) ใช้ภาษาของ provider ที่ mount อยู่ และ **ซิงก์ค่า
    ระหว่าง render ไม่ใช่ใน effect** เพื่อให้ข้อความแรก (รวม SSR/static render และเทสต์) ถูกภาษา
    ตั้งแต่ paint แรก
  - **memoise translator ต่อภาษา** ใน `MessagesProvider`: ก่อนหน้านี้ `t` ถูกสร้างใหม่ทุก
    render ทำให้ `useCallback`/`useEffect` ที่อ้าง `t` วนซ้ำ (hook โหลดข้อมูลจะยิง API ไม่หยุด)
- **หน้าจอที่แปลครบ**: editor (toolbar/inspector/canvas/slash menu/language bar/version
  history/`useEditor`/`fields.ts`) · คลังรูป + picker + ข้อความตรวจไฟล์ · ฟอร์ม & กล่องข้อความ
  - dialog แก้ฟอร์ม · ดีไซน์ 5 แท็บ (สไตล์/เมนู/Header-Footer/เทมเพลต/เทมเพลตส่วน) · เติบโต 4 หน้า
    (SEO/สถิติ/ข่าวสาร/Apps + sandbox) · ตั้งค่า 6 แท็บ (ทั่วไป/ภาษา/โดเมน/ทีมงาน/สำรอง/แพ็กเกจ) ·
    wizard 5 ขั้น + สรุป + ร่างด้วย AI · หน้า login · ผู้ช่วย AI + diff dialog · toast ของรายการ
    หน้าเว็บ/บทความ · ข้อความ error ในโหมดทดลอง
- **ป้ายที่เคยอ่านจาก `@lumio/shared`** ถูกแมปเป็นคีย์ในหน้าจอ: `BUSINESS_TYPE_LABELS`,
  `FORM_SUBMISSION_STATUS_LABELS`, `SUBSCRIBER_STATUS_LABELS`, `SEO_GRADE_LABELS`,
  `ANALYTICS_RANGE_LABELS`, `THEME_*` (รัศมี/ปุ่ม/ความแน่น/โหมดสี/อนิเมชัน), `APP_CATEGORY_LABELS`,
  `APP_PERMISSION_LABELS`, `APP_BRIDGE_METHOD_LABELS`, `INVOICE_STATUS_LABELS` และ `ROLES`
  (ของเดิมใน shared ยังอยู่ เพื่อไม่กระทบผู้ใช้รายอื่น) และ `labelForPath()` รับ translator ได้
- **wizard `steps.ts`** เปลี่ยน `title`/`hint` เป็น `titleKey`/`hintKey` และ `checkStep()`
  คืน `messageKey` (ตรรกะยัง pure และเทสต์เดิมยังผ่าน)
- **ขอบเขตที่ตั้งใจไม่แปล**: ข้อความที่มาจากเซิร์ฟเวอร์หรือเป็นข้อมูลตัวอย่าง — ชื่อ/ฟีเจอร์แพ็กเกจ
  (`PLAN_DEFINITIONS`), ป้ายรายการตรวจ SEO ที่ API ส่งมา, เนื้อหาเดโม (ชื่อร้าน หน้าเว็บ ข้อความ
  ในกล่องข้อความ) เพราะต้องให้ API รู้ภาษาของผู้ใช้ก่อน (ยกเป็นงานถัดไป)
- **Test ใหม่ 16 เคส**: `apps/admin/src/i18n-screens.test.tsx` เรนเดอร์ทุกหน้าจอด้วย
  `MessagesProvider locale="en"` แล้วยืนยันว่า chrome เป็นอังกฤษจริง (editor, version history,
  คลังรูป, ฟอร์ม, design, SEO, สถิติ, ข่าวสาร, Apps, ตั้งค่า, ดีไซน์, wizard, login, AI diff)
  และ `packages/ui/src/i18n.test.tsx` ยืนยันว่า `translateNow` ตามภาษา provider (สลับไป-กลับได้)
  รวมทั้ง repo: **1,250 เคส** (shared 183, tokens 10, sdk 11, ui 68, blocks 119, api 431,
  admin 341, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  (admin bundle 592 kB → 163 kB gzip; ไม่มีคีย์ใหม่หลุดเป็นข้อความดิบ)

## คำสั่งเฉพาะก้อนที่ 21

```bash
pnpm --filter @lumio/ui test       # แคตตาล็อกครบ/ถอยไปไทย/interpolate/translateNow
pnpm --filter admin test           # ทุกหน้าจอ + ชุด i18n-screens (เรนเดอร์อังกฤษ)
pnpm --filter admin dev            # สลับภาษาที่ท็อปบาร์ แล้วเดินครบทุกเมนู
```

หมายเหตุ: การเพิ่มข้อความ UI ใหม่ให้เพิ่มคีย์ใน `TH_MESSAGES` และ `EN_MESSAGES` พร้อมกัน
(มีเทสต์บังคับว่า EN ต้องไม่หลุดจาก TH) และถ้าข้อความนั้นเกิดนอก React ให้ใช้ `translateNow`

## งานที่ทำเสร็จ (ก้อนที่ 22)

ปิดงานค้าง 4 อย่าง: ข้อความที่ API ส่งมา, ชื่อบล็อกใน slash menu, Nest 11 และผู้ช่วย AI
สั่งงานภาพรวมทั้งเว็บ

- **ภาษาไทย/อังกฤษของข้อความที่มาจาก API** (`apps/api` + `packages/shared`):
  - `api-locale.ts`: `resolveApiLocale()` อ่าน `X-Locale` (ที่แอดมินส่ง) หรือ `Accept-Language`
    ตาม q-value และถอยเป็นไทยเมื่อค่าเสียหาย; `RequestLocale()` decorator ใช้ที่ controller
  - ป้ายที่ผลิตจากเซิร์ฟเวอร์แปลตามภาษาแล้ว: ชื่อ/ฟีเจอร์แพ็กเกจ + ใบเสร็จ (`billing`),
    รายการตรวจ SEO + ชื่อรูป fallback (`seo`), ชื่อ/คำอธิบาย App (`apps`), checklist +
    health issues (`dashboard`), ป้ายอุปกรณ์ (`analytics`), ป้าย diff ของผู้ช่วย AI (`ai`)
  - แอดมินส่ง `X-Locale` จากทุก HTTP client (billing/growth/dashboard/ai) และโหลดใหม่เมื่อ
    สลับภาษา (`useUiLocale()` ใหม่ใน `@lumio/ui`); โหมดเดโมก็แปลตามภาษาเช่นกัน
- **i18n ชื่อบล็อก**: `labelEn` ใน `BlockDefinition` + `listBlockCatalog(registry, locale)` +
  ป้ายหมวดภาษาอังกฤษ; slash menu และ Header/Footer ใช้ภาษาปัจจุบัน และค้นหาได้ทั้งสองภาษา
  (`labelTh` + `labelEn`)
- **Nest 11**: `@nestjs/core|common|platform-express|testing` 11.2.7, CLI/Schematics 11.x,
  `@types/express` 5; `pnpm audit --prod` ไม่เหลือช่องโหว่
- **AI สั่งงานภาพรวม**: `POST /ai/site-command` + `themeCommandFromInstruction()` แปลงประโยค
  (“เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม”, “ทำมุมให้โค้งขึ้น”) เป็น design-token patch + inverse patch;
  ผู้ช่วยเสนอ diff ให้กดนำไปใช้ (ผ่าน design API) และเลิกทำได้ด้วย inverse patch; provider
  local ทำงานได้โดยไม่ต้องมี key, provider OpenAI ใช้ patch ที่ผ่าน schema ก่อน (ไม่ผ่านถอยไป parser)
- Test ใหม่ 39 เคส: shared 22 (api-locale, theme-command, label catalogs), blocks 3
  (catalog EN/search), api 7 (locale ใน billing/seo/apps/dashboard/analytics/ai + site-command),
  admin 5 (AI client header/site-command, demo command, diff dialog), ui 2
  (`useUiLocale`/`uiLocaleNow`) รวม repo **1,289 เคส**
  (shared 205, tokens 10, sdk 11, ui 70, blocks 122, api 438, admin 346, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm --filter api build` ผ่านทั้งหมด
  และ `pnpm audit --prod` = 0 ช่องโหว่

## คำสั่งเฉพาะก้อนที่ 22

```bash
pnpm --filter @lumio/shared test   # api-locale, theme-command, label catalogs
pnpm --filter @lumio/blocks test   # catalog ไทย/อังกฤษ + ค้นข้ามภาษา
pnpm --filter api test             # locale ใน billing/seo/apps/dashboard/analytics/ai + site-command
pnpm --filter admin test           # X-Locale header, AI command UI/demo/diff
pnpm --filter api build            # Nest 11
pnpm audit --prod
```

## งานที่ทำเสร็จ (ก้อนที่ 23)

ปิดงานค้าง “แนะนำ meta จากหน้า เติบโต › SEO” ของก้อนที่ 22: หน้ารายงาน SEO บอกได้แล้วว่า
หน้าไหนยังขาดชื่อเรื่อง/คำอธิบาย และให้ผู้ช่วยร่างให้ได้ทันที โดยไม่ต้องเปิด editor ทีละหน้า

- **API** (`apps/api` + `packages/shared`)
  - `PATCH /contents/:id/seo` + `seoPatchSchema` — ทุกฟิลด์ optional และ `noindex` ไม่มี default
    จึงแก้เฉพาะชื่อเรื่องได้โดยไม่ลบคำอธิบายหรือธง `noindex`; `ContentsService.updateSeo()`
    merge ลง `seo` เดิม เขียน audit `content.seo` และสั่ง rebuild หน้า public เมื่อหน้านั้นเผยแพร่แล้ว
  - query ทั้งหมดยังอยู่ใน `forSite` (RLS) และใช้ `@Roles(...WRITE_ROLES)` ตามสกิล endpoint
- **shared**: `seoMetaCandidates(health)` รวมรายการ `missing_title`/`missing_description`
  เป็นหน้าละหนึ่งรายการ พร้อมธงว่าขาดฟิลด์ไหน
- **แอดมิน**: การ์ด “ให้ผู้ช่วยเขียนชื่อเรื่องและคำอธิบาย” ต่อท้ายรายการตรวจ — แสดงเฉพาะหน้าที่ขาด,
  เรียก `SeoApi.suggestMeta` (ไป `POST /ai/seo`), โชว์ diff เดิม (`AiDiffDialog`) ก่อนบันทึกด้วย
  `SeoApi.saveMeta` (PATCH seo) แล้วรีเฟรชรายงาน + toast ที่กดเลิกทำได้ (เขียนค่าเดิมกลับ);
  role อ่านอย่างเดียวเห็นคำอธิบายแทนปุ่ม
- **โหมดเดโม**: `createDemoSeoApi(ai)` จำ meta ที่บันทึก → รายการตรวจหายและคะแนนขึ้นจริง,
  เลิกทำแล้วกลับมาเหมือนเดิม
- Test ใหม่ 23 เคส: shared 5 (seoMetaCandidates 2, seoPatchSchema 3), api 7
  (updateSeo 4 + HTTP 3), admin 11 (การ์ด/คิวรี/provider/client) รวม repo **1,311 เคส**
  (shared 210, tokens 10, sdk 11, ui 70, blocks 122, api 445, admin 356, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด

## คำสั่งเฉพาะก้อนที่ 23

```bash
pnpm --filter @lumio/shared test            # seoMetaCandidates + seoPatchSchema
pnpm --filter api test src/modules/contents # merge meta + rebuild หน้าเผยแพร่ + ข้ามเว็บ
pnpm --filter api test src/http             # PATCH /contents/:id/seo (200/400/403)
pnpm --filter admin test src/growth         # การ์ดผู้ช่วย + client suggestMeta/saveMeta
```

## งานที่ทำเสร็จ (ก้อนที่ 24)

ปิดงาน “AI สร้างพาเลทจากโลโก้ในขั้น 4 ของ wizard”: หลังอัปโหลดโลโก้ในขั้นที่ 2
ขั้นเลือกสีมีปุ่มที่ดึงสีจริงจากโลโก้มาใช้ทั้งเว็บ โดยไม่ต้องเดาเอง

- **shared** (`packages/shared/src/brand-palette.ts`)
  - `extractBrandPalette(pixels, width, height)` — คณิตศาสตร์ล้วนบนพิกเซล RGBA: ชั่งน้ำหนักตาม
    ความอิ่มตัวของสี, ตัดสีเทา/โปร่งใส, รวมเป็น 12 ฮิวโซน, เลือกสีที่ครอบคลุมมากที่สุดเป็นสีหลัก
    แล้ว `ensureAccessiblePrimary()` ทำให้ข้อความขาวบนปุ่มผ่าน AA, สีตัดกันเลือกจากฮิวที่ห่าง ≥ 40°
    (ถ้าโลโก้มีสีเดียวจะสร้างคู่สีตรงข้ามให้) — ตกไปใช้สีเริ่มต้นเมื่อโลโก้ขาวดำ
  - `brandPaletteSchema` + `defaultBrandPalette()` ให้ฝั่งแอดมินตรวจ/ใช้ค่าเดียวกันได้
- **API**
  - `POST /media/:id/palette` (READ roles) ผ่าน `MediaService.palette()`: หาแถวด้วย `findRow` (RLS),
    ปฏิเสธรูปที่ยังประมวลผลไม่เสร็จ/ไฟล์อ่านไม่ได้ ด้วยข้อความภาษาคน, อ่านออบเจกต์จาก storage
    แล้วย่อเป็น 64px ด้วย `sharp` (`limitInputPixels`) ก่อนส่งให้ตัวสกัดสี — ไม่บันทึกอะไร
- **แอดมิน**
  - `MediaApi.palette(mediaId)` (HTTP + เดโม) และ `withBrandPalette()` ใน wizard steps
  - ขั้น 4 มีการ์ด “ใช้สีจากโลโก้” เมื่อมี `logoMediaId`: กดแล้วดาวน์โหลดพาเลท, ตั้งสีหลัก/สีเสริม,
    แจ้งโทนที่ใช้ และมีปุ่ม “ใช้สีเดิม” เป็น undo (ตามกฎ UX: ไม่มี confirm)
- Test ใหม่ 17 เคส: shared 8 (การสกัดสี/ค่าสีตกหล่น/ฟอลแบ็ก/ซินแท็กซ์สคีมา/ระยะฮิว),
  api 4 (อ่านสีจริงจาก PNG, ข้ามเว็บ, รอประมวลผล, ไฟล์เสีย), admin 5 (HTTP + เดโม + withBrandPalette
  - แสดง/ซ่อนปุ่มในขั้น 4) รวม repo **1,328 เคส** (shared 218, tokens 10, sdk 11, ui 70,
    blocks 122, api 449, admin 361, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
- หมายเหตุความปลอดภัย: route อยู่ใน `SiteGuard` + `@Roles`, ไม่รับ URL/ไฟล์จากผู้ใช้ (อ่านเฉพาะคลังของเว็บ),
  จำกัดพิกเซลที่ถอดรหัส, ไม่เขียนข้อมูลใด ๆ จึงไม่มี audit ที่ต้องบันทึก

## คำสั่งเฉพาะก้อนที่ 24

```bash
pnpm --filter @lumio/shared test src/brand-palette.test.ts   # สกัดสี/AA/ฟอลแบ็ก
pnpm --filter api test src/modules/media                    # POST /media/:id/palette ผ่าน service
pnpm --filter admin test src/wizard src/media               # ปุ่มในขั้น 4 + client
```

## งานที่ทำเสร็จ (ก้อนที่ 25)

ปิดงานค้างของคลังรูป 2 ข้อจากก้อนที่ 8–9: รูปที่ลบแล้วเคยค้างอยู่ตลอดไป และ pipeline
สร้าง AVIF ไว้แต่ไม่มีใครโหลดมัน

- **ลบรูปในถังขยะอัตโนมัติ** (`apps/api` + `packages/shared`)
  - migration `20261029000000_media_archive`: `media.archived_at` + index
    `(site_id, status, archived_at)`; `remove()` ประทับเวลา, `restore()` ล้างค่า
  - `MediaService.purgeExpiredTrash()` สแกนทีละเว็บ (RLS), ลบ variant ทุกไฟล์ + ต้นฉบับ
    (idempotent ทั้ง local/S3), `deleteMany` แล้วเขียน audit `media.purge` ต่อรูป
  - `MediaPurgeProcessor` ใน worker (ค่าเริ่มต้นวันละครั้ง, `MEDIA_PURGE_INLINE` สำหรับ dev,
    `MEDIA_PURGE_INTERVAL_MINUTES` ปรับได้), ข้ามรอบที่ทับกัน, error ไม่ทำให้ลูปตาย
  - shared: `MEDIA_TRASH_RETENTION_DAYS`, `mediaTrashPurgeAt`/`mediaTrashDaysLeft`/
    `isMediaTrashExpired`
- **AVIF ผ่าน `<picture>`**
  - `MediaItem.avifSrcSet` (สร้างจาก variants ด้วย `buildSrcSet(..., { format: 'avif' })`)
    และ `imageValueSchema.avifSrcSet` — media picker ส่งต่อให้ block panel เก็บไว้
  - `Img` เรนเดอร์ `<picture class="lumio-img__picture"><source type="image/avif"><img webp>`
    เมื่อมี `avifSrcSet` (ไม่มี = `<img>` เดิม) เบราว์เซอร์ใหม่จึงโหลดไฟล์เล็กลง ตัวเก่ายังได้ WebP
- Test ใหม่ 13 เคส: shared 3 (retention), blocks 1 (picture + fallback), api 9
  (purge/processor/avif ladder) รวม repo **1,341 เคส**
  (shared 221, tokens 10, sdk 11, ui 70, blocks 123, api 458, admin 361, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  และ migration ถูก apply กับ DB จริงแล้ว
- หมายเหตุความปลอดภัย: sweep ทำงานใต้ `forSite` เสมอ, ไม่รับ input จากผู้ใช้, ลบเฉพาะไฟล์ที่
  key มาจากแถวของเว็บนั้น, audit ทุกรูปที่ถูกลบ

## คำสั่งเฉพาะก้อนที่ 25

```bash
pnpm --filter api exec prisma migrate deploy   # media.archived_at
pnpm --filter @lumio/shared test src/media.test.ts
pnpm --filter api test src/modules/media        # purge + processor + avif ladder
pnpm --filter @lumio/blocks test src/engine     # <picture> + fallback
```

## งานที่ทำเสร็จ (ก้อนที่ 26)

ปิดงานค้างข้อสุดท้ายของคลังรูป: จุดโฟกัสที่เก็บไว้ตั้งแต่ก้อนที่ 8 ไม่เคยถูกใช้ทั้งตอนตั้งและตอนแสดงผล

- **ตั้งจุดโฟกัสได้จากคลังรูป** (`apps/admin`)
  - inspector ของรูปมีพรีวิว 96px + สไลเดอร์แนวนอน/แนวตั้ง 0-100 พร้อมปุ่ม
    "บันทึกจุดโฟกัส" และ "กลับไปตรงกลาง"; ค่าเดิมแสดงทันทีเมื่อเลือกรูป
  - `useMediaLibrary.saveFocalPoint()` บันทึกผ่าน `PATCH /media/:id` แล้วขึ้น toast ที่กดเลิกทำได้
    (เขียนจุดเดิมกลับ) — ตามกฎ UX ไม่มี confirm dialog
  - `focal-point.ts` แปลง 0-1 ↔ เปอร์เซ็นต์, ปัดเศษ, clamp และสร้าง `object-position`
    ตัวเดียวกับที่พรีวิวใช้
- **ใช้จุดโฟกัสตอนแสดงผล** (`packages/blocks`)
  - `imageValueSchema.focalPoint` + `PickedImage.focalPoint` → media picker ส่งต่อให้ block เก็บไว้
  - `Img` ใส่ `object-position` บน `<img>` (ทำงานคู่กับ `object-fit: cover` และ aspect ของ block)
    ทั้งภาพเดี่ยวและ hero จึงไม่ตัดหัวคนหรือป้ายทิ้ง แม้เปลี่ยนสัดส่วนภายหลัง
- Test ใหม่ 9 เคส: admin 8 (focal-point 5 + inspector 3), blocks 1 (object-position)
  รวม repo **1,350 เคส**
  (shared 221, tokens 10, sdk 11, ui 70, blocks 124, api 458, admin 369, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
- ไม่ต้อง migration: API ตรวจ `focalPointSchema` (0-1) อยู่แล้ว และคอลัมน์ `media.focal_point`
  เก็บค่าได้ตั้งแต่ก้อนที่ 8

## คำสั่งเฉพาะก้อนที่ 26

```bash
pnpm --filter admin test src/media        # focal-point + inspector + provider
pnpm --filter @lumio/blocks test src/engine  # object-position
```

## งานที่ทำเสร็จ (ก้อนที่ 27)

ปิดงาน "`/ai/generate-site` แบบ background job ที่สร้างทุกภาษาในครั้งเดียว": การสร้างเว็บใน
ขั้น 5 ยังตอบทันทีเหมือนเดิม แต่ภาษาที่เลือกไว้ถูกสร้างและแปลเบื้องหลัง

- **shared**
  - `createSiteFromTemplateInputSchema.locales` (สูงสุด 5 ภาษา, trim + lowercase)
  - `siteLocaleJobSchema` / `siteLocaleStatusSchema` + `isSiteLocaleJobStatus` สำหรับสถานะที่ wizard อ่าน
- **API**
  - `SiteLocaleService` + `SiteLocaleProcessor` + queue (memory หรือ BullMQ ตาม `QUEUE_DRIVER`):
    สร้างหน้าต่อภาษาด้วย `ContentsService.createTranslation` (clone block ids ใหม่) และแปลด้วย AI;
    ถ้าผู้ช่วยไม่พร้อม (แผน/โควตา) จะถอยไปคัดลอกโครงเดิมแล้วรายงาน `translated: false`; publish ตาม `publishNow`
  - ความคืบหน้าเก็บใน `site.settings.localeJobs` (ไม่ต้องตาราง/migration ใหม่) แล้วเปิดให้อ่านด้วย
    `GET /sites/:id/locales`
  - `POST /sites` เก็บ `site.locales = [default, ...locales]` และ enqueue หลัง commit (ไม่บล็อก response),
    audit `site.locale_built` ต่อภาษา
  - worker เริ่ม processor; API drain เองเมื่อ `SITE_LOCALE_INLINE !== 'false'`
- **แอดมิน**
  - wizard ขั้น 5 มีตัวเลือก "เพิ่มภาษาอื่น (อังกฤษ)" และบรรทัดภาษาในสรุป
  - หน้าสรุปหลังสร้างเว็บ poll สถานะทุก 3 วินาที: กำลังสร้าง / พร้อมแล้ว / สร้างแล้วแต่ยังไม่แปล / ไม่สำเร็จ
  - `WizardApi.localeStatus()` (HTTP + เดโม) และ `buildCreateInput` ส่ง `locales`
- Test ใหม่ 15 เคส: shared 1, api 11 (service 7 + processor 2 + wizard 2), admin 3
  รวม repo **1,365 เคส**
  (shared 222, tokens 10, sdk 11, ui 70, blocks 124, api 469, admin 372, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
- หมายเหตุความปลอดภัย: job อ่าน/เขียนใต้ `forSite` (RLS), ภาษาใหม่ต้องอยู่ใน `site.locales` ซึ่ง
  เซิร์ฟเวอร์เป็นผู้เขียนเอง, จำกัด 5 ภาษา, ไม่รับ `userId` จาก client และงานซ้ำจะข้ามหน้าแปลที่มีอยู่แล้ว

## คำสั่งเฉพาะก้อนที่ 27

```bash
pnpm --filter api test src/modules/sites     # locale service + processor + wizard
pnpm --filter admin test src/wizard          # ช่องเลือกภาษา + สถานะ + client
SITE_LOCALE_INLINE=false pnpm --filter api start:worker   # worker สร้างภาษาแทน API
```

## งานที่ทำเสร็จ (ก้อนที่ 28)

ปิดงาน AI ที่ค้างอยู่ข้อสุดท้าย: **แชทสั่งแก้เนื้อหาบล็อกที่เลือก** (เดิม chat ปรับได้แค่ design tokens
ทั้งเว็บ)

- **shared**
  - `aiBlockCommandInputSchema` (`pageId` + `instruction` + `texts` สูงสุด 6 ฟิลด์ พร้อม path/label/value)
  - `AiChange.path` (ไม่บังคับ) เพื่อให้ฝั่งแอดมินเขียนค่ากลับตำแหน่งเดิมได้
  - `blockCommandFromInstruction()` — ตัวแปลงคำสั่งแบบออฟไลน์: "ทำให้สั้นลง", "เป็นทางการขึ้น",
    "เป็นกันเองขึ้น" และ "เปลี่ยนเป็น “…”“; เลือกฟิลด์จากชื่อ/ข้อความที่ถูกพูดถึง ไม่งั้นใช้ฟิลด์แรก
  - `blockCommand`/`blockCommandSummary` ในแคตตาล็อกป้าย + สรุปสำหรับ `AiProposal`
- **API**
  - `POST /ai/block-command` (rate limit + roles + `X-Locale`): ตรวจว่าหน้าอยู่ในเว็บ (RLS),
    กันโควตา/แพ็กเกจผ่าน `AiService.guard()`, เรียก provider แล้วคืน proposal ที่มี `path` ต่อ field,
    บันทึก usage + audit `ai.block-command`
  - provider: action ใหม่ `block-command` — OpenAI-compatible ตอบ JSON `{changes:[{path,after}]}`
    และกรอง path ที่ไม่มีจริง/ค่าไม่เปลี่ยนออก, local ใช้ parser ข้างบน, ถ้าโมเดลตอบไม่ได้ก็ถอยไป parser
- **แอดมิน**
  - กล่องแชทในแผง AI มีปุ่ม "แก้ข้อความที่เลือก" ควบคู่กับ "สั่งงานทั้งเว็บ"; ใช้ diff dialog เดิม
    แล้วนำไปใช้เป็น undo ขั้นเดียวผ่าน `applyBlockChanges` ของ editor
  - โหมดเดโมใช้ parser เดียวกัน จึงลองได้โดยไม่ต้องมี key
- Test ใหม่ 10 เคส: shared 2, api 6 (service 3 + provider 3), admin 2 (client + demo)
  รวม repo **1,375 เคส**
  (shared 224, tokens 10, sdk 11, ui 70, blocks 124, api 475, admin 374, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
- หมายเหตุความปลอดภัย: เซิร์ฟเวอร์ไม่เชื่อ path จากโมเดล (ตรวจกับรายการที่ client ส่งมาและมีอยู่จริง),
  ไม่บันทึกเนื้อหาเอง (ผู้ใช้กดนำไปใช้), ทุกคำสั่งผ่านโควตา/audit และหน้าเว็บต้องเป็นของเว็บนั้น

## คำสั่งเฉพาะก้อนที่ 28

```bash
pnpm --filter @lumio/shared test src/ai.test.ts        # parser คำสั่ง
pnpm --filter api test src/modules/ai                  # service + provider
pnpm --filter admin test src/ai                        # client + demo
```

## งานที่ทำเสร็จ (ก้อนที่ 29)

**รับชำระเงินจริงผ่าน Stripe** — รองรับทั้งบัตรเครดิต/เดบิต และพร้อมเพย์ (PromptPay QR)
โดยไม่เพิ่ม dependency: ใช้ REST ของ Stripe + ตรวจลายเซ็น webhook เอง

- **ฐานข้อมูล**
  - migration `20261030000000_invoice_payment_refs`: `invoices.provider`, `provider_ref`
    (session id) และ `method` (`card`/`promptpay`) + index บน `provider_ref`
- **API**
  - `POST /billing/checkout` (owner เท่านั้น): สร้างใบแจ้งหนี้ `pending` ก่อน แล้วเปิด Stripe
    Checkout (`mode=payment`, THB เป็นสตางค์, จำกัดวิธีจ่ายตามที่เลือก, metadata มี siteId/plan/invoiceId),
    เก็บ session id กลับลงใบแจ้งหนี้ แล้วคืน URL ให้เบราว์เซอร์ไปจ่าย
  - `POST /billing/webhook` (ไม่มี session; ยืนยันด้วย `Stripe-Signature` แบบ HMAC + tolerance 5 นาที
    จาก raw body): `checkout.session.completed` ที่จ่ายแล้ว → ใบแจ้งหนี้ `paid` + อัปเกรดแพ็กเกจ,
    `checkout.session.async_payment_succeeded` สำหรับพร้อมเพย์, `async_payment_failed`/`expired` → ใบแจ้งหนี้ `void`
    — idempotent เมื่อ Stripe ส่งซ้ำ
  - `PATCH /billing/plan` ใช้ได้เฉพาะแพ็กเกจฟรีแล้ว (กันการอัปเกรดโดยไม่จ่าย) และข้อความบอกให้ไปชำระเงิน
  - ตั้งค่าผ่าน env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BILLING_RETURN_URL`
    (ถ้าไม่ตั้ง ค่าตอบกลับเป็นภาษาคนว่ายังไม่ได้เชื่อมต่อ)
- **แอดมิน**
  - เลือกแพ็กเกจที่มีค่าใช้จ่าย → โมดัลเลือกวิธีจ่าย (บัตร / พร้อมเพย์) → ไปหน้าชำระเงินของ Stripe;
    แพ็กเกจฟรีเปลี่ยนได้ทันที; โหมดเดโมจำลองการจ่ายสำเร็จและลงประวัติเป็น `paid`
  - ประวัติการชำระเงินแสดงวิธีที่ใช้จ่ายด้วย
- Test ใหม่ 21 เคส: api 19 (checkout/webhook/ลายเซ็น + HTTP 2), admin 2 (เดโม)
  รวม repo **1,396 เคส**
  (shared 224, tokens 10, sdk 11, ui 70, blocks 124, api 494, admin 376, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  และ apply migration กับ DB จริงแล้ว
- หมายเหตุความปลอดภัย: ไม่เก็บข้อมูลบัตร (Stripe-hosted), webhook ตรวจ HMAC จาก raw bytes ก่อน parse,
  ไม่รับ siteId/plan จาก client ใน webhook (อ่านจาก metadata ที่เซิร์ฟเวอร์เขียนเอง), จำกัดวิธีจ่ายที่หน้า Stripe,
  จำกัด rate ของ webhook และไม่ log เนื้อหา event

## คำสั่งเฉพาะก้อนที่ 29

```bash
pnpm --filter api exec prisma migrate deploy   # invoices.provider/provider_ref/method
pnpm --filter api test src/modules/billing     # checkout, webhook, ลายเซ็น
pnpm --filter api test src/http                # webhook ไม่มี session + ต้องมีลายเซ็น
pnpm --filter admin test src/settings          # โมดัลเลือกวิธีจ่าย + เดโม
# ตั้ง STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET แล้วชี้ webhook มาที่ /api/v1/billing/webhook
```

## งานที่ทำเสร็จ (ก้อนที่ 30)

**ต่ออายุอัตโนมัติ + ใบเสร็จรอบใหม่** — ปิดช่องว่างหลังเปิดรับชำระเงินในก้อนที่ 29

- **โมเดล/ฐานข้อมูล**
  - migration `20261031000000_site_subscriptions`: `sites.stripe_customer_id`,
    `sites.stripe_subscription_id` + index — ใช้หาเว็บจาก webhook ที่มีแต่ subscription id
  - สถานะการต่ออายุเก็บใน `site.settings.billing` (`renewsAt`, `cancelAtPeriodEnd`, `method`)
- **API (Stripe)**
  - บัตรเครดิตเปิด Checkout แบบ `mode=subscription` (รายเดือน, `subscription_data` มี siteId/plan)
    และเก็บ subscription/customer id เมื่อจ่ายสำเร็จ; พร้อมเพย์คงเป็นการจ่ายครั้งเดียว (Stripe ไม่รองรับ QR แบบ recurring)
  - webhook ใหม่: `invoice.paid` (สร้างใบเสร็จรอบใหม่เป็น `paid` + อัปเดต `renewsAt`, ข้ามรอบแรกที่เป็น
    `subscription_create` เพราะตัดจาก checkout แล้ว), `invoice.payment_failed` (ออกใบเสร็จ `void` +
    audit `billing.renewal_failed`), `customer.subscription.updated` (เก็บ cancel_at_period_end/รอบถัดไป),
    `customer.subscription.deleted` (ดาวน์เกรดเป็นฟรี) — ทุกเส้นทางกันส่งซ้ำด้วย `provider_ref`
  - `POST /billing/cancel` (owner): สั่ง Stripe `cancel_at_period_end=true` แล้วเก็บสถานะ; ถ้าเว็บจ่ายด้วย
    พร้อมเพย์จะตอบว่าชำระครั้งเดียวจึงไม่มีการต่ออายุให้ยกเลิก
  - `GET /billing` คืน `subscription` (`renewsAt`, `cancelAtPeriodEnd`, `method`) ให้หน้าจอแสดงสถานะ
- **แอดมิน**
  - การ์ดแพ็กเกจปัจจุบันแสดง "ต่ออายุอัตโนมัติครั้งถัดไป …" และปุ่ม "ยกเลิกการต่ออายุ" (ซ่อนหลังยกเลิก
    แล้วแสดงวันสิ้นสุดแทน); โหมดเดโมจำลองทั้งบัตรและพร้อมเพย์ให้เห็นความต่าง
- Test ใหม่ 17 เคส: api 13 (subscription checkout/cancel + renewal/failed/deleted + สัญญาณ), admin 4
  รวม repo **1,412 เคส**
  (shared 224, tokens 10, sdk 11, ui 70, blocks 124, api 505, admin 381, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  และ apply migration กับ DB จริงแล้ว
- หมายเหตุความปลอดภัย: webhook ยังตรวจ HMAC จาก raw bytes, ค้นเว็บจาก subscription id ที่เซิร์ฟเวอร์
  เก็บเอง (ไม่รับ siteId จาก client), กันส่งซ้ำด้วย `provider_ref`, และการยกเลิกต้องเป็น owner เท่านั้น

## คำสั่งเฉพาะก้อนที่ 30

```bash
pnpm --filter api exec prisma migrate deploy   # sites.stripe_*_id
pnpm --filter api test src/modules/billing     # renewal/void/deleted/cancel
pnpm --filter admin test src/settings          # สถานะต่ออายุ + เดโม
# ใน Stripe dashboard เปิดส่ง event: invoice.paid, invoice.payment_failed,
# customer.subscription.updated, customer.subscription.deleted
```

## งานที่ทำเสร็จ (ก้อนที่ 31)

**บังคับใช้โควตาตามแพ็กเกจที่ฝั่งเซิร์ฟเวอร์** — ก่อนหน้านี้หน้าจอแสดงแถบโควตา แต่ยังไม่มีอะไรหยุด
การเพิ่มหน้าที่ 4 ของแพ็กเกจฟรีหรืออัปรูปจนเต็มพื้นที่

- **shared**: `QUOTA_KINDS` + `quotaExceededMessage(kind, limit, locale)` — ข้อความธุรกิจ
  ("แพ็กเกจนี้มีได้ 3 หน้า ตอนนี้ครบแล้ว…", "พื้นที่ไฟล์สื่อเต็มแล้ว (2 GB)…", "ทีมได้ 2 คน…") ไทย/อังกฤษ
- **API**: `QuotaService` (billing module) อ่านแผนของเว็บ + นับการใช้งานใต้ `forSite` แล้วปฏิเสธด้วย 409
  ที่มีข้อความอ่านรู้เรื่อง
  - หน้า: ตรวจตอนสร้างหน้า (`POST /contents` type=page), กู้คืนจากถังขยะ และสร้างคำแปลภาษาใหม่
    (โพสต์/บทความไม่กินโควตาหน้า ตามที่หน้าจอคิด)
  - พื้นที่ไฟล์สื่อ: ตรวจตอน `POST /media/presign` ด้วยขนาดที่ประกาศ (นับรูปที่ไม่ถูกย้ายเข้าถังขยะ)
  - ทีม: ตรวจตอนเชิญสมาชิก
  - แพ็กเกจที่ `null` (ไม่จำกัด) ไม่ถูกบล็อกเลย; เว็บที่เกินอยู่แล้วยังอ่าน/เผยแพร่ได้ตามปกติ
    (บล็อกเฉพาะการเพิ่มใหม่)
- **การต่อ Wiring**: `BillingModule` export `QuotaService`; `ContentsModule`, `MediaModule`,
  `MembersModule` import ใช้ — ไม่มี circular dependency
- Test ใหม่ 15 เคส: shared 3 (ข้อความ/เพดานแผน), api 12 (QuotaService 8 + ตรวจตอนสร้างหน้า/โพสต์,
  presign, เชิญทีม) รวม repo **1,427 เคส**
  (shared 227, tokens 10, sdk 11, ui 70, blocks 124, api 517, admin 381, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
- หมายเหตุ: wizard สร้างหน้าตัวอย่างทั้งชุดจาก template ให้ทุกเว็บใหม่ (ตามดีไซน์) จึงอาจเริ่มด้วย
  มากกว่าโควตาฟรีได้หนึ่งครั้ง; การเพิ่มครั้งถัดไปจะถูกบล็อกจนกว่าจะอัปเกรดหรือลบหน้า

## คำสั่งเฉพาะก้อนที่ 31

```bash
pnpm --filter @lumio/shared test src/billing.test.ts   # ข้อความโควตา + เพดานแผน
pnpm --filter api test src/modules/billing/quota       # หน้า/พื้นที่/ทีม
pnpm --filter api test src/modules/contents src/modules/media src/modules/members
```

## งานที่ทำเสร็จ (ก้อนที่ 32)

**เปลี่ยนแพ็กเกจไม่ให้ต่ออายุซ้ำ** — ปิดช่องโหว่ที่พบหลังทำ subscription: การอัปเกรดจะเปิด
subscription ใหม่ แต่ตัวเก่ายัง renew ต่อ → เสี่ยงจ่ายซ้ำสองรอบ

- **API**
  - `stripe.cancelStripeSubscriptionNow()` — `DELETE /v1/subscriptions/:id` (ถือว่า 404 = จบแล้ว)
  - เมื่อ `checkout.session.completed` ของ subscription ใหม่จ่ายสำเร็จ: อ่าน subscription เดิมของเว็บ,
    อัปเดตแผน/รหัสใหม่ แล้ว **ยกเลิกตัวเดิมทันที** (หลัง commit) + audit
    `billing.replaced_subscription_cancelled`; ถ้า Stripe ล้มเหลว บันทึก
    `billing.replaced_subscription_cancel_failed` โดยไม่ทำให้ webhook ล้ม (Stripe จะ retry เอง)
  - ใบแจ้งหนี้ `pending` ที่ค้างจาก checkout ที่ถูกทิ้งถูกปรับเป็น `void` เมื่อจ่ายรอบใหม่สำเร็จ
    (ไม่เหลือ "รอชำระ" เก่าในประวัติ)
- **แอดมิน**: โมดัลชำระเงินบอกตรง ๆ ว่าแพ็กเกจใหม่เริ่มทันทีและส่วนที่เหลือของรอบเดิมไม่ถูกคืน
  (ยังไม่มี proration credit) — ตรงกับพฤติกรรมจริงของระบบ
- Test ใหม่ 5 เคส: api 5 (ยกเลิกตัวเก่า, void ใบเก่า, Stripe ล้มก็ไม่ทำให้แพ็กเกจใหม่หาย,
  `DELETE` ถูกเส้นทาง, 404 ถือว่าจบ) รวม repo **1,432 เคส**
  (shared 227, tokens 10, sdk 11, ui 70, blocks 124, api 522, admin 381, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
- หมายเหตุความปลอดภัย: การยกเลิกเกิดหลังยืนยันการจ่ายเท่านั้น, ใช้ subscription id จาก Stripe
  (ไม่ใช่จาก client), และการล้มเหลวของการยกเลิกไม่ทำให้สิทธิ์ที่จ่ายแล้วหาย

## คำสั่งเฉพาะก้อนที่ 32

```bash
pnpm --filter api test src/modules/billing   # switch/void/cancelNow
pnpm --filter admin test src/settings        # ข้อความ proration ในโมดัล
```

## งานที่ทำเสร็จ (ก้อนที่ 33)

**ล้างแคช CDN หลังเผยแพร่** — ปิดงานค้างข้อ “CDN purge” จากการย้าย static ขึ้น CDN

- `CdnPurgeNotifier` (publish module): หลัง renderer ยอมรับ rebuild แล้วจะ POST
  `{ host, paths }` ไปที่ `CDN_PURGE_URL` พร้อมหัว `x-lumio-purge-secret`
  (HMAC ไม่ใช่ตัว secret เอง) — ไม่ตั้งค่า = no-op ทุกครั้ง จึงไม่กระทบ dev/เครื่องเดียว
- `PublishProcessor` เรียก purge ต่อจาก revalidate ด้วย host และ paths ของ job
  - purge ล้มเหลว **ไม่ทำให้ publish ล้ม** (เว็บอัปเดตแล้ว; CDN มี TTL สำรอง) แต่ log ไว้และ
    `drain()` ยังรายงาน processed
  - renderer ปฏิเสธ rebuild → ไม่ purge (กันการล้างแคชให้กับ HTML ที่ยังเก่า)
- อัปเดต `.env.example` (`CDN_PURGE_URL`, `CDN_PURGE_SECRET`)
- Test ใหม่ 8 เคส: api 8 (notifier 5 + processor 3) รวม repo **1,440 เคส**
  (shared 227, tokens 10, sdk 11, ui 70, blocks 124, api 530, admin 381, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
- หมายเหตุ: pageview จาก edge ยังใช้ endpoint `POST /public/:host/collect` เดิม
  (edge/worker เรียกได้อยู่แล้วแบบ server-to-server; ฝั่งเบราว์เซอร์ยังผ่าน `/api/track` ของ renderer)

## คำสั่งเฉพาะก้อนที่ 33

```bash
pnpm --filter api test src/modules/publish   # purge + processor
CDN_PURGE_URL=... CDN_PURGE_SECRET=... pnpm --filter api start:worker
```

## งานที่ทำเสร็จ (ก้อนที่ 34)

**ยืนยันตัวตนสองขั้น (TOTP)** — 2FA สำหรับบัญชีที่ดูแลเว็บ (ปิดงานค้างด้านความปลอดภัยจากก้อนที่ 11)

- **ฐานข้อมูล**: migration `20261101000000_user_two_factor` เพิ่ม `users.totp_enabled_at` และ
  `users.totp_recovery_codes` (คอลัมน์ `totp_secret` มีตั้งแต่ต้น)
- **API**: `common/totp.ts` เขียน RFC 6238 เอง (base32, HMAC-SHA1, 6 หลัก/30 วินาที, ยอมคลาด ±1 step),
  `otpauth://` URI, recovery codes 10 รหัสแบบ `XXXX-XXXX` (เก็บเฉพาะ SHA-256)
  ทดสอบกับ test vectors ของ RFC 6238
  - `POST /auth/login` ตอบ `{ twoFactorRequired, challengeToken }` (JWT อายุ 5 นาที, `typ: 2fa`)
    แทนเซสชันเมื่อบัญชีเปิด 2FA; `POST /auth/2fa/verify` แลก challenge + รหัสเป็นเซสชัน
  - `GET /auth/2fa` · `POST /auth/2fa/setup|enable|disable`: เริ่มตั้งค่าได้ secret + otpauth,
    ยืนยันด้วยรหัสแรกจึงเปิดใช้และได้ recovery codes (แสดงครั้งเดียว), ปิดใช้ต้องใช้รหัสผ่าน + รหัส
  - recovery code ใช้ได้ครั้งเดียว (ลบ hash ทิ้งหลังใช้) และใช้ปิด 2FA ได้
- **แอดมิน**: หน้าเข้าสู่ระบบมีขั้นที่สอง (กรอกรหัสจากแอป/รหัสสำรอง); การ์ด "การยืนยันตัวตนสองขั้น"
  ในตั้งค่า › ทั่วไป (คีย์ตั้งต้น, ลิงก์ otpauth, ช่องยืนยัน, แสดงรหัสสำรองครั้งเดียว, ฟอร์มปิดใช้งาน)
  และ auth client ใช้ token จาก session store จึงเรียก endpoint จัดการได้หลังรีโหลด
- Test ใหม่ 25 เคส: api 19 (totp 8, auth 8, HTTP 3), admin 6 (client/demo/ฟอร์มขั้นที่สอง)
  รวม repo **1,465 เคส**
  (shared 227, tokens 10, sdk 11, ui 70, blocks 124, api 549, admin 387, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` ผ่านทั้งหมด
  และ apply migration กับ DB จริงแล้ว
- หมายเหตุความปลอดภัย: challenge token อายุสั้นและตรวจ `typ`, รหัส TOTP เทียบแบบ constant-time,
  recovery codes เก็บเป็น hash, เปิด/ปิดต้องยืนยันรหัสผ่าน, endpoint เหล่านี้มี rate limit 10/นาที

## คำสั่งเฉพาะก้อนที่ 34

```bash
pnpm --filter api exec prisma migrate deploy   # users.totp_enabled_at / totp_recovery_codes
pnpm --filter api test src/common/totp.spec.ts
pnpm --filter api test src/modules/auth
pnpm --filter admin test src/auth src/settings
```

## ก้อนงานถัดไปที่แนะนำ

ก้อนที่ 34 เสร็จแล้ว (2FA) — งาน AI/การชำระเงิน/โควตา/CDN/ความปลอดภัยหลักครบตาม roadmap แล้ว เหลือ:

- **proration** — อัปเกรด/ดาวน์เกรดกลางรอบยังคิดเต็มราคา (ยังไม่คำนวณส่วนต่างรายวัน)
- **App จริงที่ส่งจากผู้พัฒนา** — sandbox/bridge ทำงานแล้ว แต่ยังไม่มี App ที่โหลด manifest
  จากภายนอก (ปัจจุบันใช้แคตตาล็อกในโค้ด + ตัวอย่างฝัง `srcDoc`); ยังไม่มี kill switch ระดับแพลตฟอร์ม
- **pageview จาก edge** — beacon ยังผ่าน /api/track ของ renderer; ถ้าเสิร์ฟ static จาก CDN
  โดยไม่มี renderer ควรยิง POST /public/:host/collect จาก edge/worker
- เรื่องที่ยกจากก้อนที่ 11: virus scan (ClamAV), `sharp.limitInputPixels` และ
  test ระดับ HTTP ที่รันกับ DB จริง (ชุดใหม่ของก้อนนี้ยัง override service)
- เรื่องที่ยกจากก้อนที่ 16: import ยังไม่กู้คืน **ไฟล์สื่อ** (สำรองแค่ metadata) และยังไม่กู้
  โดเมน/สมาชิก; import ยังสร้าง global blocks แบบเพิ่มใหม่ (ไม่ merge ตาม kind)

## คำสั่งเฉพาะก้อนที่ 20

```bash
pnpm --filter api test src/http            # เทสต์ระดับ HTTP (ไม่ต้องมี DB)
pnpm --filter api test src/common          # job queue + bullmq + rate limit store
pnpm --filter api test src/modules/media   # S3 driver + confirm-time checks
pnpm --filter api test src/modules/public  # ภาษา/เมนู/ฟอร์มต่อภาษา + locales endpoint
pnpm --filter renderer test                # Accept-Language + site locales cache
pnpm --filter admin test                   # เมนูหลายภาษา + ฟอร์มหลายภาษา + AI batch/wizard
QUEUE_DRIVER=bullmq REDIS_URL=redis://localhost:49537 pnpm --filter api start:worker
MEDIA_STORAGE=s3 S3_BUCKET=lumio-media S3_ACCESS_KEY=lumio S3_SECRET_KEY=lumio-secret \
  S3_ENDPOINT=http://localhost:49600 S3_FORCE_PATH_STYLE=true pnpm --filter api dev
```

## ก้อนงานถัดไปที่แนะนำ (ของก้อนที่ 19)

ก้อนที่ 19 (i18n ต่อ) เสร็จแล้ว งานที่เหลือและสิ่งที่ยังเลื่อนไว้:

- **i18n ต่อจากก้อนที่ 18/19**: i18n ข้อความ UI ของแอดมิน (ตอนนี้เป็นภาษาไทยฝังในคอมโพเนนต์ —
  งานก้อนเดียว ต้องทำทั้งชุดไม่ให้ครึ่งไทยครึ่งอังกฤษ), i18n ของเมนู/ฟอร์ม ต่อภาษา,
  โดเมนย่อยต่อภาษา (`en.site.com`), ตัวสลับภาษาแบบอัตโนมัติจาก `Accept-Language`,
  และ `/ai/generate-site` ที่สร้างทุกภาษา
- **AI ต่อจากก้อนที่ 17**: `/ai/generate-site` (สร้างทั้งเว็บจาก prompt พร้อม background job ตาม
  [09](design/09-ai-assistant.md) 9.1/9.4), แชทสั่งงานภาพรวม ("เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม"),
  แนะนำ meta จากหน้า เติบโต › SEO, AI เติมข้อความ/สร้างพาเลทจากโลโก้ในขั้น 4 ของ wizard,
  cache AI บน Redis, AI ช่วยสร้างคำอธิบายรูปเป็นชุด (ทุกรูปที่ยังไม่มี alt)
- **การชำระเงินจริงของแพ็กเกจ** — ก้อนที่ 16 ทำหน้าจอ/โควตา/ประวัติและตาราง `invoices` แล้ว
  แต่ยังไม่มี gateway (PromptPay/Stripe) จึงยังออกใบเสร็จสถานะ `pending`; ยังไม่บล็อกการใช้งาน
  เมื่อเกินโควตา (แสดงเตือนเท่านั้น) และยังไม่มี cron ต่ออายุใบเสร็จรายเดือน
- **App จริงที่ส่งจากผู้พัฒนา** — sandbox/bridge ทำงานแล้ว แต่ยังไม่มี App ที่โหลด manifest
  จากภายนอก (ปัจจุบันใช้แคตตาล็อกในโค้ด + ตัวอย่างฝัง `srcDoc`); ยังไม่มี kill switch ระดับแพลตฟอร์ม
- **CDN purge + pageview จาก CDN/edge** — beacon วิ่งผ่าน renderer แล้ว; ถ้าย้าย static ขึ้น CDN
  ควรยิง `collect` จาก edge/worker แทน
- เรื่องที่ยกจากก้อนที่ 11: ยก `@nestjs/core` เป็น 11.x, 2FA, virus scan (ClamAV),
  `sharp.limitInputPixels` และ test ระดับ HTTP (supertest) ของ header/CSRF/rate limit
  (รวม test 403 ของ `/backup`, `/billing` และ bridge ที่ยังใช้ guard ชุดเดิม)
- เรื่องที่ยกจากก้อนที่ 8–9: S3/MinIO driver จริง, BullMQ จริง, AVIF ผ่าน `<picture>`,
  purge ถังขยะ media ตามเวลา, focal point
- เรื่องที่ยกจากก้อนที่ 16: import ยังไม่กู้คืน **ไฟล์สื่อ** (สำรองแค่ metadata) และยังไม่กู้
  โดเมน/สมาชิก; import ยังสร้าง global blocks แบบเพิ่มใหม่ (ไม่ merge ตาม kind)
- เรื่องที่ยกจากก้อนที่ 17: ยังไม่มี test ระดับ HTTP (supertest) ของ `/ai/*` (403/ข้ามเว็บ/429)
  และ AI ยังไม่ถูกนำไปใช้กับเนื้อหาหลายภาษา (รอ i18n) หรือตรวจโควตารวมทั้งแพลตฟอร์ม

หมายเหตุสำหรับก้อนที่ 9: เมนูย่อของ block ตาม wireframe 6.7 ครบ 4 อย่างแล้ว
(ทำซ้ำ / ซ่อน / ลบ / บันทึกเป็นเทมเพลต) โดย "บันทึกเป็นเทมเพลต" เก็บใน `section_templates`
ของเว็บนั้น แล้วแทรกกลับได้จากเมนู `/` กลุ่ม "เทมเพลตของฉัน"

สิ่งที่ยังไม่ทำในก้อนที่ 8 (ตั้งใจเลื่อน):

- **S3/MinIO driver จริง**: `MediaStorage` ตอนนี้มีแต่ `LocalMediaStorage` (presigned URL เป็น endpoint
  ของ API เองที่เซ็น HMAC) — เพิ่ม `S3MediaStorage` ด้วย `@aws-sdk/client-s3` + presigner แล้วเลือกผ่าน
  `MEDIA_STORAGE=s3` โดย client ไม่ต้องแก้ (interface และสัญญา token เตรียมไว้แล้ว)
- **BullMQ/Redis สำหรับ media job**: ยังใช้ `InMemoryMediaQueue` เหมือน publish (worker รับงานได้แล้ว
  เมื่อ `MEDIA_INLINE=false`) — adapter ตัวเดียวกันจะใช้ร่วมกันทั้งสองคิว
- **AVIF ผ่าน `<picture>`**: pipeline สร้าง AVIF เก็บไว้แล้ว แต่ `srcSet` ลิงก์เฉพาะ WebP เพื่อไม่ให้
  เบราว์เซอร์ที่ยังไม่รองรับ AVIF พัง — จะเปิดใช้ AVIF แบบมี fallback ในก้อน SEO/Performance
- **ลบไฟล์ถังขยะอัตโนมัติ**: `trashed` เก็บไฟล์ไว้เพื่อ undo — ควรมีงาน purge ตามเวลา (เช่น 30 วัน)
- **โฟกัสจุดตัดภาพ (focal point)**: เก็บค่าได้แล้ว (`PATCH /media/:id`) แต่ block ยังไม่ใช้ในการ crop
- หน้าแก้ไข alt ทีละหลายรูป / bulk actions และการย้ายโฟลเดอร์หลายรูปพร้อมกัน

ผลจาก security review ของก้อนนี้ (ใช้สกิล `lumio-security-review`):

- ผ่าน: Zod ทุกจุด, RLS + test ข้ามเว็บจริง, `@Roles` ทุก route ของคลังรูป, ตรวจ magic bytes + จำกัดขนาด +
  ไม่รับ SVG, token หมดอายุแบบ HMAC, rate limit ที่ `presign` และ endpoint รับไฟล์, ไม่ log secret,
  ไม่มี SSRF (ไม่รับ URL จากผู้ใช้), presigned PUT ไม่แนบ token ไปกับ storage
- ควรแก้ (แก้แล้วในก้อนที่ 11): `pnpm audit` พบช่องโหว่ที่ **มีมาก่อนก้อนนี้** ใน dependency — `next@14.2.35`
  (critical: RCE/DoS หลายรายการ → ขึ้นเป็น 15.5.28 แล้ว), `multer` ที่มากับ `@nestjs/platform-express`
  (pin ด้วย pnpm override) และชุดของ dev tool (`vitest`/`tinypool`/`vite`/`glob`) ที่ยกเครื่องแล้ว
- ข้อสังเกต: `GET /media/*` ของ driver local ไม่ต้องล็อกอิน (ตั้งใจ — เป็นไฟล์สาธารณะของเว็บ และเปิดเฉพาะ
  driver `local`); ไม่มี test ระดับ HTTP ที่ยืนยัน 403 ของ route คลังรูป (ใช้ guard ชุดเดียวกับ contents
  ที่มี test อยู่แล้ว); ยังไม่มีงานลบถังขยะตามเวลา

สิ่งที่ยังไม่ทำในก้อนที่ 7 (ตั้งใจเลื่อน):

- **BullMQ/Redis จริง**: ตอนนี้ `PublishQueue` เป็น in-memory (API drain เองเมื่อ `PUBLISH_INLINE=true`)
  ซึ่งพอสำหรับ dev/CI — ต้องเพิ่ม dependency `bullmq` + `ioredis` แล้วเขียน adapter อีกตัว
  ก่อน deploy หลาย instance (interface แยกไว้ให้แล้ว)
- **CDN purge**: ยังไม่มีตัวเรียก API ของ CDN — ทำในก้อน deployment (หัวข้อ 18)
- หน้า preview จาก draft (หัวข้อ 10.4 ข้อ 3) — editor เห็น draft อยู่แล้วผ่าน `GET /contents/:id`
- `robots.txt` ยังไม่มี per-page noindex crawl rule (ใช้ `noindex` meta จากหน้า + ตัดออกจาก sitemap แทน)
- หน้า public ยัง render แบบ on-demand (ISR) เพราะต้องรู้ host ต่อ request — ถ้าต้องได้ static file
  จริง ๆ ให้ย้ายไป route `/[host]/...` แล้วให้ middleware rewrite (จะได้ Full Route Cache ต่อเว็บ)

บัญชีทดลอง (หลัง `pnpm db:seed`): `owner@example.com` / `editor@example.com` รหัสผ่าน `lumio-demo-1234`
ตัวอย่างการเรียก: `POST /api/v1/auth/login` → ใช้ `accessToken` เป็น `Authorization: Bearer ...`
แล้วส่ง `X-Site-Id` เมื่อเรียก endpoint ของเว็บ (contents ทุกตัวต้องมี header นี้ เพราะ path
เป็น `:contentId` ไม่ใช่ site)

หน้า public ไม่ต้องใช้ token เลย: `GET /api/v1/public/baandoi.example.com/pages/home`
(หรือ `PUBLIC_DEFAULT_SITE=baandoi` แล้วเรียกด้วย host `localhost:49100`)

การต่อ admin เข้ากับ API จริง (ทำแล้วในก้อนที่ 9): ตั้ง `VITE_API_URL` แล้ว
`apps/admin/src/clients.ts` จะประกอบ `createHttpAuthApi` / `createHttpWizardApi` /
`createHttpContentApi` / `createHttpMediaApi` / `createHttpSectionTemplateApi` ให้เอง
(ไม่ตั้ง = โหมดทดลองในหน่วยความจำทั้งชุด) โดย `route.ts` เลือกเปิด login / wizard / editor
ให้ตามสถานะเซสชัน

## ก้อนที่ 35 — proration, App จากภายนอก, pageview จาก edge, ClamAV, import ไฟล์สื่อ

เก็บงานค้างจาก roadmap ที่เคยเลื่อนไว้ทั้งห้าเรื่อง (docs/design/18-deployment.md 18.6,
16-apps.md, 14-seo-performance.md, 15-security.md 15.3)

- **Proration** — `prorationCreditFor()` / `prorationQuote()` ใน `packages/shared/src/billing.ts`
  คิดเครดิตจากเวลาที่เหลือของรอบที่ชำระแล้วตามสัดส่วน แล้วหักจากยอดแพ็กเกจใหม่
  - `invoices.credit` เก็บเครดิตที่ใช้จริง; `POST /billing/checkout` สร้างใบแจ้งหนี้ด้วยยอดที่หักแล้ว
    (Stripe เรียกเก็บเฉพาะส่วนต่าง; บัตรใช้ coupon แบบครั้งเดียว כדיไม่ลดราคาต่ออายุ) และถ้าเครดิตครอบคลุมทั้งจำนวน ระบบเปลี่ยนแพ็กเกจทันทีด้วย
    ใบแจ้งหนี้ 0 บาท พร้อมยกเลิก subscription เดิม (audit `billing.proration_switch`)
  - `GET /billing` ส่ง `credit` / `payable` ของทุกแพ็กเกจ; แอดมินแสดง "หักส่วนที่เหลือ…" ก่อนจ่าย
    และในประวัติการชำระเงิน
- **App ที่โหลด manifest ภายนอก** — `POST /apps/external/preview` และ `POST /apps/external`
  - ดึง manifest ผ่าน https บนโฮสต์สาธารณะเท่านั้น: ตรวจชื่อโฮสต์และ DNS ทุก address,
    ไม่รับ redirect ไป private, จำกัด 256KB / 5 วินาที / 3 hops (`fetchExternalManifest`)
  - เก็บ `site_apps.source` / `manifest_url` / `manifest`; bridge ใช้ scope จาก manifest ที่เก็บไว้
    และแอดมินโหลดหน้า `entry` ใน iframe `sandbox="allow-scripts"` เดิม
  - kill switch: `APPS_PLATFORM_DISABLED=true` ปิดติดตั้งและเรียก bridge ทั้งแพลตฟอร์ม,
    `APPS_EXTERNAL_ENABLED=false` ปิดเฉพาะ App ภายนอก (แคตตาล็อกในโค้ดยังใช้ได้)
- **pageview จาก edge** — `POST /v1/public/:host/collect/batch` (สูงสุด 100 เหตุการณ์)
  ใช้ header `x-lumio-edge-token` เทียบกับ `EDGE_COLLECT_TOKEN` แบบ constant-time,
  อ่านประเทศจาก `cf-ipcountry` / `x-vercel-ip-country` / `x-lumio-country` และ IP จาก
  `cf-connecting-ip` / `x-real-ip`; ไม่ตั้งโทเคน = ปิด endpoint
- **ClamAV** — `media.scanner.ts` คุย clamd ด้วย INSTREAM ผ่าน TCP
  (`MEDIA_SCANNER=clamav`, `CLAMAV_HOST/PORT/TIMEOUT_MS`), สแกนตอนรับไฟล์ (local)
  และตอน confirm (S3), สแกนไม่ผ่านหรือ clamd ล่ม = ปฏิเสธไฟล์ (fail closed)
  `docker compose --profile scan up -d` มี service พร้อมใช้
- **import ไฟล์สื่อ** — backup แนบ bytes ต้นฉบับเป็น base64 ภายในงบ
  `BACKUP_MEDIA_MAX_BYTES` (ไฟล์ใหญ่เกินได้ metadata และนับเป็น skipped),
  import เรียก `MediaService.importFile()` ผ่านการตรวจชนิด/quota/ไวรัสเดิม แล้วเข้าคิว
  render WebP/AVIF ใหม่; ผลลัพธ์มี `media: { added, skipped }`

คำสั่งเฉพาะก้อนที่ 35

```bash
pnpm --filter api exec prisma migrate deploy   # invoices.credit, site_apps.source/manifest
pnpm --filter api test src/modules/billing src/modules/apps src/modules/media
pnpm --filter api test src/modules/backup src/modules/public src/common/edge-collect.guard.spec.ts
pnpm --filter @lumio/shared test
pnpm --filter admin test src/settings src/growth
MEDIA_SCANNER=clamav CLAMAV_HOST=localhost CLAMAV_PORT=49800 pnpm --filter api dev
EDGE_COLLECT_TOKEN=... # ตั้งก่อนให้ edge/worker ยิง collect/batch
```

- เทสต์ใหม่ 35 เคส (shared 9, api 22, admin 4) รวม repo **1,516 เคส**
  (shared 237, tokens 10, sdk 12, ui 70, blocks 124, api 585, admin 391, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` ผ่านทั้งหมด และ apply migration กับ DB จริงแล้ว

## ก้อนที่ 36 — ปิดงานค้าง security/TLS/import

เก็บสามเรื่องที่ค้างจากก้อนที่ 35

- **เพดานพิกเซลของรูป** — `MEDIA_MAX_INPUT_PIXELS` (ค่าเริ่มต้น 40,000,000 พิกเซล)
  ใช้กับทุกจุดที่เรียก sharp: `SharpImagePipeline` (metadata + เรนเดอร์ทุกระดับความกว้าง)
  และตัวอ่านสีจากโลโก้ ไฟล์ที่ประกาศขนาดใหญ่เกินถูกปฏิเสธตั้งแต่ถอดรหัส
  (กัน decompression bomb ที่การจำกัดไบต์อย่างเดียวไม่พอ) + test ลดเพดานผ่าน env
- **Caddy on-demand TLS จริง** — `GET /api/v1/public/tls/ask?domain=`
  ตอบ 200 เฉพาะโดเมนที่ `ssl_status = active` และ `verified_at` ไม่เป็น null
  นอกนั้นตอบ 403 เหมือนกันหมด (ไม่บอกว่าโดเมนมีอยู่หรือไม่), rate limit 120/นาที,
  `cache-control: no-store`; `infra/caddy/Caddyfile` มี `on_demand_tls` + catch-all
  `https://` พร้อม `tls { on_demand }` และตั้ง URL ผ่าน `LUMIO_TLS_ASK_URL`
- **import กู้โดเมน/สมาชิก + merge global blocks** — backup schema เพิ่ม `domains`
  และ `members` (optional เพื่ออ่านไฟล์เก่าได้), import เชื่อมโดเมนที่ยังว่าง
  (โดเมนของเว็บอื่นถูกข้าม), เพิ่มสมาชิกเฉพาะคนที่มีบัญชีอยู่แล้วและไม่สร้าง owner คนที่สอง,
  global block ชนิดเดียวกันถูกอัปเดตแทนการเพิ่มสำเนา; ผลลัพธ์และ audit มีจำนวน added/skipped
- **แอดมิน** — ข้อความหลัง import บอกจำนวนโดเมน/สมาชิกที่กู้คืน (i18n th/en) และโหมดเดโมตรงกับผลลัพธ์ใหม่

- เทสต์ใหม่ 9 เคส (api 9) รวม repo **1,525 เคส**
  (shared 237, tokens 10, sdk 12, ui 70, blocks 124, api 594, admin 391, renderer 87)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` ผ่านทั้งหมด

**ยังเหลือ (เลื่อนไว้)**: test ระดับ HTTP ที่รันกับ DB จริงสำหรับ billing/apps, CDN purge integration test

## ก้อนที่ 37 — E-commerce (สินค้า, ตะกร้า, พร้อมเพย์, คำสั่งซื้อ)

เปิดเฟส E-commerce ตาม `docs/design/03-scope.md` 3.3 และตารางที่เคยเลื่อนไว้ใน 11.3

- **ฐานข้อมูล**: migration `20261103000000_commerce` เพิ่ม `products`, `orders`, `order_items`
  - ราคาเก็บเป็นจำนวนเต็มสตางค์ (`INTEGER`) ทุน/ยอดรวมไม่เพี้ยนจากทศนิยม
  - `orders.customer` เป็น JSONB ตาม schema `orderCustomerSchema`; `order_items` เก็บ snapshot
    ชื่อ/ราคา/รูป เพื่อให้แก้หรือลบสินค้าภายหลังไม่เปลี่ยนใบเสร็จเก่า
  - RLS + FORCE ทุกตาราง, unique `(site_id, slug)` / `(site_id, number)`, token ของคำสั่งซื้อ unique
  - CHECK: ราคา/สต็อกไม่ติดลบ, compare-at ต้องมากกว่าราคาขาย, ยอดรวม = ยอดสินค้า + ค่าจัดส่ง,
    สถานะและวิธีชำระเงินอยู่ในชุดที่กำหนด
- **Shared** (`packages/shared/src/commerce.ts`): product/order/cart Zod schema, `formatBaht`/`parseBaht`,
  `cartTotals`, `shippingFeeFor`, cookie cart parser, สถานะที่เปลี่ยนได้ (`canTransitionOrder`),
  และตัวสร้าง **PromptPay payload แบบ EMVCo + CRC-16/CCITT-FALSE** (ทดสอบกับ `123456789 → 29B1`)
- **API**: `commerce` module
  - แอดมิน: `/products` (CRUD + archive), `/orders` (list/detail/เปลี่ยนสถานะ), `/commerce/settings`
    (พร้อมเพย์ ค่าจัดส่ง เกณฑ์ส่งฟรี เปิด/ปิดวิธีจ่าย)
  - สาธารณะ: `/public/:host/shop`, `/shop/products/:slug`, `POST /shop/cart` (คิดราคาจาก DB),
    `POST /shop/orders`, `GET /shop/orders/:token`
  - checkout คิดราคาและตัดสต็อกใน transaction เดียว; `updateMany` แบบมีเงื่อนไขกันขายเกินสต็อก
    เมื่อมีคนซื้อพร้อมกัน, honeypot + rate limit 20/นาที, เก็บ audit `order.create`/`order.status`
  - ยกเลิกคำสั่งซื้อจะคืนสต็อกเฉพาะสินค้าที่มีจำนวนจำกัด; token เดาไม่ได้ใช้ดูสถานะโดยไม่ต้องมีบัญชี
- **แอดมิน**: เมนู “เนื้อหา › สินค้า/คำสั่งซื้อ” + “ตั้งค่า › ตั้งค่าร้านค้า” (คงเมนูหลัก 5 กลุ่ม)
  - สินค้า: เพิ่ม/แก้/เก็บ (undo ได้), เลือกรูปจากคลังสื่อ, ราคาเป็นบาทแต่เก็บเป็นสตางค์
  - คำสั่งซื้อ: กรองสถานะ, เปิดรายละเอียด, รับชำระ/จัดส่ง/ปิดงาน/ยกเลิก พร้อมเลขพัสดุ
  - ตั้งค่า: พร้อมเพย์, ค่าจัดส่ง, เกณฑ์ส่งฟรี, เปิด/ปิด promptpay/COD (owner/admin เท่านั้น)
- **เว็บจริง** (ไม่เพิ่ม client JS): `/shop`, `/shop/[slug]`, `/cart`, `/checkout`, `/order/[token]`
  - ตะกร้าเป็น cookie `lumio_cart` (httpOnly) + ฟอร์ม HTML ธรรมดา; ราคาคิดใหม่ทุกครั้งที่เซิร์ฟเวอร์
  - checkout ตรวจ schema ฝั่งเซิร์ฟเวอร์, สร้างคำสั่งซื้อ, ล้างตะกร้า แล้วพาไปหน้ายืนยันด้วย token
  - หน้ายืนยันแสดง QR พร้อมเพย์ (สร้าง SVG ฝั่งเซิร์ฟเวอร์ด้วย `qrcode`), เบอร์โทรถูกปิดบางส่วน
  - Product JSON-LD, canonical, OG image และเพิ่มสินค้าที่เปิดขายลง `sitemap.xml`
- **Seed**: สินค้า 3 รายการ + คำสั่งซื้อตัวอย่าง 1 รายการของร้านกาแฟบ้านดอย และตั้งค่าพร้อมเพย์ใน `sites.settings.commerce`

คำสั่งเฉพาะก้อนที่ 37

```bash
pnpm --filter api exec prisma migrate deploy   # products/orders/order_items
pnpm --filter api test src/modules/commerce
pnpm --filter @lumio/shared test commerce
pnpm --filter admin test src/commerce src/route.test.ts
pnpm --filter renderer test
```

## ก้อนที่ 38 — Template ต่อ (ร้านค้า + บล็อก)

เพิ่ม template pack จาก 3 เป็น 5 แบบตาม `lumio-template-pack` (สลับแล้วเนื้อหาผู้ใช้ไม่หาย)

- **สานศิลป์** (`templates/saransin-shop`, businessType `shop`): งานแฮนด์เมด โทนดินเผา/ครีม
  - หน้าแรก, สินค้าทั้งหมด, เกี่ยวกับเรา, โปรโมชัน, ติดต่อร้าน (ข้อความไทยจริงทั้งหมด)
  - เมนูเชื่อม `/shop` ของ renderer, header/footer เป็น global blocks, section styles ของแทมเพลต
- **เมฆขาว** (`templates/mekkhao-blog`, businessType `blog`): บล็อกเล่าเรื่องเมือง
  - หน้าแรก, หัวข้อ, เกี่ยวกับ, ติดต่อ และบทความตัวอย่าง 1 ชิ้น (`type: post`)
  - เมนูเชื่อม `/posts`, ใช้ token สีเทา-เหลืองอำพัน
- อัปเดต `templates/index.json` และสร้าง `preview.png` ใหม่ทั้ง 5 แบบด้วยสคริปต์เดิม
- ตรวจว่า `template-store` โหลดครบ 5 แพ็กและเนื้อหาตัวอย่างไม่ใช่ placeholder

คำสั่งเฉพาะก้อนที่ 38

```bash
node templates/generate-previews.mjs
pnpm --filter api test src/modules/templates
```

## ก้อนงานถัดไปที่แนะนำ (หลังก้อนที่ 38)

- **Stripe สำหรับคำสั่งซื้อของร้าน** — ตอนนี้รับพร้อมเพย์ (QR) และเก็บเงินปลายทาง แล้วแอดมินกดยืนยัน;
  ยังไม่มีบัตร/E-wallet ระดับคำสั่งซื้อ (Stripe ปัจจุบันใช้กับการชำระแพ็กเกจของแพลตฟอร์มเท่านั้น)
- **อัปโหลดสลิป / ยืนยันการชำระอัตโนมัติ** — ตอนนี้ผู้ขายยืนยันเองจากหน้าคำสั่งซื้อ
- **ตัวเลือกสินค้า (ไซซ์/สี) และค่าส่งตามน้ำหนัก/พื้นที่** — โมเดลปัจจุบันเป็นราคาเดียวต่อสินค้า
- **ใบเสร็จ/อีเมลยืนยันคำสั่งซื้อ** — ยังไม่ส่งอีเมลอัตโนมัติเมื่อมีคำสั่งซื้อใหม่
- **เทมเพลตเพิ่มจาก 5 → 10** — roadmap 19.3 เป้าหมาย beta 10 แบบ/launch 20 แบบ
- งานที่ยกจากก้อนก่อน ๆ: HTTP integration test ของ billing/apps/CDN purge,
  backup ของสินค้า/คำสั่งซื้อ (ปัจจุบัน backup ยังไม่รวมตารางร้านค้า)

## ก้อนที่ 39 — ปิดงานค้างร้านค้า (อีเมล, backup, บัตร Stripe)

เก็บสามข้อที่เคยบันทึกว่าเหลือจากก้อนที่ 37

- **อีเมลคำสั่งซื้อ** — `common/mailer.ts` ส่งผ่าน Resend REST (`RESEND_API_KEY`, `EMAIL_FROM`)
  - ไม่ตั้งคีย์ = เขียน log แทน (ไม่ทำให้ checkout ล้ม) และส่งไม่สำเร็จก็ไม่ throw
  - `OrderNotifier` ส่งอีเมลยืนยันให้ลูกค้า (ถ้ามีอีเมล) + แจ้งเจ้าของร้านเมื่อมีออเดอร์ใหม่
    พร้อมรายการสินค้า ยอดรวม วิธีชำระ และลิงก์ `/order/:token`
  - เมื่อเจ้าของร้านเปลี่ยนสถานะ (ชำระแล้ว/จัดส่ง/สำเร็จ/ยกเลิก) ระบบส่งอีเมลแจ้งลูกค้า
    และแนบเลขพัสดุเมื่อจัดส่ง
  - ใช้ `PUBLIC_ROOT_DOMAIN`/โดเมนหลักที่ verify แล้วสร้างลิงก์ และ `ADMIN_ORIGIN` ในอีเมลเจ้าของร้าน
- **backup ร้านค้า** — `siteExportSchema` เพิ่ม `products` และ `orders` (optional อ่านไฟล์เก่าได้)
  - สินค้าเก็บรูปเป็น **ชื่อไฟล์** เพราะการกู้คืนสร้างแถว media ใหม่; ตอน import จะแมปชื่อ→id ใหม่
    (รูปที่กู้ไม่ได้จะถูกข้าม แต่สินค้ายังอยู่)
  - คำสั่งซื้อเก็บ snapshot รายการ/ยอด/สถานะ/วันที่ โดยไม่ผูกกับ id สินค้าเดิม;
    import จะพยายามเชื่อม `productId` ด้วยชื่อสินค้าที่มีอยู่ และข้ามเลขออเดอร์ที่ซ้ำ
  - ผลลัพธ์/audit/ข้อความในแอดมินรายงานจำนวนสินค้าและคำสั่งซื้อที่กู้คืน
- **บัตรเครดิตผ่าน Stripe** — migration `20261104000000_order_stripe`
  - `orders.provider`, `provider_ref`, `payment_url`; `payment_method` เพิ่ม `card`
  - `stripe-order.ts` สร้าง Checkout Session (line items + ค่าส่ง, metadata siteId/orderNumber/orderToken,
    success/cancel กลับมาที่ `/order/:token`) โดยไม่ต้องใช้ SDK
  - ถ้า Stripe ล้ม ระบบยกเลิกออเดอร์ที่เพิ่งสร้างและคืนสต็อกทันที (ไม่ค้างสต็อก)
  - webhook เดิมของ billing รับ `checkout.session.completed`/`async_payment_succeeded`
    ที่มี `metadata.orderNumber` แล้วปิดออเดอร์เป็น paid ผ่าน `CommerceService.markOrderPaidByNumber`
  - แอดมินมีสวิตช์ “บัตรเครดิต/เดบิต”; เปิดไม่ได้ถ้าไม่มี `STRIPE_SECRET_KEY`
  - หน้า checkout เพิ่มวิธีจ่ายบัตรและ redirect ไป Stripe; หน้ายืนยันมีปุ่มเปิดหน้าจ่ายเงินอีกครั้ง
- **เทสต์**: backup สินค้า/ออเดอร์, mailer, order notifier, Stripe session builder, webhook shop order,
  card checkout (mock Stripe) — รวม repo **1,595 เคส**

คำสั่งเฉพาะก้อนที่ 39

```bash
pnpm --filter api exec prisma migrate deploy   # orders.provider/provider_ref/payment_url
RESEND_API_KEY=... EMAIL_FROM=... pnpm --filter api dev
pnpm --filter api test src/modules/commerce src/modules/backup src/modules/billing src/common/mailer.spec.ts
```

**ยังเหลือของร้านค้า**: อัปโหลดสลิป/ยืนยันการชำระอัตโนมัติ, ตัวเลือกสินค้า (ไซซ์/สี),
ค่าส่งตามน้ำหนัก/พื้นที่, อีเมลใบเสร็จแบบ HTML/PDF, การโอนเงินให้ผู้ขาย (Stripe Connect),
เทมเพลต 5 → 10 แบบ และ integration test ที่ยิง Stripe จริงด้วย test key

## ก้อนที่ 40 — ปิดงานค้างร้านค้า สื่อ และการเผยแพร่

เก็บครบทั้งเจ็ดข้อที่ค้างจากก้อนที่ 39

- **สลิปพร้อมเพย์ + ยืนยันการชำระเงิน** — `POST /public/:host/shop/orders/:token/slip` รับไฟล์จริง
  (JPEG/PNG/WebP, จำกัดขนาด, ตรวจ magic bytes, สแกนไวรัส) เก็บใน storage เดียวกับคลังสื่อ
  - สลิปยอดตรงและร้านเปิดตรวจอัตโนมัติ = ปิดออเดอร์เป็น `paid` ทันที; ไม่ตรง/ตรวจไม่ได้ = เข้าคิวรอเจ้าของร้าน
  - แอดมินเห็นสลิป เปิดดูรูป และกดอนุมัติ/ปฏิเสธ (มี undo ผ่านสถานะเดิม) พร้อม audit
- **ตัวเลือกสินค้า (ไซซ์/สี)** — `products.options` + ตาราง `product_variants` (ราคา/สต็อก/SKU ต่อ combination)
  - แอดมินพิมพ์ “ไซซ์: S, M, L” แล้วสร้างทุกชุดอัตโนมัติ, กำหนดราคา/สต็อกแยกได้
  - หน้าร้านเลือกตัวเลือกก่อนหยิบใส่ตะกร้า; ตะกร้า/ออเดอร์เก็บ snapshot ป้ายตัวเลือกไว้
- **ค่าส่งแบบ fix / ตามน้ำหนัก / ตามพื้นที่** — `shippingFee`, `shippingPerKgFee`, `shippingZones`
  (จังหวัด → ค่าส่ง) รวมกับเกณฑ์ส่งฟรี; คิดใหม่ที่เซิร์ฟเวอร์ทุกครั้ง (ตะกร้า/checkout)
- **เลือกวิธีชำระเงินที่แสดง** — สวิตช์ promptpay / โอนผ่าน BBL / บัตร (Stripe) / เก็บเงินปลายทาง
  ในตั้งค่าร้าน; checkout แสดงเฉพาะวิธีที่เปิดและพร้อมใช้งานจริง
- **ใบเสร็จ HTML + PDF** — ข้อมูลชุดเดียวจาก `receiptFromOrder()`
  - `GET /public/:host/shop/orders/:token/receipt` (พิมพ์จากเบราว์เซอร์)
  - `.../receipt.pdf` สร้างด้วย pdfkit + ฟอนต์ไทยที่มากับ API (ไม่ต้องใช้ headless browser)
  - ใบเสร็จชั่วคราวก่อนชำระ, แสดงเลขพัสดุ/วิธีจ่าย/ที่อยู่ และปิดข้อมูลลูกค้าบางส่วนบนหน้าเว็บ
- **Webhook ไประบบอื่น** — ตั้งค่าใน ตั้งค่าร้าน (owner/admin)
  - `GET/PATCH /commerce/webhook` + `POST /commerce/webhook/test`
  - event `order.created` / `order.paid` / `order.status`; ส่งจาก checkout, เปลี่ยนสถานะ, อนุมัติสลิป
    และ webhook ของ Stripe/BBL (ผ่าน `updateOrderStatus` จุดเดียว)
  - ลงชื่อ `x-lumio-signature: sha256=<hex>` ของ `<timestamp>.<body>`; secret เข้ารหัส AES-256-GCM
    และไม่ถูกส่งกลับ; URL ต้องเป็น https บนโฮสต์สาธารณะ (ตรวจ DNS ทุก address กัน SSRF)
  - 4xx = ไม่ลองซ้ำ, timeout/5xx = ลองไม่เกิน 3 ครั้ง; ล้มเหลวไม่ทำให้ checkout/เปลี่ยนสถานะล้ม
- **Bulk actions คลังรูป** — `PATCH /media/bulk` (สูงสุด 100 รูป)
  - ติ๊กเลือกรูปหลายใบ → แก้คำอธิบายทีละรูปในหน้าต่างเดียว หรือย้ายไปโฟลเดอร์พร้อมกัน
  - ตรวจว่าโลโก้ทุกรูปเป็นของเว็บนี้และไม่ถูกทิ้ง; audit ครั้งเดียว และ toast เลิกทำคืนค่าเดิมทีละรูป
- **Preview ฉบับร่าง + robots + ISR ต่อ host**
  - `POST /contents/:id/preview-link` ออกลิงก์อายุ 1 ชม. (HMAC ด้วย `PREVIEW_SECRET`)
  - `GET /preview/:token` คืนหน้า draft; `no-store`, `x-robots-tag: noindex`, ไม่บันทึก pageview
  - หน้า renderer `/preview/[token]` แสดงแถบ “ตัวอย่างฉบับร่าง” และ metadata noindex
  - robots.txt ตัด `/preview/`, `/api/`, `/cart`, `/checkout`, `/order/`; หน้า noindex ยังใช้ meta robots + ไม่เข้า sitemap
  - cache ข้อมูลต่อ host (tag `site:<host>`) และ publish ส่ง host ไป `/api/revalidate` เพื่อล้างเฉพาะเว็บนั้น
    (ปรับได้ด้วย `RENDERER_CACHE_SECONDS`)

คำสั่งเฉพาะก้อนที่ 40

```bash
PREVIEW_SECRET=... pnpm --filter api dev
pnpm --filter api test src/modules/commerce src/modules/media src/common/preview-token.spec.ts
pnpm --filter renderer test
pnpm --filter admin test src/media src/commerce src/editor
pnpm --filter @lumio/shared test
```

- เทสต์ใหม่: webhook (ลงชื่อ/SSRF/retry/หัวข้อ), preview token (หมดอายุ/ปลอม/secret ผิด),
  bulk media (สำเร็จ/รูปไม่ครบ), shared schema และ host ของ revalidate
- ผลตรวจ: lint / typecheck / test ผ่านทุกแพ็กเกจ รวม **1,746 เคส**
  (shared 286, tokens 10, sdk 12, ui 70, blocks 124, api 742, admin 402, renderer 100)

**ยังเหลือ**: integration test ที่ยิง Stripe จริงด้วย test key, ใบเสร็จแนบอีเมลอัตโนมัติ,
ตัวเลือกสินค้าหลายมิติแบบ matriz ราคาเต็มรูปแบบ, และ full static export ต่อ host (ตอนนี้เป็น ISR data cache ต่อ host)

## ก้อนที่ 41 — จัดการเปลี่ยนเส้นทาง (Redirect manager)

เปิดใช้งานตาราง `redirects` ที่มีอยู่แล้ว (renderer อ่านกฎนี้มานาน แต่ไม่มีทางจัดการในแอดมิน)

- **Shared** — `packages/shared/src/redirect.ts`
  - `normalizeRedirectPath()` เติม `/` หน้า, ตัด `/` ท้าย, ยุบ `//` (ยกเว้นหน้าแรก `/`)
  - schema รับ 301/302, ปลายทางเป็นที่อยู่ในเว็บหรือ `https://` ของเว็บอื่น, กัน loop, กันส่งหน้าแรกออก, กัน `?`/`#`/ช่องว่าง/แบ็กสแลช
- **API** — `apps/api/src/modules/redirects`
  - `GET/POST/PATCH/DELETE /v1/redirects` ใต้ `AuthGuard + SiteGuard + RolesGuard`
  - อ่านได้ทุก role, เขียนได้ owner/admin/editor; ทุก query ผ่าน `forSite` (RLS) และเขียน audit `redirect.create/update/remove`
  - ลบด้วย `?from=` (path มี `/` จึงไม่ใช้ path param), ที่อยู่เดิมซ้ำตอบ 409, ไม่พบตอบ 404
- **แอดมิน** — แท็บ “เปลี่ยนเส้นทาง” ในหน้าตั้งค่า: ฟอร์มเพิ่ม, แก้ปลายทาง/ประเภทในแถวเดิม, ลบพร้อม Toast “ลบแล้ว — เลิกทำ” (คืนกฎเดิม), โหมดเดโมมีตัวอย่าง 1 กฎ
- **เทสต์ใหม่ 27 เคส** (shared 10, api 14 รวม HTTP 4, admin 3) รวม repo **1,773 เคส**
  (shared 296, tokens 10, sdk 12, ui 70, blocks 124, api 756, admin 405, renderer 100)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` ผ่านทั้งหมด

```bash
pnpm --filter @lumio/shared test redirect
pnpm --filter api test src/modules/redirects src/http/api.spec.ts
pnpm --filter admin test src/settings
```

## ก้อนที่ 42 — ครอปรูปในคลังสื่อ

ปิดช่องว่างของคลังสื่อตาม `docs/design/03-scope.md` (อัปโหลด, ครอป, บีบอัด)

- **ฐานข้อมูล** — migration `20261106000000_media_crop` เพิ่ม `media.crop` (JSONB)
- **Shared** — `mediaCropSchema` (สัดส่วน x/y/width/height, กันกรอบเกินขอบ), `clampMediaCrop()` สำหรับ UI, `mediaCropBox()` แปลงเป็นพิกเซลสำหรับ sharp
- **Pipeline** — `SharpImagePipeline.render()` รับ `crop` แล้วตัดทุกระยะด้วย `extract()`; คีย์ไฟล์เดิมยังถูกเขียนทับ เพื่อให้ block ที่เก็บ `srcset` ไว้แล้วแสดงรูปที่ครอปโดยไม่ต้องแก้เนื้อหา
  - ภาพครอปได้ไฟล์ fallback `...-crop.webp` แทนต้นฉบับเต็ม (ไม่ให้รูปเต็มหลุดเข้า `srcset` อีก)
- **API** — `PATCH /media/:id` รับ `crop` (หรือ `null` เพื่อกลับไปรูปเต็ม), ตั้งสถานะ `processing` และเข้าคิวเรนเดอร์ใหม่
  - กัน GIF เคลื่อนไหว และรูปที่ยังเรนเดอร์ไม่เสร็จ; audit บันทึกฟิลด์ที่เปลี่ยน; เลิกทำใน UI เรียก `crop` ค่าเดิมกลับมา
- **แอดมิน** — คลังสื่อมีส่วน “ครอปรูป”: พรีวิวกรอบ + สไลเดอร์ซ้าย/บน/กว้าง/สูง, บันทึก/กลับไปรูปเต็ม, Toast พร้อมเลิกทำ
- **เทสต์ใหม่ 14 เคส** (shared 6, api 5, admin 3) รวม repo **1,787 เคส**
  (shared 302, tokens 10, sdk 12, ui 70, blocks 124, api 761, admin 408, renderer 100)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` ผ่านทั้งหมด และ apply migration กับ DB จริงแล้ว

```bash
pnpm --filter api exec prisma migrate deploy   # media.crop
pnpm --filter @lumio/shared test media
pnpm --filter api test src/modules/media
pnpm --filter admin test src/media
```

## ก้อนที่ 43 — ปิด MVP ที่ยังขาด (อีเมลจริง, สำรองอัตโนมัติ, OG, 404, static)

ปิดห้าข้อที่ตรวจแล้วยังขาดจาก MVP (docs/design/03-scope.md 3.1, 14-seo-performance.md)

- **อีเมลของเว็บ (ลูกค้าตั้งเองได้)** — `GET/PATCH /v1/email/settings`, `POST /v1/email/test`
  - ตั้งค่าใน ตั้งค่า › อีเมล: SMTP (host/port/TLS/ผู้ใช้/รหัสผ่าน) หรือ Resend API key
  - รหัสผ่าน/คีย์เข้ารหัส AES-256-GCM ด้วย `SECRETS_ENCRYPTION_KEY` และไม่ถูกส่งกลับ (ส่งกลับแค่ `hasPassword`/`hasApiKey`)
  - ผู้รับเริ่มต้นของเว็บ + ผู้รับเฉพาะฟอร์ม; ถ้าเว็บยังไม่ตั้งค่า ใช้ผู้ส่งกลาง `RESEND_API_KEY` เดิม
  - ปุ่ม “ส่งอีเมลทดสอบ” ยิงอีเมลจริงและรายงานผลเป็นภาษาคน; audit `email.settings.update` / `email.test`
- **ฟอร์มติดต่อส่งอีเมลจริง** — `SiteFormNotifier` ใช้ `EmailService` ส่งถึงผู้รับของฟอร์ม/เว็บ
  - แนบ `Reply-To` ของผู้ส่งข้อความ, ยังส่ง LINE Notify ตามเดิม, ส่งไม่สำเร็จไม่ทำให้ผู้เข้าชมเห็น error
- **สำรองข้อมูลอัตโนมัติ** — ตาราง `site_backups` (RLS) + `BackupScheduler` ใน worker
  - ตั้งเวลา/จำนวนวันเก็บใน ตั้งค่า › Backup, ทำงานวันละครั้งหลังเวลาที่เลือก, ลบไฟล์เกินอายุ
  - `GET /v1/backup/overview`, `PATCH /v1/backup/schedule`, `POST /v1/backup/snapshots`, `GET /v1/backup/snapshots/:id`
  - snapshot เก็บ JSON โดยไม่แนบไฟล์สื่อ (ขนาดเล็ก) และดาวน์โหลดกลับได้
- **OG image อัตโนมัติ** — เส้นทาง `/og` ใช้ `next/og` + ฟอนต์ไทยที่มากับ renderer
  - ทุกหน้าได้ `og:image` แม้ผู้ใช้ไม่เคยตั้ง; รูปที่ผู้ใช้ตั้งเองยังชนะ (`buildMetadata`)
- **404 monitor** — ตาราง `not_found` (RLS) + `POST /public/:host/not-found`
  - renderer รายงานเฉพาะ path (ตัด query/hash), rate limit และไม่บล็อกการแสดงหน้า
  - `GET /v1/seo/not-found` + การ์ด “ลิงก์ที่เปิดไม่เจอ” ใน เติบโต › SEO พร้อมปุ่มไปตัวจัดการเปลี่ยนเส้นทาง
- **static publish + Lighthouse CI**
  - `StaticPublisher` ดึง HTML ที่ renderer เพิ่งสร้าง แล้ว POST ไป `STATIC_PUBLISH_URL` พร้อม `x-lumio-signature` (HMAC)
  - ไม่ตั้งค่า = no-op (ยังใช้ ISR); ล้มเหลวไม่ทำให้ publish ล้ม
  - `.lighthouserc.json` + `lighthouse-budget.json` และ job `lighthouse` ใน CI (JS ≤ 100 KB, CSS ≤ 50 KB, third-party 0)
- **migration**: `20261107000000_site_backups`, `20261108000000_not_found` (apply กับ DB จริงแล้ว)
- เทสต์ใหม่ 51 เคส (shared 22, api 23, admin 7, renderer 4) รวม repo **1,838 เคส**
  (shared 319, tokens 10, sdk 12, ui 70, blocks 124, api 784, admin 415, renderer 104)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` ผ่านทั้งหมด; `NODE_ENV=production pnpm --filter renderer build` ผ่าน

```bash
pnpm --filter api exec prisma migrate deploy   # site_backups, not_found
SECRETS_ENCRYPTION_KEY=... pnpm --filter api dev
pnpm --filter api test src/modules/email src/modules/backup src/modules/publish src/modules/seo
pnpm --filter admin test src/settings
pnpm --filter renderer test
```

**ยังเหลือ (นอก MVP)**: refund/คืนสินค้า, แนบใบเสร็จในอีเมลอัตโนมัติ, integration test ที่ยิง Stripe จริง,
Membership/paywall, ระบบจองคิวจริง, Block Marketplace, Agency/White-label, Public API keys และ e2e test

## ก้อนที่ 44 — ปิด MVP ส่วนที่เหลือ (CDN ที่ลูกค้าตั้งเอง, โดเมน/SSL อัตโนมัติ, Lighthouse)

เก็บ Definition of Done ที่ยังเปิดอยู่ของ `docs/design/03-scope.md` 3.1 และ 19.4
โดยยึดกฎ “ทุกอย่างห้ามอยู่ใน .env ลูกค้าตั้งค่าเองได้ทั้งหมด”

- **ตั้งค่า › การเผยแพร่ (ต่อเว็บ)** — `settings.publish` ใน `sites.settings`
  - ช่อง renderer URL, static host URL + คีย์ลงชื่อ, CDN purge URL + คีย์, สวิตช์ล้างแคช
  - คีย์เข้ารหัส AES-256-GCM และ **ไม่ถูกส่งกลับ** (ส่งกลับแค่ `hasStaticPublishSecret` / `hasCdnPurgeSecret`)
  - API: `GET/PATCH /v1/publish/settings` และ `POST /v1/publish/test` (owner/admin, rate limit 5/นาที)
  - ปุ่ม “ทดสอบการเผยแพร่” ส่งหน้าแรกขึ้นโฮสต์จริงแล้วรายงานเวลาเป็นภาษาคน
  - ไม่ต้องแก้ `.env` เลย: เว็บที่ยังไม่ตั้งค่าใช้ ISR ต่อไป และแบนเนอร์บอกสิ่งที่ยังขาด
- **กุญแจเข้ารหัสไม่ต้องตั้งใน .env** — `secret-box.ts` สร้างกุญแจ 32 ไบต์อัตโนมัติครั้งแรก
  เก็บที่ `<LUMIO_DATA_DIR|.lumio-data>/secrets.key` (โหมด 0600); ถ้ามี `SECRETS_ENCRYPTION_KEY` ก็ยังใช้ค่านั้น
- **Static publish ภายใน 10 วินาที** — `StaticPublisher`
  - เขียนสูงสุด 6 หน้าพร้อมกัน ภายใต้งบ 9 วินาที (เหลือ margin จากเป้า 10 วินาที)
  - แต่ละคำขอมี timeout และหน้าไหนไม่ทันถูกนับเป็น failure อย่างชัดเจน (ไม่หายเงียบ)
  - `PublishProcessor` ทำ revalidate → (static upload ∥ CDN purge) และบันทึก `lastRun` (เวลา/ผล/หน้าที่ล้มเหลว)
    ลง `sites.settings.publish` ให้หน้าจอแสดง “เผยแพร่ล่าสุดใช้เวลา X วินาที”
- **Custom Domain + SSL อัตโนมัติ** — `DomainsService.autoVerify()` + `DomainsVerifier`
  - worker ตรวจโดเมนที่ยัง `pending` ทุก 5 นาที เปิด `sslStatus: active` + audit `domain.verify.auto`
    เมื่อ DNS ชี้มาแล้ว ลูกค้าไม่ต้องกลับมากดยืนยัน
  - Caddy ยังขอใบรับรองผ่าน `on_demand_tls.ask` เฉพาะโดเมนที่ active (18.5) จึงได้ SSL เอง
  - หน้าตั้งค่า › โดเมนอธิบายว่าตรวจ/ออก SSL ให้อัตโนมัติ
- **Lighthouse ≥ 90 บังคับใน CI** — `.lighthouserc.json`
  - performance / accessibility / best-practices / SEO เป็นระดับ `error` ที่ ≥ 0.9
  - LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms; budget JS/CSS/ฟอนต์เดิมยังอยู่
- **Undo/Redo + version history** — ตรวจแล้วว่าทำงานครบ (คีย์ลัด Ctrl/⌘+Z, Shift+Z/Y, แผงประวัติเวอร์ชัน)
- **เทสต์ใหม่ 22 เคส** (shared 6, api 13, admin 3) รวม repo **1,860 เคส**
  (shared 325, tokens 10, sdk 12, ui 70, blocks 124, api 797, admin 418, renderer 104)
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` ผ่านทั้งหมด

```bash
pnpm --filter @lumio/shared test publish
pnpm --filter api test src/modules/publish src/modules/domains
pnpm --filter admin test src/settings/PublishPanel.test.tsx
```

**ยังเหลือ (นอก MVP)**: refund/คืนสินค้า, แนบใบเสร็จในอีเมลอัตโนมัติ, integration test ที่ยิง Stripe จริง,
Membership/paywall, ระบบจองคิวจริง, Block Marketplace, Agency/White-label, Public API keys และ e2e test

## ก้อนที่ 45 — เทมเพลต 5 → 10 แบบ

ปิดเป้า beta ของ roadmap 19.1 (Template 10 แบบ) โดยยังไม่แตะเนื้อหาของผู้ใช้

- เพิ่ม 5 แพ็กที่ `templates/` พร้อม `tokens.json`, `menus.json`, `global-blocks.json`,
  `section-styles.json`, หน้าไทยจริง 4–5 หน้า และ `preview.png`
  - **ครัวริมน้ำ** (restaurant) — ร้านอาหารไทยริมน้ำ โทนเขียว-ส้ม
  - **คลินิกใจดี** (clinic) — คลินิกเวชกรรมชุมชน โทนฟ้าเทอร์ควอยซ์
  - **ภาพบ้านทุ่ง** (freelance) — ช่างภาพธรรมชาติ/งานแต่ง โทนมินิมอล
  - **ดอกไม้บ้านสวน** (shop) — ร้านดอกไม้ จัดส่งวันเดียวกัน โทนกุหลาบ-ครีม
  - **เสียงเมือง** (blog) — บล็อกเล่าเรื่องเมือง โทนครามเข้ม
- `templates/index.json` ครบ 10 แพ็ก; wizard และหน้า “เปลี่ยน Template” เห็นครบโดยไม่ต้องแก้โค้ด
- ตรวจว่า `TemplatesService` โหลดครบ 10 แพ็กในเทสต์ (log “โหลดเทมเพลต 10 แบบ”)

```bash
node templates/generate-previews.mjs
pnpm --filter api test src/modules/templates
```

## ก้อนที่ 46 — Feature flags (สวิตช์ส่วนเสริม)

ปิดข้อ 3.6 ของ `docs/design/03-scope.md` (ทุกฟีเจอร์เฟส 2–3 ต้องอยู่หลัง flag)

- **Shared** — `packages/shared/src/flags.ts`: 5 ส่วนที่เปิด/ปิดได้ (AI, สถิติ, ข่าวสาร, Apps, ร้านค้า)
  - ลำดับการตัดสิน: kill switch ระดับแพลตฟอร์ม (`LUMIO_DISABLED_FEATURES`) → ค่าของเว็บ (`sites.settings.flags`) → ค่าเริ่มต้น “เปิด”
  - เว็บเดิมจึงไม่เสียเมนูใด ๆ หลัง deploy และปิดเฉพาะส่วนที่ไม่ใช้ได้ทันที
- **API** — `GET/PATCH /v1/features` (อ่านได้ทุก role, แก้ owner/admin) + audit `site.features.update`
  - `FeatureGuard` + `@RequireFeature(...)` กัน `/ai`, `/analytics`, `/subscribers`, `/apps`, `/commerce` ทั้งกลุ่ม
  - ร้านค้าฝั่งผู้เข้าชม (`/public/:host/shop`) ตรวจ flag เดียวกันและตอบ 404 แบบภาษาคน
  - ส่วนที่ถูกปิดโดยแพลตฟอร์มเปิดเองไม่ได้ (409 พร้อมบอกเหตุผล)
- **แอดมิน** — ตั้งค่า › ส่วนเสริม: สวิตช์ต่อส่วน, ป้าย “ปิดโดยผู้ดูแลระบบ”, toast พร้อม “เลิกทำ”
  - เมนูและ command palette ซ่อนรายการของส่วนที่ปิด และ deep link ที่ค้างอยู่กลับไป Dashboard
- เทสต์ใหม่ 22 เคส (shared 12, api 10) รวมทั้งซ่อนเมนู/route และการกัน route

```bash
pnpm --filter @lumio/shared test flags
pnpm --filter api test src/modules/features
pnpm --filter admin test src/settings/FeaturesPanel.test.tsx src/shell/nav.test.ts
```

## ก้อนที่ 47 — คืนเงินคำสั่งซื้อ + ใบเสร็จในอีเมล

เก็บสองข้อที่ค้างจากก้อนที่ 43–44

- **คืนเงิน** — migration `20261109000000_order_refund`
  - `orders.refunded_amount/refunded_at/refund_reason/refund_ref` + สถานะใหม่ `refunded`
  - `POST /v1/orders/:orderId/refund` (owner/admin): คืนเต็มจำนวนหรือบางส่วน, เหตุผล, เลือกคืนสต็อก
  - บัตรที่จ่ายผ่าน Stripe: ใช้ payment intent ที่ webhook เก็บไว้เรียก `/v1/refunds`
    (ไม่สำเร็จ = 409 พร้อมเหตุผล โดยไม่แตะยอดในฐานข้อมูล)
  - คืนสินค้าเข้าสต็อกทั้งสินค้าและตัวเลือก, audit `order.refund`, webhook ใหม่ `order.refunded`
  - แอดมิน: ปุ่ม “คืนเงินลูกค้า” + โมดัลยอด/เหตุผล/คืนสต็อก, สรุปยอดคืนในหน้าคำสั่งซื้อ, ตัวกรองสถานะ
  - ผู้เข้าชมเห็นยอดและเหตุผลการคืนเงินบนหน้าคำสั่งซื้อ
- **ใบเสร็จทางอีเมล** — `OrderNotifier` แนบ PDF (`renderReceiptPdf`) เมื่อสถานะเปลี่ยนเป็น `paid`
  - `Mailer` และ `EmailService` ส่งไฟล์แนบได้ทั้ง Resend (base64) และ SMTP (attachment)
  - เรนเดอร์ไม่สำเร็จ = ส่งอีเมลโดยไม่มีไฟล์แนบ (ไม่ทำให้การแจ้งเตือนล้ม)
- เทสต์ใหม่ 22 เคส (shared 6, api 16) รวม PDF จริงเริ่มด้วย `%PDF`

```bash
pnpm --filter api exec prisma migrate deploy   # orders.refunded_*
pnpm --filter @lumio/shared test commerce webhook
pnpm --filter api test src/modules/commerce
```

## ก้อนที่ 48 — E2E (Playwright) + CI

ปิดช่อง “ไม่มี e2e test” ที่ค้างมาตั้งแต่ก้อนที่ 43

- `playwright.config.ts` รันแอดมินโหมดเดโม (ไม่ต้องมี API/ฐานข้อมูล) ด้วย `VITE_API_URL=''`
- 3 เส้นทางหลักใน `e2e/admin.e2e.ts`: เข้าสู่ระบบ → Dashboard, ปิดส่วนเสริมแล้วเห็น toast,
  คืนเงินคำสั่งซื้อที่ชำระแล้วจนเห็นยอดคืนและเหตุผล
- `pnpm test:e2e` (ครั้งแรก: `pnpm test:e2e:install")
- CI job `e2e` ติดตั้ง Chromium, รันเทสต์ และเก็บ `test-results/` เมื่อล้ม
- ผลตรวจรอบนี้: lint / typecheck / test / e2e ผ่านทั้งหมด — **1,904 เคส**
  (shared 340, tokens 10, sdk 12, ui 70, blocks 124, api 819, admin 425, renderer 104) + e2e 3 เส้นทาง

**ยังเหลือ (นอก MVP)**: integration test ที่ยิง Stripe จริงด้วย test key, Membership/paywall,
ระบบจองคิวจริง, Block Marketplace, Agency/White-label, Public API keys และเทมเพลต 10 → 20 แบบ

## งานถัดไปที่ยังไม่เริ่ม (บันทึกไว้ให้ทำในก้อนแยก)

> ตกลงกันเมื่อ 2026-10-22: เปิดตัวเป็น **Community edition** ก่อน
> สองส่วนนี้ยังไม่สร้าง แต่ต้องไม่ลืม — ของที่ต้องมีเมื่อทำเสร็จอยู่ในหัวข้อด้านล่าง

### ก้อนถัดไป A — Membership / Paywall (เฟส 3) — ✅ เสร็จแล้วในก้อนที่ 60

ดูรายละเอียดที่ก้อนที่ 60 ด้านล่าง; ที่ยังเหลือจริงคือ integration test ที่ยิง Stripe จริงด้วย test key

### ก้อนถัดไป B — Block Marketplace (เฟส 2) — ✅ เสร็จแล้วในก้อนที่ 61

- คลัง Block/ชุดส่วนจากภายนอกพร้อม manifest ที่ลงลายเซ็น และตรวจลายเซ็นก่อนติดตั้ง
- ติดตั้ง/ถอน/อัปเดตต่อเว็บ, เก็บเวอร์ชัน, และไม่ให้ block ที่ถอนแล้วทำหน้าเว็บพัง (fallback)
- ต้องมี sandbox/สิทธิ์เข้าถึงข้อมูลแบบเดียวกับ Apps และ audit ทุกการติดตั้ง
- ผูกกับไลเซนส์: เปิดได้เฉพาะเมื่อ `LUMIO_LICENSE` มี `marketplace`
- **หมายเหตุ**: แพ็กเป็นข้อมูลล้วน (ไม่รันโค้ด ไม่มีสิทธิ์เข้าถึงข้อมูล) จึงไม่เพิ่มพื้นผิวโจมตี
  แบบ Apps — ดูรายละเอียดที่ก้อนที่ 61 ด้านล่าง

## ก้อนที่ 49 — Community edition + ไลเซนส์/API ตรวจลายเซ็น

เปิดรีโปให้คนดาวน์โหลดไปใช้แบบ Community ก่อน แล้วขายเฉพาะ Membership/Paywall กับ Block Marketplace

- **สัญญาอนุญาต** — AGPL-3.0 (`LICENSE`) + [`docs/COMMERCIAL.md`](COMMERCIAL.md)
  - ฟีเจอร์ที่ขายแยกจะอยู่ในรีโปแยก/ให้สิทธิ์ผ่านไลเซนส์ ไม่ปนกับ Community
- **ไฟล์สำหรับรีโปสาธารณะ**
  - `README.md` (Community edition, สิ่งที่รวม/ไม่รวม, วิธีติดตั้ง, ตัวอย่างตรวจลายเซ็น)
  - `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
  - `.gitattributes`, `.editorconfig`, PR template และ issue templates
  - `.gitignore` กัน `.env`, `.crush` (ยกเว้น skills), คีย์ไลเซนส์ และไฟล์เบราว์เซอร์ของ Playwright
  - สแกนหา secret ก่อน init: ไม่พบคีย์/โทเคนที่ commit
- **ไลเซนส์ Ed25519 (ตรวจออฟไลน์ ไม่มี telemetry)**
  - `packages/shared/src/license.ts`: รูปแบบ `lumio_lic_v1.<payload>.<signature>`, schema, วันหมดอายุ, สถานะ Community/Pro
  - `apps/api/src/modules/license`: ตรวจด้วยกุญแจสาธารณะที่ฝังมากับบิลด์
    (`license.keys.ts`) — ใน production ไม่รับกุญแจจาก env เพื่อกันการปลอมไลเซนส์
  - `GET /v1/license` (ทุก role ในเว็บ) · `POST /v1/public/license/verify` (ไม่ต้องล็อกอิน, 60/นาที)
  - `membership` และ `marketplace` เป็นฟีเจอร์ `requiresLicense` ปิดไว้โดยค่าเริ่มต้น
    และหน้าตั้งค่า › ส่วนเสริมแสดงป้าย “ต้องมีไลเซนส์”
- **เครื่องมือสำหรับผู้ขาย** — `scripts/license-keygen.mjs`, `scripts/license-issue.mjs`
  (ทดสอบแล้ว: token ที่ออกใหม่ตรวจลายเซ็นผ่านด้วยกุญแจสาธารณะ)
- **ตัวช่วยฝั่งผู้รับ webhook** — `packages/sdk`: `verifyLumioSignature()` / `lumioSignatureHeader()`
  ใช้ Web Crypto (เบราว์เซอร์/Node/edge), ตรวจ HMAC `<timestamp>.<raw body>`, ค่าเริ่มต้น 5 นาที
- **เอกสาร** — [`docs/design/24-community-licensing.md`](design/24-community-licensing.md)
  (รูปแบบไลเซนส์, env, API, วิธีออกไลเซนส์, ตัวอย่างตรวจ webhook)
- **git** — `git init` แล้ว (ยังไม่ commit ตามกฎ) พร้อม 981 ไฟล์, ไม่มีไฟล์ลับ
- **เทสต์ใหม่ 27 เคส** (shared 8, api 8, sdk 7, admin 4) รวม repo **1,931 เคส**
  (shared 348, tokens 10, sdk 19, ui 70, blocks 124, api 830, admin 426, renderer 104) + e2e 3 เส้นทาง
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm test:e2e` ผ่านทั้งหมด

```bash
node scripts/license-keygen.mjs ./lumio-license-private.pem   # เก็บกุญแจส่วนตัวนอก repo
node scripts/license-issue.mjs --key ./lumio-license-private.pem --sub "ลูกค้า" --features membership
pnpm --filter api test src/modules/license
pnpm --filter @lumio/shared test license flags
pnpm --filter @lumio/sdk test webhook-signature
```

## ก้อนที่ 50 — เอกสารสำหรับบริการที่ใช้งานจริง + กุญแจผู้ขาย

ตอบข้อ “example.com มีคนใช้งานแล้ว” ด้วยเอกสารปฏิบัติการ ไม่แตะโค้ดที่รันอยู่

- **`docs/OPERATIONS.md`** — checklist ก่อน/หลัง deploy: secrets, บัญชีทดลอง, RLS/migration,
  สำรอง+restore, ไลเซนส์, โดเมน/TLS/CDN, อีเมล/Stripe/webhook, สื่อ/clamav, monitoring,
  AGPL/เครื่องหมายการค้า, ขั้นตอนอัปเดตระบบที่มีผู้ใช้
- **`TRADEMARK.md`** — AGPL ครอบโค้ด แต่ไม่ครอบชื่อ/โลโก้/โดเมน `example.com`;
  fork ต้องเปลี่ยนชื่อ และพูดได้แค่ว่า “built on Lumio”
- **`docs/design/24-community-licensing.md` 24.6.1** — ที่เก็บ/สำรอง/หมุนกุญแจผู้ขาย,
  fingerprint ของ public key ที่ใช้อยู่ และขั้นตอนเมื่อกุญแจรั่ว/หาย
- README ลิงก์ TRADEMARK + OPERATIONS แล้ว

```bash
pnpm format:check
```

## ก้อนที่ 51 — ถอดโดเมนที่ไม่ใช่ของเราออกจากค่าเริ่มต้น

`lumio.app` ถูกซื้อ/ถือโดยเจ้าของอื่นแล้ว จึงห้ามให้ Community ใช้เป็นค่าเริ่มต้นหรือที่อยู่อีเมล

- แทนที่ทุกอ้างอิง `lumio.app` ด้วย `example.com` (โดเมนสงวนสำหรับตัวอย่าง) 363 จุด:
  โค้ด, seed/demo, env ตัวอย่าง, เอกสาร, test fixtures และ demo credentials
- ค่า fallback ใน runtime (`PUBLIC_ROOT_DOMAIN`, `VITE_PUBLIC_ROOT_DOMAIN`, `EMAIL_FROM`,
  CNAME ของ subdomain) เปลี่ยนเป็น `example.com` — **production ต้องตั้งค่าเอง**:
  - `PUBLIC_ROOT_DOMAIN`, `VITE_PUBLIC_ROOT_DOMAIN`, `EMAIL_FROM`
  - `API_PUBLIC_URL`, `ADMIN_ORIGIN`, `RENDERER_ORIGIN`
- `TRADEMARK.md` ไม่กล่าวอ้างโดเมนใด ๆ อีก: โดเมนของบริการโฮสต์เป็นของผู้ให้บริการแต่ละราย
- `.env.example` อธิบายชัดว่า `example.com` เป็น placeholder ต้องเปลี่ยนก่อนเผยแพร่
- ผลตรวจ: lint / typecheck / test **1,931 เคส** / e2e 3 เส้นทาง ผ่านทั้งหมด

```bash
grep -ri "lumio\\.app" --exclude-dir=node_modules --exclude-dir=.git .   # ต้องไม่พบ
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
```

## ก้อนที่ 52 — รีดีไซน์ UX/UI หลังบ้าน + ใช้ไอคอนแทน emoji

ปรับหน้าจอหลังบ้านทั้งชุดให้เป็นภาษาดีไซน์เดียว ใช้งานง่ายขึ้น และไม่พึ่งอีโมจิของระบบปฏิบัติการอีก

- **ชุดไอคอนกลาง** — `packages/ui/src/icon.tsx`
  - 87 ไอคอนเส้น 24px (stroke 1.75, ปลายมน) วาดด้วย `currentColor` จึงใช้ได้ทั้งโหมดสว่าง/มืด
  - `<Icon name="home" />` ซ่อนจาก screen reader โดยอัตโนมัติ; ใส่ `label` เมื่อยืนอยู่ลำพัง
  - ใช้แทนอีโมจิทุกจุด: เมนูด้านข้าง, ปุ่ม, empty state, สถานะ, toolbar, slash menu, แท็บภาษา, Toast/Banner
  - ข้อความ i18n ที่เคยมีอีโมจิ (＋ ✍️ 👁 ✨ 🌐 🎉 ✓) ถูกทำให้เป็นข้อความล้วน แล้วให้ UI วาดไอคอนเอง
- **โครงหลังบ้านใหม่ (shell)** — `apps/admin/src/shell/`
  - โลโก้การ์ดไล่สี + ชื่อเวิร์กสเปซ, เมนูจัดกลุ่มเป็นหมวด พับเป็นรางไอคอนได้ระหว่างใช้งาน
  - ลิงก์ที่เลือกใช้ pill + แถบสีด้านซ้าย, การ์ดผู้ใช้/บทบาท + ปุ่มออกจากระบบตรึงล่าง sidebar
  - Topbar แบบติดหนึบ โปร่งแสง: ช่องค้นหาแบบแคปซูลพร้อม ⌘K, ดูเว็บ, สลับภาษา; มือถือใช้แถบเมนูล่าง
- **ภาษาดีไซน์เดียวกันทุกหน้าจอ**
  - หัวหน้าแบบเดียว (ชื่อ + คำอธิบาย + ปุ่มหลักไม่เกิน 1), การ์ดมุมโค้ง 20px เงานุ่ม, ระยะห่างตามกริด 8px
  - แท็บเป็น segmented pill, สถานะเป็นชิปมีจุดสี, แถว hover/focus ring ชัด, รองรับ `prefers-reduced-motion`
  - รีสไตล์ครบ: ภาพรวม, หน้าเว็บ/บทความ, เอดิเตอร์, ไฟล์สื่อ, ฟอร์ม, ดีไซน์, เติบโต, ตั้งค่า, ร้านค้า, wizard, เข้าสู่ระบบ, AI
- **แก้บั๊ก layout ที่พบจากการตรวจภาพจริง (Playwright)**
  - sidebar เคยตัดการ์ดผู้ใช้ทิ้ง → ทำเฉพาะรายการเมนูที่เลื่อนได้
  - การ์ด SEO ถูกแบ่งเป็นสองคอลัมน์โดยไม่ตั้งใจ → รายการตรวจเรียงเป็นการ์ด 3 คอลัมน์
  - แถบเครื่องมือร้านค้าถูกสไตล์เป็นแท็บ → ย้ายไป `commerce-view`
  - แท็บเต็มความกว้าง, ฟอร์ม AI ซ้อนทับกัน, ปุ่มย้อนกลับหน้าสื่อไม่มีไอคอน → แก้แล้ว
- **เทสต์** — เพิ่ม 4 เคสของ `Icon` (ui 74) รวม repo **1,935 เคส**
  (shared 348, tokens 10, sdk 19, ui 74, blocks 124, api 830, admin 426, renderer 104) + e2e 3 เส้นทาง
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm test:e2e` ผ่านทั้งหมด และ `pnpm --filter admin build` ผ่าน

```bash
pnpm --filter @lumio/ui test icon
pnpm --filter admin test
pnpm --filter admin dev            # ตรวจที่ 375 / 768 / 1280px และโหมดมืด
```

## ก้อนที่ 53 — เทมเพลตครบ 20 แบบ + เทมเพลตแรงบันดาลใจจาก B-Lighting

ปิดเป้า Launch ของ roadmap 19.1 (Template 20 แบบ) และเพิ่มเทมเพลตโชว์รูมไฟตามเว็บที่ลูกค้าอ้างถึง

- **เทมเพลตใหม่ 10 แพ็ก** (รวมเป็น 20) — ทุกแพ็กมี 4–5 หน้าตัวอย่าง ภาษาไทยจริงตามประเภทธุรกิจ

  | แพ็ก                                      | ประเภทธุรกิจ | โทน                                   |
  | ----------------------------------------- | ------------ | ------------------------------------- |
  | บี-ไลท์ติ้ง (`blighting-energy`)          | shop         | ขาว-น้ำเงินเข้ม `#17469D` / `#2E8FE0` |
  | สุขใจ โฮมสเตย์ (`sukjai-homestay`)        | other        | เขียวทะเล-ทรายอุ่น                    |
  | ฟิตดี สตูดิโอ (`fitdee-studio`)           | other        | ดำ-เขียวมะนาว                         |
  | ธรรมศาสตร์ ทนายความ (`thammasart-law`)    | other        | กรมท่า-ทอง                            |
  | สบาย สปา (`sabai-spa`)                    | other        | เขียวสมุนไพร-ทรายนวล                  |
  | บ้านช่าง คอนสตรัคชัน (`banchang-build`)   | other        | เทาคอนกรีต-ส้ม                        |
  | ครูเพลิน สถาบันติว (`kruplearn-tutor`)    | other        | น้ำเงิน-เหลือง                        |
  | พลอยทราเวล (`ploytravel`)                 | other        | ฟ้า-คอรัล                             |
  | เพ็ทฮัก คลินิกสัตว์ (`pethug-clinic`)     | clinic       | เขียวมิ้นต์-ส้มนุ่ม                   |
  | เมืองไทย ออโต้แคร์ (`muangthai-autocare`) | other        | เทาเข้ม-แดง                           |

- **บี-ไลท์ติ้ง (อ้างอิงจาก blightingenergy.com)** — อ่านโครงเว็บจริงแล้วออกแบบแพ็กใหม่เอง
  - สีหลัก `#17469D` และสีเสริม `#2E8FE0` จาก CSS ของเว็บ, พื้นขาว, ปุ่มแบบ outline, มุมโค้งเล็ก
  - ฟอนต์ Inter (หัวเรื่อง) + Noto Sans Thai (เนื้อหา), 5 หน้า: หน้าแรก / สินค้า / โซลูชัน / เกี่ยวกับเรา / ติดต่อ
  - เนื้อหาตามธีมแบรนด์: “Light That Feel · แสงสว่างที่สัมผัสได้”, หมวดดาวน์ไลท์-หลอดไฟ-หลอดทรงกระบอก, ประหยัดไฟ 80%, มอก./ISO 9001, เคสลดค่าไฟ
  - **ไม่ได้คัดลอกรูป โลโก้ หรือข้อความจากเว็บต้นทาง** — เขียนข้อความไทยใหม่ทั้งหมดเพื่อใช้เป็นตัวอย่าง
- **ทดสอบและภาพตัวอย่าง** — `node templates/generate-previews.mjs` วาด `preview.png` ของทั้ง 20 แพ็กจาก `tokens.json`
  - `index.json` มีครบ 20 รายการ; loader ตรวจ schema ผ่านทุกแพ็ก (manifest/tokens/menus/header-footer/section styles/หน้าตัวอย่าง)
  - ตัวเลือกธุรกิจทุกประเภทมีแพ็กของตัวเองแล้ว (restaurant, clinic, freelance, shop, blog, other)
- **โหมดเดโมของแอดมิน** — `wizard/demo.ts` เพิ่ม 10 แพ็กใหม่ (รวมบี-ไลท์ติ้ง) ให้เลือกใช้ได้แม้ไม่มี API (ทั้งหมด 13 แพ็ก)
  - อัปเดตเทสต์จาก “3 แพ็ก” เป็นตรวจว่ามีครบทุกประเภทธุรกิจและมีบี-ไลท์ติ้ง
- ผลตรวจ: `pnpm lint` / `pnpm typecheck` / `pnpm test` (1,935 เคส) / `pnpm test:e2e` (3 เส้นทาง) ผ่านทั้งหมด
  และเทสต์โหลดเทมเพลตยืนยัน “โหลดเทมเพลต 20 แบบ”

```bash
node templates/generate-previews.mjs
pnpm --filter api test src/modules/templates
pnpm --filter admin test src/wizard
```

## ก้อนที่ 54 — Docker ทั้งระบบ (profiles, migrate, volumes, healthchecks)

ทำให้ `docker compose` รันครบทั้ง stack ได้จริง และปิดจุดที่ทำให้ image production ใช้งานไม่ได้

- **แยก profile** — `docker compose up -d` เริ่มเฉพาะ infra (db, redis, minio)
  ส่วน `docker compose --profile app up -d --build` เริ่ม api, worker, admin, renderer, caddy
  - `docker compose config -q` ผ่านทั้งสองโหมด และผ่าน `.env.docker`
- **migrate เป็น service แยก** — รัน `prisma migrate deploy` ครั้งเดียวแล้วจบ
  - `api`/`worker` รอ `service_completed_successfully` จึงเริ่ม (ไม่มี race ตอนมีหลาย replica)
- **แก้ค่าที่ชี้เข้า container ตัวเอง** — compose override `DATABASE_URL`, `REDIS_URL`,
  `RENDERER_URL` ให้ใช้ชื่อ service (`db`, `redis`, `renderer`) แทน localhost จาก `.env`
- **volume ที่ต้องมีจริง** — `media` (ไฟล์อัปโหลด), `lumio_data` (`secrets.key` + backup),
  `redisdata` (appendonly) และ `pgdata`/`miniodata` เดิม
- **ความทนทาน** — healthcheck ของ db/redis/api/admin/renderer, `restart: unless-stopped`,
  `stop_grace_period` ของ api, และผูกพอร์ตทั้งหมดกับ `127.0.0.1` (Caddy เป็นประตูเดียว)
- **Node 22.13** — pnpm 11.18 ใช้ `node:sqlite` จึงรันบน Node 20 ไม่ได้
  - Dockerfile ทั้งสามเปลี่ยนเป็น `node:22-slim`, CI เปลี่ยน `node-version: 22`,
    `engines.node` เป็น `>=22.13` และ README/CONTRIBUTING อัปเดตตาม
  - api image ติดตั้ง `openssl` เพราะ Prisma engine ต้องใช้ (เดิม migrate ล้มใน container)
- **admin image เคยรันโหมดเดโม** — Vite ฝัง `VITE_API_URL` ตอน build
  - เพิ่ม build args `VITE_API_URL` / `VITE_PUBLIC_ROOT_DOMAIN` ใน Dockerfile + compose
- **renderer 500 ใน container** — `NEXT_PUBLIC_API_URL` ถูก inline ตอน build เป็น localhost
  - เพิ่ม `API_INTERNAL_URL` (อ่านตอน runtime) ใช้ใน `lib/site-locales.ts`, `content.ts`,
    `shop.ts`, `not-found.ts`, หน้า order; compose ตั้งเป็น `http://api:49100`
- **Caddy**
  - dev: `infra/caddy/Caddyfile` เสิร์ฟ HTTP ตาม `LUMIO_DOMAIN` (ไม่มี certificate)
  - prod: `infra/caddy/Caddyfile.prod` + ACME email + on-demand TLS ผ่าน API
  - compose ใช้ตัวแปร `LUMIO_DOMAIN`, `LUMIO_ADMIN_HOST`, `LUMIO_ADMIN_API_URL`,
    `LUMIO_API_URL` เพื่อไม่ให้ env `PUBLIC_ROOT_DOMAIN` ที่ค้างใน shell ชนะค่าใน `.env`
- **เอกสาร/ตัวอย่าง env** — `.env.docker.example`, `docs/DOCKER.md` (โหมด dev/prod,
  volume ที่ต้องสำรอง, ขั้นตอนอัปเดต, ข้อจำกัด), README และ OPERATIONS ลิงก์ไว้
- **ผลตรวจ**
  - build image ทั้ง 5 ตัว (api/admin/renderer/worker/migrate) สำเร็จ
  - `docker compose --profile app up -d` ขึ้นครบ: migrate exit 0, api/admin/renderer healthy
  - ทดสอบจริง: `GET /api/health` 200 · admin 200 · renderer 200 ·
    Caddy `Host: baandoi.example.com` 200, `Host: admin.example.com` 200
  - renderer: lint / typecheck / test 104 เคส ผ่าน; admin 426, api 830 (ก่อนหน้า) ไม่ได้รับผลกระทบ

```bash
docker compose up -d
docker compose --profile app up -d --build
docker compose --profile app config -q
docker compose logs -f api worker renderer
```

## ก้อนที่ 55 — UX/UI polish รอบสอง + ลิงก์ตัวอย่างที่เปิดได้จริงใน Docker

เก็บงานต่อจากก้อนที่ 52–54: ปรับหน้าจอที่ยังแน่นเกินไป และปิดจุดที่ทำให้ลิงก์ตัวอย่าง
กับ origin ของแอดมินใช้ไม่ได้เมื่อรันทั้ง stack ใน Docker

- **หน้าจอร้านค้า** — ตั้งค่าแบ่งเป็น section (การรับเงิน/การเชื่อมบัญชี/Webhook) พร้อมป้ายสถานะธนาคาร,
  สวิตช์วิธีจ่ายเป็นกริด และฟอร์มธนาคาร/พร้อมเพย์อ่านง่ายขึ้น
- **คลัง Apps** — แยก “ติดตั้งแล้ว” กับ “พร้อมติดตั้ง”, เพิ่มไอคอนประจำแอป และปุ่มติดตั้ง/ถอนติดตั้งที่ชัดขึ้น
- **เมนูนำทาง** — ปุ่มเพิ่ม/ลบเป็นไอคอนพร้อม tooltip, คำใบ้ `href` เป็น tooltip ที่ผูก `aria-describedby`,
  และมี EmptyState พร้อมปุ่มเริ่มเพิ่มรายการ
- **หน้าจออื่น** — ฟอร์ม/กล่องข้อความ/คลังสื่อ/ตั้งค่า/editor ปรับความหนาแน่นของปุ่ม ตาราง และการ์ด
  ให้ตรง design tokens, `Switch` แสดงคำอธิบายได้แม้ไม่ส่ง `id`, `Tabs` ไม่ใส่ `aria-controls`
  เมื่อแท็บไม่มี panel
- **ลิงก์ตัวอย่าง** — `createPreviewLink` ใช้ `RENDERER_PUBLIC_URL` (ที่อยู่ฝั่งเบราว์เซอร์)
  แทน `RENDERER_URL` ที่เป็น hostname ภายใน container และ fallback ไปที่โดเมนของเว็บ
  - เพิ่ม env ใน `.env.example`, `.env.docker.example`, compose และเอกสาร `DOCKER.md`/`OPERATIONS.md`
- **Origin ของแอดมิน** — `.env.example` ระบุว่ารับได้หลายค่า (คั่นด้วย comma) สำหรับ
  localhost / 127.0.0.1 / host ของ Caddy โดยใช้ตัวตรวจเดิมที่รองรับอยู่แล้ว
- **เทสต์**
  - เพิ่มเทสต์ `createPreviewLink` 3 เคส (ใช้ `RENDERER_PUBLIC_URL`, fallback โดเมนเว็บ, ไม่มี secret = conflict)
  - เพิ่มเทสต์ว่า Apps แยกส่วนติดตั้งแล้ว/พร้อมติดตั้ง และเมนูยังเข้าถึงได้ด้วยคีย์บอร์ด
  - vitest ของ API ปัก `PUBLIC_ROOT_DOMAIN=example.com` กัน env ของเครื่องทำให้เทสต์พัง
    และเพิ่ม `testTimeout`/`hookTimeout` 30 วิ เพราะสเปกที่ใช้ DB จริงเคย timeout 5 วิเมื่อรันขนาน
- **ผลตรวจ** — lint / typecheck ผ่าน; `pnpm test` ผ่านทุกแพ็กเกจ (1,940 เคส · API 833) และ
  `docker compose --profile app up -d --build` ขึ้นครบ healthcheck

```bash
pnpm --filter api test src/modules/contents/contents.service.spec.ts
pnpm lint && pnpm typecheck && pnpm test
docker compose --profile app up -d --build
docker compose ps
```

## ก้อนที่ 56 — ต่ออายุเซสชันอัตโนมัติ ไม่เด้งผู้ใช้กลับ login โดยไม่จำเป็น

อาการเดิม: access token อายุ 15 นาที แต่ admin ไม่เคยเรียก `/auth/refresh` เลย
พอหมดอายุทุกคำขอจะได้ 401 พร้อมข้อความ “เซสชันหมดอายุ” ทั้งที่ refresh cookie
ยังใช้ได้ ผู้ใช้จึงต้องเข้าสู่ระบบใหม่ทั้งที่ยังไม่จำเป็น

- **ตัว fetch กลางของ admin** — `apps/admin/src/auth/session-fetch.ts`
  - เจอ 401 จาก `/api/v1/*` → เรียก `/auth/refresh` (credentials include) **ครั้งเดียว**
    แม้มีหลายคำขอที่ล้มพร้อมกัน (single-flight) แล้วเขียน access token ใหม่ลง session
  - ยิงคำขอเดิมซ้ำด้วย token ใหม่โดยอัตโนมัติ
  - ถ้า refresh ไม่ผ่าน หรือคำขอที่ยิงซ้ำยังได้ 401 → ล้างเซสชัน เรียก `onSessionExpired`
  - ไม่แตะ 401 ของ `/auth/login`, `/auth/2fa/verify` (กันการตีความรหัสผ่านผิด)
    และไม่แตะ URL ของ storage ที่ไม่ได้อยู่ใน `/api/v1/`
- **การกลับหน้า login** — `AdminClientOptions.onSessionExpired` ต่อเข้า `App`
  แล้ว `AdminApp` พาไป `/login` ทันที พร้อมข้อความ `auth.sessionExpired`
  (ไทย/อังกฤษ) ผ่าน prop `notice` ของ `LoginPage`; clears notice เมื่อเข้าสู่ระบบสำเร็จ
- **ผลตรวจ** — lint / typecheck ผ่าน · `pnpm test` ผ่าน 1,946 เคส
  (admin 433, API 833) · เพิ่มเทสต์ 6 เคส (single-flight, retry, refresh ล่ม,
  token ใหม่ยังถูกปฏิเสธ, login 401 ไม่ถูกนับ, ข้อความบนหน้า login)

```bash
pnpm --filter admin test src/auth/session-fetch.test.ts
pnpm lint && pnpm typecheck && pnpm test
docker compose --profile app up -d --build
```

## ก้อนที่ 57 — ปรับหน้าสำรองข้อมูล/แพ็กเกจ และเอา “กลับไปภาพรวม” ออก

- **ตั้งค่า › สำรองข้อมูล & ประวัติ** — การ์ด “สำรองข้อมูลทั้งเว็บ” แยกเป็นสองการ์ดย่อย
  (ดาวน์โหลด/นำเข้า) พร้อมไอคอน คำอธิบาย และปุ่มที่จัดแนวเดียวกัน
  - ซ่อน `<input type="file">` แบบ native แล้วเปิดผ่านปุ่ม “เลือกไฟล์…” ที่ใช้ design tokens
  - ปุ่มเต็มความกว้างบนมือถือ และไม่มีการ์ดที่ข้อความ/ปุ่มล้นออกนอกกรอบ
- **ตั้งค่า › แพ็กเกจ & การชำระเงิน** — แพ็กเกจที่ใช้อยู่มีขอบ/พื้นหลังไฮไลต์,
  ฟีเจอร์มีเครื่องหมายถูก, ปุ่มเลือกแพ็กเกจเต็มความกว้าง, และกริดเป็น 3+2 บนเดสก์ท็อป
  แทนการ์ดใบที่ 5 ตกไปอยู่คนเดียว
  - การ์ดแพ็กเกจปัจจุบันมีไอคอนและกริดการใช้งาน 2–3 คอลัมน์ อ่านง่ายขึ้น
- **คลังสื่อ** — เอาแถบ “กลับไปภาพรวม” ออก เพราะมีเมนูด้านข้างอยู่แล้ว
  (ลบ prop `onBack`, CSS และเทสต์ที่เกี่ยวข้อง)
- **ผลตรวจ** — lint / typecheck ผ่าน · `pnpm test` ผ่าน 1,945 เคส (admin 432, API 833)
  · ตรวจภาพหน้าจอที่ 1280px และ 420px แล้ว

```bash
pnpm --filter admin test src/settings
pnpm lint && pnpm typecheck && pnpm test
docker compose --profile app up -d --build
```

## ก้อนที่ 58 — ปิดเมนู “เพิ่มส่วนใหม่” ได้จริง และทำ editor ใช้ง่ายขึ้นบนมือถือ

อาการเดิม: กด “เพิ่มส่วนใหม่” แล้วเมนูไปโผล่ท้ายหน้า (เพราะ `position: absolute` ไม่มี anchor)
และไม่มีทางปิดถ้าไม่เลือกบล็อก

- **ตำแหน่งเมนู** — เปิดจากปุ่มที่กดจริง ใช้ `getBoundingClientRect()` แล้ว clamp ให้อยู่ในจอ
  (`BlockCanvas.tsx`), เปิดด้วย `/` ก็ใช้ตำแหน่งหัวแคนวาส
- **ปิดได้ทุกทาง** — มีฉากหลังกดปิด, ปุ่มปิด (✕) ในหัวเมนู, และ Esc ฟังที่ `document`
  แม้โฟกัสจะหลุดออกจากช่องค้นหา; ปิดแล้วคืนโฟกัสให้ปุ่มเดิม
- **หน้าตา** — หัวเมนูบอก “เพิ่มส่วนใหม่”, ไอคอนของแต่ละบล็อกตรงชนิด (heading/paragraph/image/…),
  เปลี่ยนปุ่มลากเป็นไอคอน grip และปุ่มทำซ้ำเป็นไอคอน copy แทนอักขระ
- **มือถือ** — เมนูเป็น bottom sheet เต็มความกว้าง, toolbar ขึ้นบรรทัดใหม่และปุ่ม “เผยแพร่”
  ไม่ถูกตัดขอบจออีก
- **ผลตรวจ** — lint / typecheck ผ่าน · `pnpm test` ผ่าน 1,948 เคส (admin 435, API 833)
  · ทดสอบจริงด้วย Playwright: ตำแหน่งเมนูตรงปุ่ม, scroll ไม่กระโดด, ปิดด้วย click นอก/Esc/✕ ได้ทั้งสามทาง

```bash
pnpm --filter admin test src/editor
pnpm lint && pnpm typecheck && pnpm test
docker compose --profile app up -d --build
```

## ก้อนที่ 59 — หน้าเข้าสู่ระบบของผู้ซื้อบนเว็บสาธารณะ

ไอคอน “บัญชีของฉัน” ใน header ของเว็บสาธารณะลิงก์ไปที่ `/signin` แต่ยังไม่มีหน้านั้น
(404) และระบบสมาชิก/รหัสผ่านลูกค้ายังอยู่นอก MVP → ทำหน้าเข้าสู่ระบบที่ยืนยันตัวตน
ด้วย **ความเป็นเจ้าของคำสั่งซื้อ** แทนบัญชีผู้ใช้

- **API** — `POST /api/v1/public/:host/shop/orders/lookup`
  - รับ `number` (รูปแบบ `LM-261022-7K4Q` ตัวพิมพ์เล็ก/ใหญ่ได้) + `contact` (เบอร์โทรหรืออีเมล)
  - ตรวจกับ `orders.customer` ใต้ `forSite()` (RLS ต่อเว็บ), ตอบ 404 ข้อความเดียวกัน
    ทั้งเลขผิดและข้อมูลติดต่อผิด เพื่อไม่ให้เดาได้ว่ามีออเดอร์อยู่หรือไม่
  - rate limit 10/นาที + honeypot, ไม่ cache (`no-store`)
  - helper ใน `packages/shared`: `phoneDigits`, `contactMatchesOrder`, `orderLookupInputSchema`
- **เว็บสาธารณะ** — หน้า `/signin` (`apps/renderer/src/app/signin/`)
  - ฟอร์มธรรมดาไม่ใช้ JS: เลขคำสั่งซื้อ + เบอร์โทร/อีเมล → `/signin/lookup` → พาไป `/order/:token`
  - จำรายการที่เปิดไว้บนเครื่องด้วยคุกกี้ `lumio_orders` (httpOnly, 30 วัน, สูงสุด 8 รายการ)
    แสดงเป็นการ์ดรายการ + ปุ่ม “ออกจากระบบ” (`/signin/signout`)
  - ใช้ `ShopShell` และสไตล์ `shop-*` เดิม (design tokens เท่านั้น), มี `noindex`
    และเพิ่ม `/signin` ใน `robots.txt`
  - ไม่ fallback ไปข้อมูลเดโมตอนค้นหา เพื่อไม่ให้คนแปลกหน้าเปิดออเดอร์ตัวอย่างได้
- **เทสต์** — shared 7 เคส (normalize เลข, จับคู่เบอร์/อีเมล), API 5 เคส (สำเร็จ/ผิดคน/ไม่พบ/honeypot),
  renderer 15 เคส (คุกกี้ที่เสียหายถูกทิ้ง, เพดาน 8 รายการ, หน้าจอ first visit / signed-in / error)
- **ผลตรวจ** — `pnpm --filter @lumio/shared build` · lint / typecheck ของ api + renderer ผ่าน
  · renderer 159 เคส · API 857 เคส ผ่านทั้งหมด
- **เก็บกวาดก่อนปิดก้อน** — เลิกติดตาม `apps/renderer/tsconfig.tsbuildinfo` (build artifact)
  และเพิ่มใน `.gitignore`, เปลี่ยนโดเมนจริงใน `docs/DEPLOY-VPS.md` เป็น `example.com`
  ให้ตรงกับแนวนโยบายก้อนที่ 51, bump เวอร์ชันเป็น 0.21.1

```bash
pnpm --filter @lumio/shared build
pnpm --filter api test
pnpm --filter renderer test
pnpm lint && pnpm typecheck
docker compose --profile app up -d --build
```

## ก้อนที่ 60 — Membership / Paywall (ก้อนถัดไป A)

เปิดขายสมาชิกบนเว็บที่ลูกค้าสร้างเอง: ผู้อ่านสมัครบัญชีของเว็บนั้น แล้วอ่านหน้าที่เจ้าของเว็บ
ตั้งไว้ว่า “เฉพาะสมาชิก” — ทั้งหมดเปิดได้เฉพาะเมื่อไลเซนส์ระบุ `membership`

- **ฐานข้อมูล** — ตาราง `readers`, `membership_plans`, `reader_subscriptions` (มี `site_id` + RLS
  แบบเดียวกับเนื้อหา) และคอลัมน์ `contents.access` (`public` | `members`, ค่าเริ่มต้น `public`)
- **บัญชีผู้อ่าน** — Argon2 เหมือนทีมงาน, อีเมลถูก normalize เป็นตัวพิมพ์เล็ก, สมัครแล้วส่งอีเมลยืนยัน
  (โทเคนใช้ครั้งเดียว อายุ 24 ชม.), ลืมรหัสผ่านตอบเหมือนกันทุกกรณีเพื่อไม่ให้เดาว่ามีบัญชีหรือไม่
  (ลิงก์อายุ 1 ชม.), เซสชันเป็นโทเคน HMAC ที่ระบุได้แค่ “ผู้อ่านคนนี้ของเว็บนี้” (`READER_SECRET`)
- **แพ็กเกจและการชำระเงิน** — ราคาเป็นสตางค์, รายเดือน/รายปี, แพ็กเกจฟรีเปิดให้ทันที,
  แพ็กเกจเสียเงินไป Stripe Checkout โหมด subscription พร้อม `metadata` (siteId/readerId/planId)
  และ webhook `checkout.session.completed`, `customer.subscription.updated/deleted`,
  `invoice.paid/payment_failed` อัปเดตสถานะกับวันหมดรอบ
- **เพย์วอลล์** — `GET /public/:host/pages|posts/:slug` รับ `Authorization: Bearer` ของผู้อ่าน:
  ถ้าไม่มีสิทธิ์จะได้ `blocks: []` + `paywall: { locked: true, plans } ` และ `noindex`;
  คำตอบที่มี Authorization เป็น `private, no-store` (ไม่ลงแคช/CDN), สิทธิ์คิดจากเซิร์ฟเวอร์ทุกครั้ง
  และปิดแบบ fail-closed (ไม่มีรอบ/หมดอายุ/ค้างชำระ = ไม่มีสิทธิ์)
- **เว็บสาธารณะ** — หน้า `/membership` (แพ็กเกจ + สมัคร + เข้าสู่ระบบ + การ์ดบัญชี),
  `/membership/forgot`, `/membership/reset`, route handlers `join|login|logout|checkout|forgot|reset|verify`,
  คุกกี้ `lumio_reader` (httpOnly, 30 วัน) — ทุกฟอร์มเป็น HTML ธรรมดาไม่ใช้ JS,
  หน้าเพย์วอลล์แสดงบทนำ + การ์ดแพ็กเกจ, และ `/membership` ถูกกันใน `robots.txt`
- **แอดมิน** — เติบโต › สมาชิก: การ์ดสรุป (สมาชิกที่ใช้งานอยู่/บัญชีผู้อ่าน/รายได้ต่อเดือน),
  ตารางแพ็กเกจ (เพิ่ม/แก้/ลบ — ลบไม่ได้ถ้ามีสมาชิกอยู่), ตารางผู้อ่านพร้อมค้นหา และหยุด/เปิดต่ออายุ
  (เรียก Stripe ก่อนอัปเดตแถว + audit + undo), และ editor มีตัวเลือก “ทุกคนอ่านได้ / เฉพาะสมาชิก”
  พร้อม undo
- **เอกสาร** — `docs/design/12-api.md` (12.7.2 endpoints + rate limit), `11-data-model.md` (ตาราง + index),
  `13-rbac.md` (สิทธิ์แท็บสมาชิก), `15-security.md` (reader token/paywall), `03-scope.md`, `19-roadmap.md`,
  `24-community-licensing.md` (24.8), `05-admin-ia.md` (แท็บ เติบโต), `docs/OPERATIONS.md`, `docs/DOCKER.md`,
  `docs/DEPLOY-VPS.md` (env ของ READER_SECRET/LUMIO_LICENSE), `README.md`, `docs/COMMERCIAL.md`, `.env.example`
- **ผลตรวจ** — shared 11 เคส (ราคา/สิทธิ์/honeypot), API 880 เคส (รวม reader token 5, Stripe mapping 11,
  ReaderService 9), admin 487 เคส (รวมหน้าสมาชิก 5), renderer 166 เคส (รวมเพย์วอลล์ 7);
  lint / typecheck ผ่านทุกแพ็กเกจ และ `prisma migrate deploy` บนฐานข้อมูลจริงผ่าน

```bash
pnpm --filter @lumio/shared build
pnpm --filter api prisma migrate deploy
pnpm lint && pnpm typecheck && pnpm test
docker compose --profile app up -d --build
```

## ก้อนที่ 61 — Block Marketplace (ก้อนถัดไป B)

เปิดตลาดชุดส่วนจากภายนอกโดยไม่เพิ่มพื้นผิวโจมตี: แพ็กเป็น **ข้อมูลล้วน**
(block tree ของบล็อกที่ Lumio มีอยู่แล้ว) ไม่มีโค้ดที่รันบนเว็บ ไม่มีสิทธิ์เข้าถึงข้อมูล
และถอนแพ็กแล้วหน้าเว็บยังเรนเดอร์ได้เพราะทุกบล็อกยังอยู่ในบิลด์

- **Shared** — `packages/shared/src/marketplace.ts`
  - `marketplacePackSchema` (strict): v, key, name/nameEn, description, version (semver),
    author, homepage, license, minLumioVersion, sections[] — ฟิลด์แปลกปลอมถูกปฏิเสธ
  - token `lumio_pack_v1.<payload>.<signature>` + `parseMarketplacePackToken` +
    `comparePackVersions` และ `BUILTIN_BLOCK_TYPES` (มีเทสต์ใน `@lumio/blocks` กันหลุด)
  - view types ของ API/หน้าจอ (`MarketplacePackSummary`, `InstalledPack`, `MarketplaceSection`)
  - input schema: ตรวจโทเคน, ติดตั้ง (key หรือ token อย่างใดอย่างหนึ่ง), เปิด/ปิด
- **ฐานข้อมูล** — migration `20261114000000_marketplace`
  - ตาราง `site_block_packs` (`site_id`, `pack_key`, `version`, `source`, `manifest`, `token`,
    `enabled`, `created_at`, `updated_at`) + index `(site_id, enabled)` + RLS `site_isolation` แบบ FORCE
- **API** — `apps/api/src/modules/marketplace`
  - `GET /v1/marketplace` (คลังทางการ 4 ชุด + ที่ติดตั้ง), `GET /v1/marketplace/sections`
  - `POST /v1/marketplace/preview` (ตรวจลายเซ็น 20/นาที), `POST /v1/marketplace/installs` (10/นาที)
    — ติดตั้งครั้งแรกหรืออัปเดตในที่เมื่อเวอร์ชันใหม่กว่า, `PATCH/DELETE /installs/:packKey`
  - ตรวจ Ed25519 ด้วยกุญแจที่ฝังใน `marketplace.keys.ts` (override ด้วย `MARKETPLACE_PUBLIC_KEY`
    เฉพาะ non-production), ทุก write เขียน audit `marketplace.pack.*`, เปิดทั้งชุดด้วย
    `@RequireFeature('marketplace')` + kill switch `MARKETPLACE_PLATFORM_DISABLED`
  - แพ็กทางการ 4 ชุดใน `official-packs.ts` (เปิดตัวเว็บ, เรื่องราวธุรกิจ, หน้าบทความ, หน้าร้าน)
- **แอดมิน** — เติบโต › ตลาดบล็อก (`apps/admin/src/marketplace/`)
  - การ์ดคลัง/ติดตั้งแล้ว + เวอร์ชัน จำนวนส่วน สัญญาอนุญาต ที่มา, สวิตช์เปิดปิด, ถอนพร้อมเลิกทำ
  - การ์ดติดตั้งจากโทเคนที่ลงลายเซ็น (ตรวจก่อนแล้วจึงติดตั้ง) และโหมดเดโมในหน่วยความจำ
  - ส่วนของแพ็กที่เปิดใช้ถูก merge เข้าคลังส่วนของ editor (เมนู `/`) พร้อมชื่อแพ็กนำหน้า
- **เครื่องมือผู้ขาย** — `scripts/marketplace-keygen.mjs` และ `scripts/marketplace-pack.mjs`
  (ทดสอบแล้วว่าโทเคนที่ออกใหม่ตรวจผ่านด้วยกุญแจที่ฝังในบิลด์)
- **เอกสาร** — `docs/design/16-apps.md` 16.8, `12-api.md`, `11-data-model.md`, `03-scope.md`,
  `19-roadmap.md`, `docs/OPERATIONS.md`
- **เทสต์** — shared 16, blocks 1, API 25 (service 20 + HTTP 5), admin 7;
  lint / typecheck ผ่านทุกแพ็กเกจ

```bash
pnpm --filter @lumio/shared test marketplace
pnpm --filter @lumio/blocks test registry
pnpm --filter api test src/modules/marketplace src/http/api.spec.ts
pnpm --filter admin test src/marketplace
pnpm --filter api prisma migrate deploy
pnpm lint && pnpm typecheck && pnpm test
docker compose --profile app up -d --build
```

## ก้อนที่ 62 — Integration test ที่ยิง Stripe จริงด้วย test key

ปิดช่องที่ค้างมาตั้งแต่ก้อนที่ A/44: ทุกเทสต์ Stripe เดิม stub `fetch` ทั้งหมด
ก้อนนี้จึงมีชุดที่คุยกับ **Stripe test account จริง** เพื่อพิสูจน์ว่า payload ที่เราส่ง
Stripe ยอมรับจริง ไม่ใช่แค่ตรงกับที่เราคิดเอง

- **เทสต์ใหม่** — `apps/api/src/modules/billing/stripe.integration.spec.ts` (7 เคส)
  - Checkout โหมด `payment` (บัตร): ตรวจ `amount_total`, `currency`, metadata, rail แล้ว expire ทิ้ง
  - คูปองเครดิตส่วนที่เหลือ: ตรวจ `amount_off` เป็นสตางค์ + `duration=once` แล้วลบ
  - Checkout โหมด `subscription` พร้อมเครดิต, หน้าชำระเงินของร้านค้า (มีค่าส่ง), และหน้าสมัครสมาชิกผู้อ่าน
  - Charge ด้วย `pm_card_visa` จริงแล้วคืนเงินผ่าน `refundStripePayment` (ตรวจ `re_…`, ยอด, สถานะ)
  - คีย์อ่านจาก `STRIPE_SECRET_KEY`/`STRIPE_TEST_SECRET_KEY` หรือ `.env` local;
    **ปฏิเสธคีย์ที่ไม่ใช่ `sk_test_`** และข้ามทั้งชุดเมื่อไม่มีคีย์ → CI/Community ไม่ต้องมี Stripe
- **บั๊กที่เจอจากการยิงจริง** — บัญชี Stripe ที่สร้างใหม่ตอบ 400
  “The `payment_method_types` parameter is no longer supported” (dynamic payment methods)
  - แก้ที่จุดเดียว: `postCheckoutSession()` ใน `billing/stripe.ts` ส่ง `payment_method_types`
    ตามที่ผู้ใช้เลือกก่อน และถ้า Stripe ปฏิเสธเฉพาะพารามิเตอร์นี้ จะลองใหม่โดยไม่ส่ง
    (ใช้ค่าจาก Dashboard) — ทั้ง billing, ร้านค้า และสมาชิกใช้ฟังก์ชันเดียวกันแล้ว
  - เทสต์ unit 2 เคสยืนยันว่าลองซ้ำเฉพาะกรณีนี้ และไม่ลองซ้ำเมื่อ error อื่น
- **ปิดช่องเพย์วอลล์กับเงินที่ยังไม่เข้า** — `checkout.session.completed` ที่
  `payment_status=unpaid` ไม่ถูกนับเป็นสมาชิก aktif อีก และ `checkout.session.async_payment_succeeded`
  สร้าง/ปลดล็อกแถวได้ (เดิมรอเฉพาะ `completed`)
- **เอกสาร** — `docs/OPERATIONS.md` (เลือกวิธีจ่ายใน Dashboard ของบัญชีใหม่),
  `.env.example` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`)
- **ผลตรวจ** — API 916 เคสผ่านทั้งหมด (รวม 7 เคสที่ยิง Stripe จริง) · repo รวม 2,263 เคส · lint / typecheck ผ่าน

```bash
# คีย์ทดสอบอยู่ใน .env (gitignored) หรือส่งผ่าน env ก็ได้
pnpm --filter api test src/modules/billing/stripe.integration.spec.ts
pnpm lint && pnpm typecheck && pnpm test
docker compose --profile app up -d --build
```

## ก้อนที่ 63 — ป้ายเวอร์ชัน + ตรวจรุ่นใหม่ + อัปเดตตัวเองบน host

ก่อนก้อนนี้ไม่มีทางรู้จากในระบบว่าเครื่องที่รันอยู่เป็นเวอร์ชันไหน และไม่มีสัญญาณบอกว่ามีรุ่นใหม่
ก้อนนี้จึงตอบสองคำถามนั้นในหน้าแอดมิน แต่ **ไม่ให้ container อัปเดตตัวมันเอง**
(process ไม่สามารถ rebuild container ที่ตัวเองรันอยู่ได้อย่างปลอดภัย) — การอัปเดตจริง
เป็นสคริปต์ที่รันบน host

- **Shared** — `packages/shared/src/updates.ts`
  - `parseUpdateManifest()` อ่านได้ทั้ง manifest ของ Lumio และ payload GitHub release
    (`tag_name`/`html_url`/`body`/`published_at`) แล้ว normalize `v` นำหน้าออก
  - `buildUpdateStatus()` คืน snapshot เดียว (เวอร์ชันที่ใช้, รุ่นล่าสุด, `updateAvailable`,
    `checkedAt`, `error`, `releaseUrl`, `notes`, `autoUpdate`) — เอกสารปลายทางเสียหาย
    เป็นค่า `error` ไม่ใช่ exception (กล่องแจ้งเตือนปิด ไม่ลากหน้าจอพัง)
  - `version.ts` — `normalizeVersion`/`isNewerVersion` ใช้ร่วมกับสคริปต์อัปเดต
- **API** — `apps/api/src/modules/updates`
  - `GET /v1/updates` (60/นาที) และ `POST /v1/updates/check` (10/นาที) ต้อง login
    เพราะป้ายเวอร์ชันอยู่ใน shell ทุกหน้า และกันการยิง GitHub ถี่
  - อ่านเวอร์ชันที่ติดตั้งจาก `LUMIO_VERSION` ก่อน ถ้าไม่มีจึงอ่าน `apps/api/package.json`
    (เลขเดียวกับที่สคริปต์ bump ดูแล); ค่าเริ่มต้น manifest คือหน้า releases ของโปรเจกต์
    ที่แปลงเป็น GitHub API ให้เอง, ปิดได้ด้วย `LUMIO_UPDATE_CHECK=false`
  - cache คำตอบสำเร็จ 6 ชม. (`LUMIO_UPDATE_CHECK_MINUTES`) แต่คำตอบที่ล้มเหลว
    cache แค่ 10 นาที เพื่อให้ลองใหม่เร็วขึ้นโดยไม่ยิงทุกครั้งที่เปิดหน้า
- **แอดมิน** — `apps/admin/src/updates/`
  - `VersionPanel` อยู่ footer ของ sidebar ทุกหน้า (โชว์ทันทีจากเลขในบิลด์ก่อน API ตอบ),
    poll ทุก 15 นาที, ปุ่มตรวจใหม่, กล่องเตือนพร้อม “ตอนนี้ใช้ … · อัปเดตเป็น …”
    ลิงก์ release notes และบอกว่าอัปเดตอัตโนมัติเปิดอยู่หรือต้องรันสคริปต์
  - sidebar ที่ย่อแล้วซ่อนข้อความด้วย visually-hidden เพื่อไม่ให้บีบปุ่มอื่น
  - i18n ครบ 8 คีย์ (ไทย/อังกฤษ) และมีโหมดเดโมในหน่วยความจำสำหรับหน้าเดโม
- **อัปเดตบน host** — `scripts/update.mjs`
  - `node scripts/update.mjs --check` ตรวจอย่างเดียว, ไม่ใส่ flag = อัปเดตครั้งเดียว,
    `--auto` วนตาม `LUMIO_UPDATE_INTERVAL_MINUTES`
  - อัปเดต = `git fetch --tags` → resolve tag (`v` หรือไม่มี `v`) → `checkout --detach`
    → `docker compose --profile app up -d --build` → รอ `LUMIO_HEALTH_URL` (180 วิ)
    → **ถ้าไม่ขึ้น ย้อน commit เดิมแล้ว rebuild + รอ health ก่อนโยน error**
  - ปฏิเสธทันทีถ้า working tree ไม่สะอาด (`git status --porcelain` ไม่ว่าง)
    จึงไม่มีทางที่งานที่ยังไม่ commit จะหาย
  - `infra/systemd/lumio-update.{service,timer}` — ตรวจทุก 6 ชม. หลังบูต 15 นาที,
    `RandomizedDelaySec=10min`, `Persistent=true`; npm script `update:check` / `update:auto`
- **เอกสาร** — `docs/design/18-deployment.md` 18.8 (กลไก, env, systemd), `.env.example`
  (ชุด `LUMIO_UPDATE_*`, `LUMIO_AUTO_UPDATE`, `LUMIO_HEALTH_URL`), `docs/OPERATIONS.md`,
  และ bump เป็น 0.24.0 (เป็น release แรกที่ป้ายในแอปใช้เทียบ)
- **ผลตรวจ** — API 8 เคส (`updates.service.spec.ts`) และ admin 4 เคส
  (`VersionPanel.test.tsx`, `api.test.ts`); lint / typecheck ผ่าน

```bash
node scripts/update.mjs --check
pnpm --filter api test src/modules/updates
pnpm --filter admin test src/updates
pnpm lint && pnpm typecheck && pnpm test
```

## ก้อนที่ 64 — อ่าน release feed ของ repo ส่วนตัวได้

หลังปล่อย 0.24.0 พบว่าป้ายเวอร์ชันไม่เคยเห็นรุ่นใหม่เลย เพราะ repo โปรเจกต์เป็น private
GitHub จึงตอบ **404** ให้คำขอ release ที่ไม่ระบุตัวตน (ไม่ใช่ 401) — ฝั่งแอดมินเห็นแค่
“ยังตรวจหาอัปเดตไม่ได้”

- **API** — `updates.config.ts` เพิ่ม `updateManifestToken()` อ่าน `LUMIO_UPDATE_TOKEN`
  หรือ `GITHUB_TOKEN` แบบ read-only และ `fetchUpdateStatus()` แนบ
  `Authorization: Bearer …` **เฉพาะเมื่อมีค่า** (manifest สาธารณะจึงยังใช้ได้เหมือนเดิม)
  - token ถูกอ่านฝั่งเซิร์ฟเวอร์เท่านั้น ไม่ถูกใส่ใน response ที่แอดมินได้รับ
    (เบราว์เซอร์เห็นเพียงเลขเวอร์ชัน)
- **สคริปต์** — `scripts/update.mjs` ใช้ตัวแปรเดียวกันตอนอ่าน manifest
  เพื่อให้ `--check`/`--auto` ทำงานได้กับ feed ส่วนตัว
- **เทสต์** — เพิ่มเคสยืนยันว่าส่ง header เฉพาะเมื่อมี token และไม่ส่งเมื่อไม่มี
- **เอกสาร** — `.env.example` อธิบายว่า token read-only ก็พอ และอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น;
  `docs/design/18-deployment.md` 18.8 ระบุว่า repo เป็น private จึงต้องตั้ง token;
  bump เป็น 0.24.1
- **ผลตรวจ** — `pnpm --filter api test src/modules/updates` ผ่าน 9 เคส,
  `pnpm --filter admin test src/updates` ผ่าน 4 เคส; lint / typecheck ผ่าน

```bash
pnpm --filter api test src/modules/updates
pnpm --filter admin test src/updates
pnpm lint && pnpm typecheck
```

## ก้อนที่ 65 — ระบบจองคิว (งานนอก MVP)

ปิดรายการ “ระบบจองคิวจริง” ที่ค้างมาตั้งแต่ก้อนที่ 44 ด้วยปฏิทินชุดเดียวต่อเว็บ
และหน้าจองสาธารณะที่ไม่ต้องใช้ JavaScript

- **Shared** — `packages/shared/src/booking.ts`
  - `bookingSettingsSchema` (วันเปิด/เวลา/ความยาวรอบ/จำนวนต่อรอบ/จองล่วงหน้า/เปิดปฏิทินกี่วัน)
  - `bookingServiceInputSchema`, `bookingInputSchema` (+honeypot), `bookingStatusInputSchema`, view types
  - เวลาเป็นเวลาท้องถิ่นไทย (UTC+7) แต่เก็บเป็น instant: `bookingStart`, `siteDateOf`, `siteTimeOf`,
    `bookingRangeLabel`; `slotTimesForDay`, `slotsForDate`, `bookableDates`, `isSlotBookable`
- **ฐานข้อมูล** — `booking_services` และ `bookings` (มี `site_id`, FORCE RLS, index วัน/สถานะ,
  CHECK สถานะ, `cancel_hash` UNIQUE, เก็บชื่อบริการไว้แม้ลบบริการ)
- **API** — `apps/api/src/modules/booking`
  - ผู้ดูแล: `GET/PUT /booking/settings`, CRUD `/booking/services`, `GET /booking/bookings`,
    `PATCH /booking/bookings/:id`; ทุก write เขียน audit และใช้ `@RequireFeature('booking')`
  - สาธารณะ: `GET/POST /public/:host/booking` (rate limit 300/นาที สำหรับอ่าน และ 10/นาที สำหรับสร้าง + honeypot + lead time),
    `GET /public/:host/booking/bookings/:token`, `POST .../cancel`
  - ตรวจช่องว่างด้วยการทับช่วงเวลาจริงตามความยาวบริการ และกันการจองซ้ำภายใน transaction
  - แจ้งเจ้าของเว็บทางอีเมล (`EmailService.sendForSite`), ล้มเหลวไม่ทำให้การจองหาย
- **แอดมิน** — เติบโต › การจองคิว: ตั้งค่าเปิดรับจอง/ข้อความ/รอบเวลา/วันเปิดทำการ, บริการ
  (เพิ่ม/แก้/ลบด้วย modal), รายการนัดกรองวัน/สถานะ + ยืนยัน/เสร็จสิ้น/ยกเลิก
- **เว็บสาธารณะ** — `/booking` ฟอร์ม HTML ธรรมดา (เลือกวันและเวลาด้วย `optgroup` ไม่ใช้ JS),
  หน้า `/booking/:token` แสดงนัดและยกเลิกได้, `noindex` ที่หน้ายืนยัน
- **เทสต์** — shared 8, API 6, admin 4 (demo client), renderer 5 (parsing + สถานะ)
- **หมายเหตุ** — feature `booking` เปิดเป็นค่าเริ่มต้นและปิดรายเว็บได้; ไม่มีไลเซนส์ผูก

```bash
pnpm --filter @lumio/shared test booking
pnpm --filter api test src/modules/booking
pnpm --filter admin test src/booking
pnpm --filter renderer test src/booking.test.tsx
pnpm lint && pnpm typecheck && pnpm test
```

## ก้อนที่ 66 — Agency / White-label (งานนอก MVP)

ให้ผู้ติดตั้งที่ขายต่อสามารถใช้แบรนด์ของตัวเองในหลังบ้านได้ ภายใต้ไลเซนส์ที่ระบุ `whitelabel`

- **Shared** — `packages/shared/src/agency.ts`: `agencyBrandingSchema` (ชื่อ/โลโก้/อีเมลช่วยเหลือ/
  ซ่อนเครดิต/สีเน้น), `agencyViewSchema` (+ `licensed`), `mergeAgencyBranding`, `brandNameOf`
  และเพิ่ม `whitelabel` ใน `LICENSE_FEATURES`
- **ฐานข้อมูล** — `agency_branding` แถวเดียว (`id = 'default'`) ระดับแพลตฟอร์ม ไม่มี `site_id`/RLS
- **API** — `GET /v1/agency` (owner/admin ดูได้) และ `PATCH /v1/agency` (owner และต้องมีไลเซนส์
  `whitelabel`) — เขียน audit ผ่านเว็บที่ผู้ใช้กำลังทำงานอยู่
- **แอดมิน** — ตั้งค่า › แบรนด์องค์กร: ฟอร์มชื่อ/โลโก้/อีเมล/สีเน้น/สวิตช์ซ่อนเครดิต;
  บันทึกแล้ว shell เปลี่ยนชื่อ/โลโก้/สีเน้นทันที (ไม่ต้องรีโหลด) และซ่อนบรรทัด “ขับเคลื่อนด้วย Lumio” ตามสวิตช์
  เมื่อไม่มีไลเซนส์จะขึ้นคำอธิบายและปิดช่องกรอก (ไม่ซ่อนฟีเจอร์)
- **เทสต์** — shared 3, API 4 (Community ปฏิเสธ, Pro รวมค่าเดิม)
- **เอกสาร** — `24-community-licensing.md` (features + 24.8), `13-rbac.md`, `12-api.md`

```bash
pnpm --filter @lumio/shared test agency
pnpm --filter api test src/modules/agency
pnpm lint && pnpm typecheck
```

## ก้อนที่ 67 — Public API keys (งานนอก MVP)

เปิดให้ระบบภายนอกอ่านเนื้อหาที่เผยแพร่แล้วโดยไม่ต้องใช้บัญชีทีมงาน และไม่เพิ่มพื้นผิวโจมตี

- **Shared** — `packages/shared/src/api-key.ts`
  - กุญแจ `lum_<site id แบบไม่มีขีด>.<random 32>` — ส่วน site ใช้เลือกขอบเขต RLS ก่อนตรวจ hash
  - `apiKeyInputSchema` (ชื่อ + scope), view types, `apiKeyCreatedSchema` (มี `secret` ครั้งเดียว)
  - `publicApiDocumentSchema/ListSchema` สำหรับ endpoint อ่าน
- **ฐานข้อมูล** — `api_keys`: เก็บ SHA-256 (`key_hash` UNIQUE), `hint`, `scopes`, `last_used_at`,
  `revoked_at`; FORCE RLS + index `(site_id, revoked_at)`
- **API** — `apps/api/src/modules/api-keys`
  - `GET/POST /v1/api-keys` (owner/admin สร้าง), `DELETE /v1/api-keys/:keyId` เพิกถอน (audit)
  - `GET /v1/public-api/pages|posts` และ `/:slug` รับ `X-Api-Key`, rate limit 240/นาที,
    ตรวจ scope `content:read`, ตอบเฉพาะ `status = published`, `access = public` และไม่อยู่ถังขยะ
  - กุญแจผิด/ถูกเพิกถอน/รูปแบบผิด → 401 เดียวกัน (ไม่บอกว่าใกล้เคียงหรือไม่)
- **แอดมิน** — ตั้งค่า › กุญแจ API: สร้าง (แสดง secret ใน modal + ปุ่มคัดลอก), รายการพร้อมรหัสย่อ/
  ใช้ล่าสุด, เพิกถอนพร้อมคำยืนยัน, โหมดเดโมในหน่วยความจำ
- **ความปลอดภัย** — เทียบ hash ด้วย `timingSafeEqual`, token ไม่อยู่ใน log/response อื่น,
  ไม่มีทางอ่านหน้า `members` หรือเนื้อหาที่ยังไม่เผยแพร่
- **เทสต์** — shared 3, API 6, admin 5 (demo + HTTP headers/error)
- **เอกสาร** — `12-api.md` 12.10, `11-data-model.md` 11.6, `13-rbac.md` 13.7, `OPERATIONS.md`

```bash
pnpm --filter @lumio/shared test api-key
pnpm --filter api test src/modules/api-keys
pnpm --filter admin test src/settings/api-keys.test.ts
pnpm lint && pnpm typecheck && pnpm test
```

## ก้อนที่ 68 — วางไลเซนส์ในหน้าจอ (เก็บในฐานข้อมูล ไม่ต้องแก้ .env)

ปิดรายการค้าง “หน้าจอแอดมินสำหรับวางไลเซนส์” ใน 24.8: เจ้าของเว็บวางโทเคนที่ซื้อมาได้เอง
จากหลังบ้าน ระบบเก็บในฐานข้อมูลให้ — `LUMIO_LICENSE` ยังใช้ได้และชนะเสมอเมื่อต้องปักจาก config

- **ฐานข้อมูล** — migration `20261116000000_platform_license`
  ตาราง `platform_license` แถวเดียว (`id = 'default'`, `token`, `updated_by`, `updated_at`)
  ระดับแพลตฟอร์มเหมือน `agency_branding`: ไม่มี `site_id` และไม่มี RLS
- **Shared** — `LICENSE_SOURCES`, `installLicenseInputSchema`, `licenseViewSchema`
  (สถานะเดิม + `source`: `env`/`database`/`none` + `installedAt`)
- **API** — `LicenseStore` ใหม่ + controller
  - `GET /v1/license` ตอบ `source`/`installedAt` ให้หน้าจอรู้ว่าไลเซนส์มาจากไหน
  - `PATCH /v1/license` (owner) ตรวจลายเซ็นก่อนบันทึกทุกครั้ง, audit `license.install`,
    เก็บใน DB แล้วโหลดเข้า memory (feature check เป็น synchronous) และถ้าเป็นโหมด online
    จะขอ lease ทันที
  - `DELETE /v1/license` (owner) กลับเป็น Community + audit `license.remove`
  - บูตแล้วอ่านแถวจาก DB; ถ้าตารางยังไม่มีจะไม่ทำให้ API ล่ม (ขึ้น warning แล้วเป็น Community)
  - `refresh()` ยิงเครื่องออกไลเซนส์เฉพาะโทเคนโหมด `online` (เดิมยิงแม้เป็นออฟไลน์แล้วขึ้น warning)
- **แอดมิน** — ตั้งค่า › ไลเซนส์ (owner): การ์ดสถานะ (รุ่น/แพ็กเกจ/ผู้ถือ/วันหมดอายุ/โหมด/ที่มา/
  ความสามารถที่เปิด), กล่องวางโทเคน + ติดตั้ง/ถอด (พร้อม toast + audit), ปุ่ม “ต่ออายุตอนนี้”
  สำหรับไลเซนส์ออนไลน์, แบนเนอร์อธิบายเมื่อไลเซนส์มาจาก .env
- **เอกสาร** — `24-community-licensing.md` 24.10 + 24.8, `12-api.md`, `11-data-model.md`,
  `OPERATIONS.md`, `.env.example`
- **ผลตรวจ** — API 964 เคส (เพิ่ม store 7 + HTTP 4), admin 517 เคส (เพิ่ม 8); lint/typecheck ผ่าน

```bash
pnpm --filter api db:deploy
pnpm --filter api test src/modules/license src/http/api.spec.ts
pnpm --filter admin test src/settings/LicensePanel
pnpm lint && pnpm typecheck && pnpm test
```

