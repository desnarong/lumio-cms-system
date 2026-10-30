# 13 — สิทธิ์และบทบาท (RBAC)

## 13.1 ตารางสิทธิ์

| สิทธิ์ | Owner | Admin | Editor | Author | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| จัดการแพ็กเกจ/ชำระเงิน | ✅ | – | – | – | – |
| โดเมน / ตั้งค่าเว็บ | ✅ | ✅ | – | – | – |
| จัดการทีม | ✅ | ✅ | – | – | – |
| ออกแบบ (Design) | ✅ | ✅ | ✅ | – | – |
| แก้/Publish ทุกหน้า | ✅ | ✅ | ✅ | – | – |
| เขียนบทความของตัวเอง | ✅ | ✅ | ✅ | ✅ (ส่งตรวจ) | – |
| ดูข้อความจากฟอร์ม | ✅ | ✅ | ✅ | – | ✅ |
| ดูสมาชิก/แพ็กเกจ (Membership) | ✅ | ✅ | ✅ | – | – |
| ดูเฉยๆ | ✅ | ✅ | ✅ | ✅ | ✅ |

## 13.2 คำอธิบายบทบาท

| Role | ใคร | ทำอะไรได้ | ข้อจำกัด |
|---|---|---|---|
| **Owner** | เจ้าของเว็บ | ทุกอย่าง รวม billing | มีได้ 1 คน/เว็บ (โอนได้) |
| **Admin** | ผู้ดูแล | ตั้งค่า, โดเมน, ทีม, เนื้อหา | ไม่แตะ billing |
| **Editor** | ผู้ดูแลเนื้อหา | เนื้อหาทุกชิ้น + design | ไม่แตะตั้งค่า/ทีม |
| **Author** | นักเขียน | บทความของตัวเอง (ส่งตรวจ) | publish เองไม่ได้ |
| **Viewer** | ผู้ชม | ดูอย่างเดียว | แก้ไม่ได้ |

> **Membership/Paywall** (ก้อนที่ 60): แท็บ เติบโต › สมาชิก เปิดให้ owner/admin/editor
> (ชื่อ-อีเมลผู้อ่านเป็นข้อมูลส่วนบุคคล viewer จึงไม่เห็น) และทั้งโมดูลยังถูกปิดด้วย
> `@RequireFeature('membership')` จนกว่าไลเซนส์จะระบุ — ตัวสิทธิ์การอ่านของหน้า
> ตั้งได้จาก editor ซึ่งเป็นคนกลุ่มเดียวกับที่แก้เนื้อหา

## 13.3 Workflow การส่งตรวจ (Author → Editor)

```
Author เขียน → status = draft → กด "ส่งตรวจ" → pending_review
Editor เปิดดู → อนุมัติ → publish  |  ส่งกลับ → กลับเป็น draft + คอมเมนต์
```

## 13.4 Enforcement (บังคับใช้จริงที่ชั้นไหน)

| ชั้น | ทำอะไร |
|---|---|
| UI | ซ่อนเมนู/ปุ่มที่ role เข้าไม่ได้ (ไม่ใช่ disable) |
| API | `@Roles(...)` + `RolesGuard` — **ชั้นบังคับหลัก** |
| DB | RLS กรองด้วย `site_id` (กันข้ามเว็บ) |
| Audit | log ทุกการกระทำที่สำคัญ |

> **กติกา**: UI ซ่อนเพื่อความสะอาด แต่ **ห้ามเชื่อ UI** — ต้องบังคับที่ API เสมอ

## 13.5 การเพิ่ม Role ใหม่

1. เพิ่มค่าใน CHECK constraint ของ `site_members.role` (migration)
2. เพิ่ม mapping สิทธิ์ใน `packages/shared/src/rbac.ts`
3. อัปเดตตารางนี้ + test ว่า role ใหม่เข้า/ไม่เข้าถึงได้ตามที่กำหนด
4. ห้าม hard-code ชื่อ role ใน component — ใช้ helper `can(user, action)`

## 13.6 ตัวอย่าง helper

```ts
// packages/shared/src/rbac.ts
export const can = (role: Role, action: Action) => PERMISSIONS[action].includes(role);

can("author", "content.publish");   // false
can("editor", "design.update");     // true
```

---

[← API](12-api.md) · [ถัดไป: SEO & Performance →](14-seo-performance.md)
