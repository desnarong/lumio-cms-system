---
name: lumio-versioning
description: Use after any change to files in the Lumio repo, before finishing the task — bumps the shared version in every package.json (root "lumio" included) so the release number always reflects the latest change.
---

# Lumio Versioning

ทุกครั้งที่ "แก้หรือเพิ่มไฟล์" ในโปรเจกต์ ให้อัปเดตเวอร์ชันก่อนสรุปงาน
(อ่านอย่างเดียว ตอบคำถาม หรือรันเทสต์เฉย ๆ ไม่ต้อง bump)

## แหล่งความจริงเดียว

- เวอร์ชันกลางอยู่ที่ `package.json` ราก (`name: "lumio"`)
- ทุก workspace (`apps/*`, `packages/*`) ใช้เลขเวอร์ชันเดียวกันเสมอ
- ห้ามแก้เวอร์ชันด้วยมือทีละไฟล์ ให้ใช้สคริปต์เพื่อกันเลขไม่ตรงกัน

## เลือกชนิดการ bump

| ชนิด | ใช้เมื่อ | ตัวอย่าง |
|---|---|---|
| `patch` (ค่าเริ่มต้น) | แก้บั๊ก ปรับสไตล์ ข้อความ ค่าคอนฟิก รีแฟกเตอร์ | ซ่อม footer ชิดขอบ, แก้สีปุ่ม |
| `minor` | เพิ่มความสามารถใหม่ที่ไม่ทำลายของเดิม | ฟิลด์ใหม่ใน Block, ปุ่มจัดลำดับเมนู, endpoint ใหม่ |
| `major` | เปลี่ยนแบบทำลายของเดิม ต้อง migrate/แก้ข้อมูล | เปลี่ยน schema ที่ต้องย้ายข้อมูล, ลบ API |

ถ้าไม่มั่นใจ ให้ใช้ `patch` และระบุเหตุผลสั้น ๆ ในคำตอบสุดท้าย

## ขั้นตอน

1. bump ครั้งเดียวตอนจบงาน (ไม่ bump ทุกไฟล์ที่แก้):

```bash
node scripts/bump-version.mjs patch
# หรือ
node scripts/bump-version.mjs minor
# หรือ (ต้องมีเหตุผลชัดเจน)
node scripts/bump-version.mjs major
```

2. ตรวจว่าเลขตรงกันทุกที่:

```bash
node -e "const fs=require('fs');for(const f of ['package.json','apps/api/package.json','apps/admin/package.json','apps/renderer/package.json','packages/blocks/package.json','packages/shared/package.json','packages/ui/package.json','packages/tokens/package.json','packages/sdk/package.json'])console.log(f,JSON.parse(fs.readFileSync(f,'utf8')).version)"
```

3. รัน lint / typecheck / test ตามงานที่แก้
4. รายงานในคำตอบสุดท้ายว่า bump เป็นเวอร์ชันอะไร

## ห้าม

- ห้าม bump มากกว่า 1 ครั้งต่องาน
- ห้ามใช้ `major` เองถ้าผู้ใช้ยังไม่ได้สั่งหรือยังไม่มีแผน migrate
- ห้ามลืม bump เมื่อแก้ไฟล์ แต่ถ้าผู้ใช้สั่งชัดว่า "อย่า bump" ให้ทำตามผู้ใช้
- ห้ามแก้ `pnpm-lock.yaml` เพราะเวอร์ชันของ workspace ใช้ `workspace:*`
