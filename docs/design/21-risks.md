# 21 — ความเสี่ยงและแนวทางรับมือ

## 21.1 ตารางความเสี่ยง

| ความเสี่ยง | ผลกระทบ | แนวทาง |
|---|---|---|
| Visual editor ซับซ้อน ใช้เวลาพัฒนานาน | สูง | เริ่มจาก block จำกัด 20 ตัว, ใช้ TipTap/dnd-kit ไม่เขียนเอง |
| เนื้อหาเสียหายเมื่อเปลี่ยน Template | กลาง | แยก content/presentation, Block schema มี version + migration |
| Custom domain + SSL จำนวนมาก | กลาง | Caddy on-demand TLS / Cloudflare for SaaS |
| ต้นทุนรูป/CDN บานปลาย | กลาง | R2 (ไม่คิด egress), จำกัด quota ตามแพ็กเกจ |
| App ที่ไม่ปลอดภัย | สูง | Sandbox + permission + review ก่อนขึ้น Store |
| ต้นทุน AI | กลาง | Quota ตามแพ็กเกจ, cache ผลลัพธ์, ใช้โมเดลเล็กกับงานง่าย |

## 21.2 ความเสี่ยงเชิงเทคนิคที่ต้องเฝ้าดู

| ความเสี่ยง | สัญญาณเตือน | รับมือเชิงรุก |
|---|---|---|
| Publish pipeline ช้า | queue ค้าง, publish > 10s | วัด queue depth, scale worker อัตโนมัติ |
| RLS ตั้งผิด → ข้อมูลข้ามเว็บ | test ข้ามเว็บ fail | test บังคับทุกตารางใหม่ |
| Block schema แตกหลังอัปเดต | render พังกับ block เก่า | migration + fallback ค่า default |
| Multi-tenant noisy neighbor | เว็บหนึ่งกิน resource หมด | quota + rate limit ต่อ site |

## 21.3 ความเสี่ยงเชิงธุรกิจ

| ความเสี่ยง | รับมือ |
|---|---|
| ผู้ใช้สับสนยังไม่หาย แม้ลดเมนู | ทดสอบ usability กับคนนอกเป็นระยะ |
| แข่งกับ WordPress ไม่ได้เรื่อง ecosystem | โฟกัสกลุ่ม "คนไม่เคยทำเว็บ" ไม่แข่งจำนวน plugin |
| ต้นทุน hosting สูง | managed plan + quota + CDN ถูก |
| ทีมเล็ก ทำไม่ทัน roadmap | ตัดฟีเจอร์ที่ไม่อยู่ในเส้นทาง publish ให้ตัดออก |

## 21.4 เกณฑ์ "ถอย" (Kill Criteria)

ถ้าฟีเจอร์หนึ่งทำแล้วทำให้ UX ซับซ้อนขึ้นโดยไม่ช่วยภารกิจ publish ให้ **ตัดออก** —
หลักการคือ "เพิ่มได้เฉพาะสิ่งที่ทำให้ภารกิจหลักเร็วขึ้น"

---

[← Metrics](20-metrics.md) · [ถัดไป: ทำไมง่ายกว่า WordPress →](22-why-easier.md)
