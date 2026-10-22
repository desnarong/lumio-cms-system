# 11 — Data Model (PostgreSQL)

## 11.1 หลักการออกแบบ

1. ทุกตารางที่เป็นข้อมูลของเว็บ **ต้องมี `site_id`** + RLS
2. ข้อมูลยืดหยุ่น (blocks, settings, tokens) ใช้ **`jsonb`** และมี Zod schema คู่กัน
3. ใช้ **UUID** เป็น PK (ยกเว้น log ที่ใช้ BIGSERIAL)
4. เนื้อหา page/post ใช้ตารางเดียว แยกด้วย `type`
5. draft กับ published แยกคอลัมน์ (`blocks_draft` / `blocks_published`) เพื่อ preview ได้โดยไม่กระทบเว็บจริง

## 11.2 Schema

```sql
-- องค์กร / ผู้ใช้
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT, avatar_url TEXT,
  totp_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  locale_default TEXT DEFAULT 'th',
  locales TEXT[] DEFAULT '{th}',
  template_id UUID,
  theme_tokens JSONB NOT NULL DEFAULT '{}',   -- สี ฟอนต์ มุมโค้ง ฯลฯ
  settings JSONB NOT NULL DEFAULT '{}',
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE site_members (
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','author','viewer')),
  PRIMARY KEY (site_id, user_id)
);

CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  hostname TEXT UNIQUE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  ssl_status TEXT DEFAULT 'pending',
  verified_at TIMESTAMPTZ
);

-- เนื้อหา (หน้า + บทความใช้ตารางเดียว แยกด้วย type)
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('page','post')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  locale TEXT DEFAULT 'th',
  status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','scheduled','published','archived')),
  blocks_draft JSONB NOT NULL DEFAULT '[]',
  blocks_published JSONB,
  excerpt TEXT,
  cover_media_id UUID,
  author_id UUID REFERENCES users(id),
  seo JSONB DEFAULT '{}',          -- title, description, og_image, noindex
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,          -- เวลาย้ายไปถังขยะ; purge หลัง 30 วัน
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, locale, type, slug)
);
CREATE INDEX idx_contents_site_status ON contents (site_id, type, status, published_at DESC);
CREATE INDEX idx_contents_trash ON contents (site_id, status, archived_at);

CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  blocks JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE taxonomies (            -- หมวดหมู่ / แท็ก
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  kind TEXT CHECK (kind IN ('category','tag')),
  name TEXT, slug TEXT,
  UNIQUE (site_id, kind, slug)
);
CREATE TABLE content_taxonomies (
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  taxonomy_id UUID REFERENCES taxonomies(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, taxonomy_id)
);

-- สื่อ
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  filename TEXT, mime TEXT, size_bytes BIGINT,
  width INT, height INT,
  alt TEXT, focal_point JSONB,
  variants JSONB DEFAULT '[]',     -- [{w:480,url,format:'webp'}...]
  folder TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- เมนู
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  location TEXT CHECK (location IN ('header','footer','custom')),
  items JSONB NOT NULL DEFAULT '[]'  -- tree: [{label, href|contentId, children:[...]}]
);

-- Global sections (Header/Footer ที่ใช้ซ้ำ)
CREATE TABLE global_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT, kind TEXT,            -- header | footer | reusable
  blocks JSONB NOT NULL
);

-- ฟอร์ม
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT,
  fields JSONB NOT NULL,
  notify JSONB DEFAULT '{}',       -- {email:[...], line_token:'...'}
  success_message TEXT
);
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  ip INET, user_agent TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  email CITEXT, status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, email)
);

-- Redirects, Apps, Analytics, Audit
CREATE TABLE redirects (
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  from_path TEXT, to_path TEXT, code INT DEFAULT 301,
  PRIMARY KEY (site_id, from_path)
);
CREATE TABLE site_apps (
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  app_key TEXT, config JSONB, enabled BOOLEAN DEFAULT true,
  PRIMARY KEY (site_id, app_key)
);
CREATE TABLE pageviews (            -- เก็บแบบ privacy-friendly ไม่เก็บ IP เต็ม
  site_id UUID, path TEXT, referrer TEXT, country TEXT, device TEXT,
  session_hash TEXT, ts TIMESTAMPTZ DEFAULT now()
) PARTITION BY RANGE (ts);
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  site_id UUID, user_id UUID, action TEXT, target TEXT, meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ผู้ช่วย AI: หนึ่งแถวต่อหนึ่งครั้งที่นำข้อเสนอไปใช้ (นับเป็นโควตารายเดือนของแพ็กเกจ)
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID, action TEXT NOT NULL,      -- rewrite | translate | alt-text | seo
  provider TEXT NOT NULL, model TEXT DEFAULT '', items INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ai_usage_site_created_idx ON ai_usage (site_id, created_at DESC);

-- Row-Level Security ตัวอย่าง
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON contents
  USING (site_id = current_setting('app.current_site')::uuid);
```

## 11.3 ตารางที่ยังไม่มีใน MVP (เพิ่มภายหลัง)

| ตาราง | เฟส | หมายเหตุ |
|---|---|---|
| `translations` / `translation_group_id` | 2 | เชื่อมหน้าแต่ละภาษา (ดู [17](17-i18n.md)) |
| `products`, `orders`, `order_items` | 3 | E-commerce — ทำแล้วในก้อนที่ 37; บัตร Stripe เพิ่ม `orders.provider/provider_ref/payment_url` ในก้อนที่ 39; คืนเงินเพิ่ม `orders.refunded_amount/refunded_at/refund_reason/refund_ref` และสถานะ `refunded` ในก้อนที่ 47 |
| `memberships` | 3 | Paywall |
| `webhooks`, `api_keys` | 3 | Public API |

## 11.4 Checklist ตารางใหม่

- [ ] มี `id UUID default gen_random_uuid()`
- [ ] มี `site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE` (ยกเว้นตารางระดับแพลตฟอร์ม)
- [ ] มี `created_at`, `updated_at`
- [ ] `ENABLE ROW LEVEL SECURITY` + policy `site_isolation`
- [ ] Index สำหรับ query หลัก
- [ ] ข้อมูลยืดหยุ่นใช้ `JSONB` + Zod schema คู่กัน
- [ ] มี Prisma model ที่ตรงกัน + seed

## 11.5 RLS — กติกาการใช้งาน

- ทุก request ที่แตะข้อมูลเว็บ ต้อง `SET LOCAL app.current_site = '<site_id>'` ก่อน query
- helper `this.db.forSite(siteId)` ทำหน้าที่นี้ให้อัตโนมัติ
- ตารางระดับแพลตฟอร์ม (users) ไม่ใช้ RLS แต่กรองด้วย logic
- Test บังคับ: ผู้ใช้ site A อ่านข้อมูล site B ไม่ได้

## 11.6 Index ที่สำคัญ

| ตาราง | Index | เหตุผล |
|---|---|---|
| contents | `(site_id, type, status, published_at DESC)` | list หน้า/บทความ |
| contents | `(site_id, locale, type, slug)` UNIQUE | lookup ตาม URL |
| contents | `(site_id, status, archived_at)` | หน้าถังขยะ + งาน purge |
| media | `(site_id, folder)` | จัดกลุ่มไฟล์ |
| form_submissions | `(form_id, created_at DESC)` | ดูข้อความล่าสุด |
| pageviews | partition by `ts` | query ช่วงเวลาเร็ว |

---

[← Architecture](10-architecture.md) · [ถัดไป: API →](12-api.md)
