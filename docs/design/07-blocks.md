# 07 — Block System

Block = หน่วยเนื้อหาที่ลากวางได้ หนึ่งหน้าคือ JSON tree ของ blocks
เก็บใน PostgreSQL (`jsonb`) แล้ว render เป็น HTML ผ่าน SSR/SSG

## 7.1 รายการ Block ในตัว

| หมวด | Blocks |
|---|---|
| **โครงสร้าง** | Section, Columns, Container, Spacer, Divider |
| **ข้อความ** | Heading, Paragraph, List, Quote, Rich text |
| **สื่อ** | Image, Gallery, Video (YouTube/Vimeo/upload), Slider, Icon |
| **Hero/Landing** | Hero, Features, Pricing, Testimonials, FAQ (Accordion), CTA, Stats, Logos, Timeline, Team |
| **ปฏิสัมพันธ์** | Button, Form, Newsletter, Map, Social links, LINE/Call floating button |
| **เนื้อหาไดนามิก** | Blog list, Post grid, Latest posts, Search |
| **ขั้นสูง** | HTML/Embed, Code, Custom component |

## 7.2 Section Templates (คลังสำเร็จรูป)

มี 100+ section สวยๆ แยกหมวด (Hero ×15, Features ×12, Pricing ×6 ...)
กดเพิ่มทีเดียวได้ทั้งส่วน แล้วปรับเนื้อหา

**โครงสร้างคลัง**: `packages/blocks/sections/<category>/<name>.json` + preview thumbnail

## 7.3 Block Schema (JSON)

```json
{
  "id": "blk_01HZX...",
  "type": "hero",
  "version": 1,
  "props": {
    "layout": "split-right",
    "heading": "ร้านกาแฟคั่วสดทุกเช้า",
    "subheading": "ส่งตรงถึงบ้านคุณทั่วประเทศ",
    "buttons": [
      { "label": "สั่งเลย", "href": "/shop", "variant": "primary" },
      { "label": "เรื่องราวของเรา", "href": "/about", "variant": "ghost" }
    ],
    "image": { "mediaId": "med_123", "alt": "เมล็ดกาแฟคั่ว" },
    "background": { "type": "color", "token": "surface" }
  },
  "style": {
    "paddingY": "xl",
    "visibility": { "mobile": true, "tablet": true, "desktop": true },
    "animation": "fade-up"
  },
  "children": []
}
```

### คำอธิบายฟิลด์

| ฟิลด์ | ความหมาย |
|---|---|
| `id` | ULID, ไม่ซ้ำทั้งระบบ |
| `type` | ตรงกับ key ใน registry |
| `version` | schema version ของ block นี้ (ใช้ migration) |
| `props` | เนื้อหา/ข้อมูลเฉพาะ block (validate ด้วย Zod) |
| `style` | รูปแบบที่ใช้ร่วมทุก block (spacing, visibility, animation) |
| `children` | block ลูก (สำหรับ Section/Columns/Container) |

## 7.4 โครงไฟล์ต่อ 1 Block

ทุก block อยู่ใน `packages/blocks/src/<name>/` และต้องมีครบ 5 ไฟล์:

1. `schema.ts` — Zod schema ของ `props` + `style` + `version`
2. `Block.tsx` — renderer (ใช้ได้ทั้ง SSR ใน renderer และ editor)
3. `Panel.tsx` — แผงตั้งค่าด้านข้าง (ใช้ component จาก `packages/ui` เท่านั้น)
4. `defaults.ts` — ค่าเริ่มต้นที่ "สวยตั้งแต่ยังไม่แก้" (ข้อความไทยตัวอย่างจริง)
5. `index.ts` — export + ลงทะเบียนใน `registry.ts`

## 7.5 Block Registry

```ts
registry.register({
  type: "hero",
  label: "ส่วนต้อนรับ (Hero)",
  icon: "Layout",
  category: "landing",
  schema, Block, Panel, defaults,
});
```

- Block จาก App (custom block) ปรากฏในรายการอัตโนมัติ (ดู [16](16-apps.md))
- รายการ block เรียงตามหมวด + ค้นหาได้ (slash menu)

## 7.6 หลักการเขียน Block

1. **ห้าม hard-code สี/ขนาด** — ใช้ design tokens (ดู [06](06-design-system.md))
2. **แก้ข้อความ inline ได้** — ผ่าน `<Editable path="props.heading" />`
3. **รองรับ responsive** (mobile-first) + `style.visibility`
4. **รูปทุกใบใช้ `<Img>`** (lazy, srcset, alt บังคับ)
5. **ห้ามเรียก API ตรงจาก Block** — ข้อมูลไดนามิกมาจาก data loader ที่ลงทะเบียนไว้
6. **ห้าม `dangerouslySetInnerHTML`** ถ้าไม่ผ่าน `sanitizeHtml()`
7. **defaults ต้องสวยและใช้ข้อความไทยจริง** ไม่ใช่ lorem ipsum

## 7.7 Versioning & Migration

- เปลี่ยนโครงสร้าง `props` → เพิ่ม `version` และเขียน migration ใน `migrations.ts`
- Migration ทำงานตอนโหลด block (lazy) หรือ batch job ตอน deploy
- ห้ามลบฟิลด์ทันที — deprecate ก่อน 1 release

```ts
// migrations.ts
export const migrations = {
  1: (props) => ({ ...props, subheading: props.subheading ?? "" }), // v1 -> v2
};
```

## 7.8 Data loader (เนื้อหาไดนามิก)

Block ที่ดึงข้อมูล (Blog list, Latest posts, Search) ต้องประกาศ loader:

```ts
registry.registerLoader("latest-posts", async (ctx, { limit }) => {
  return ctx.db.posts.latest({ siteId: ctx.siteId, limit });
});
```

- Loader ทำงานฝั่ง server ตอน render (ISR) — ไม่เรียกจาก client
- ต้องกรองด้วย `site_id` เสมอ

---

[← Design System](06-design-system.md) · [ถัดไป: Theme & Design Panel →](08-theme-design-panel.md)
