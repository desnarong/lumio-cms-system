# Commercial licence (paid capabilities)

Lumio Community edition อยู่ภายใต้ [AGPL-3.0](LICENSE)

ฟีเจอร์ที่ขายแยก ได้แก่:

- **Membership / Paywall** — บัญชีผู้อ่าน แพ็กเกจสมาชิก และการเข้าถึงเนื้อหาเฉพาะสมาชิก
- **Block Marketplace** — ติดตั้งชุดบล็อกจากภายนอกที่ลงลายเซ็น
- **Agency / White-label** — ใช้ชื่อ โลโก้ และสีของเอเจนซีในหลังบ้าน และซ่อนเครดิต Lumio

Membership/Paywall **มีซอร์สอยู่ในรีโปนี้** (ก้อนที่ 60) แต่เปิดใช้ได้เฉพาะเมื่อไลเซนส์ที่ลงลายเซ็น
ระบุ `membership` — ยังต้องเปิดสวิตช์ใน ตั้งค่า › ส่วนเสริม ของแต่ละเว็บอีกชั้น
Block Marketplace (ก้อนที่ 61) เปิดเมื่อไลเซนส์ระบุ `marketplace` และ Agency/White-label (ก้อนที่ 66)
เปิดเมื่อไลเซนส์ระบุ `whitelabel` (แก้ที่ ตั้งค่า › แบรนด์องค์กร)
รายละเอียดรูปแบบไลเซนส์และ API ตรวจสอบลายเซ็น: [`docs/design/24-community-licensing.md`](docs/design/24-community-licensing.md)

## สิ่งที่คุณทำได้กับ Community edition

- ใช้สร้างเว็บให้ตัวเองหรือลูกค้า
- แก้ไขและเผยแพร่โค้ดที่แก้ต่อภายใต้ AGPL-3.0
- โฮสต์เป็นบริการให้คนอื่นใช้ (ต้องเปิดเผยโค้ดที่แก้ตาม AGPL)

## สิ่งที่ต้องมีไลเซนส์

- เปิดฟีเจอร์ Membership/Paywall, Block Marketplace หรือ Agency/White-label (`LUMIO_LICENSE` ต้องระบุฟีเจอร์นั้น)
- ใช้แบรนด์/โลโก้ของผู้ขายในเชิงพาณิชย์โดยไม่มีไลเซนส์ `whitelabel` (ติดต่อแยก)
- ขอเงื่อนไขแบบไม่ผูก AGPL (dual licence) สำหรับองค์กรที่แก้โค้ดแล้วไม่ต้องการเผยแพร่

ติดต่อ: **desnarong.sm@gmail.com** หรือเปิด issue ใน GitHub
