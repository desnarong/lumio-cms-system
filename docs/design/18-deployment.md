# 18 — Deployment

## 18.1 docker-compose (ตัวอย่างพัฒนา/Self-host)

```yaml
services:
  api:
    build: ./apps/api
    env_file: .env
    depends_on: [db, redis]
  worker:
    build: ./apps/api
    command: node dist/worker.js
    env_file: .env
    depends_on: [db, redis]
  admin:
    build: ./apps/admin # React SPA (static, serve ผ่าน Nginx)
  renderer:
    build: ./apps/renderer # Next.js
    env_file: .env
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7
  minio:
    image: minio/minio
    command: server /data --console-address ":49601"
    volumes: [miniodata:/data]
  caddy:
    image: caddy:2 # reverse proxy + auto TLS (on-demand สำหรับ custom domain)
    ports: ['49700:80', '49701:443']
    volumes: [./Caddyfile:/etc/caddy/Caddyfile, caddy_data:/data]
volumes: { pgdata: {}, miniodata: {}, caddy_data: {} }
```

## 18.2 Monorepo Structure

```
lumio/
├─ apps/
│  ├─ admin/        # React admin + editor
│  ├─ api/          # NestJS API + worker
│  └─ renderer/     # Next.js public site renderer
├─ packages/
│  ├─ blocks/       # block definitions (schema + React render + editor UI)
│  ├─ ui/           # design system components
│  ├─ tokens/       # design tokens
│  ├─ sdk/          # app/block SDK
│  └─ shared/       # types, zod schemas
├─ templates/       # template packs
└─ infra/           # docker, caddy, CI
```

## 18.3 Environments

| env          | ใช้กับ     | หมายเหตุ                                |
| ------------ | ---------- | --------------------------------------- |
| `local`      | พัฒนา      | docker compose, seed ข้อมูลตัวอย่าง     |
| `staging`    | ทดสอบ      | ข้อมูลใกล้ production, มี feature flags |
| `production` | ผู้ใช้จริง | multi-AZ, backup, monitoring            |

## 18.4 CI/CD

```
PR ─▶ lint ─▶ typecheck ─▶ test ─▶ build ─▶ Lighthouse CI ─▶ preview deploy
main ─▶ ... ─▶ staging ─▶ (อนุมัติ) ─▶ production
```

- ทุก PR ต้องผ่าน lint + typecheck + test + Lighthouse budget
- Deploy production ต้องมี migration ที่ปลอดภัย (ดูสกิล `lumio-db-migration`)
- Rollback ได้: เก็บ image เวอร์ชันก่อนไว้

## 18.5 Custom Domain + SSL

- Caddy on-demand TLS: ขอ cert ตาม `Host` ที่เข้ามา
- ตรวจว่า domain ถูก verify (DNS TXT หรือ CNAME) ก่อนออก cert
- แจ้งสถานะ SSL ใน UI (pending / active / error)
- worker ตรวจโดเมนที่ยัง `pending` ซ้ำทุก 5 นาที (`DomainsVerifier`) แล้วเปิด `ssl_status = active`
  ให้เองเมื่อ DNS ชี้มา ลูกค้าไม่ต้องกลับมากดยืนยัน และ Caddy จะออกใบรับรองให้ทันทีที่มี request แรก

Caddy ถาม API ก่อนออกทุกใบรับรองผ่าน `on_demand_tls.ask`:

```caddyfile
{
	on_demand_tls {
		ask {$LUMIO_TLS_ASK_URL:http://api:49100/api/v1/public/tls/ask}
	}
}

https:// {
	tls {
		on_demand
	}
	reverse_proxy renderer:49200
}
```

`GET /api/v1/public/tls/ask?domain=<host>` ตอบ 200 เฉพาะโดเมนที่ `ssl_status = active`
และ `verified_at` ไม่เป็น null; นอกนั้นตอบ 403 (ไม่บอกว่าโดเมนมีอยู่หรือไม่)
endpoint นี้ไม่มี auth เพราะเรียกจาก Caddy แบบ server-to-server แต่มี rate limit 120/นาที/IP
และไม่ cache คำตอบ

## 18.6 แพ็กเกจ (ตัวอย่าง Business Model)

| แพ็กเกจ  | ราคา/เดือน | สิ่งที่ได้                              |
| -------- | ---------- | --------------------------------------- |
| Free     | 0          | Subdomain, 3 หน้า, โลโก้ Lumio          |
| Starter  | ฿199       | โดเมนเอง, 20 หน้า, ฟอร์ม, SEO           |
| Pro      | ฿499       | ไม่จำกัดหน้า, Analytics, Newsletter, AI |
| Business | ฿1,290     | หลายภาษา, ทีมงาน 10 คน, E-commerce      |
| Agency   | ติดต่อ     | Multi-site, White-label, API            |

## 18.7 Quota ต่อแพ็กเกจ

| ทรัพยากร         | Free   | Starter | Pro      | Business |
| ---------------- | ------ | ------- | -------- | -------- |
| หน้า             | 3      | 20      | ไม่จำกัด | ไม่จำกัด |
| ไฟล์สื่อ         | 100 MB | 2 GB    | 20 GB    | 100 GB   |
| AI (ครั้ง/เดือน) | –      | –       | 200      | 1,000    |
| ทีม              | 1      | 2       | 5        | 10       |

## 18.8 Updates (เวอร์ชันใหม่ + อัปเดตอัตโนมัติ)

แอดมินแสดง **เวอร์ชันที่ติดตั้งอยู่** ที่ footer ของ sidebar ทุกหน้า และถาม API
`GET /api/v1/updates` เป็นระยะ เมื่อมีรุ่นใหม่จะขึ้นกล่อง "มีเวอร์ชันใหม่ x.y.z"
พร้อมบอกว่า "ตอนนี้ใช้ a.b.c" และลิงก์ไป release notes

API ตรวจ manifest (ค่าเริ่มต้นคือหน้า
[github.com/desnarong/lumio-cms-system/releases](https://github.com/desnarong/lumio-cms-system/releases)
ซึ่งระบบแปลงเป็น GitHub API ให้เอง) แล้ว cache คำตอบ 6 ชั่วโมง ตั้ง
`LUMIO_UPDATE_MANIFEST_URL` เป็น JSON ของตัวเองได้:

```json
{ "version": "0.24.0", "releaseUrl": "https://example.com/releases/0.24.0", "notes": "..." }
```

**การอัปเดตจริงทำที่ host** เพราะ process ใน container ยังไม่สามารถ rebuild
container ตัวเองได้อย่างปลอดภัย ใช้สคริปต์ที่มากับ repo:

```bash
node scripts/update.mjs --check   # ดูว่ามีรุ่นใหม่ไหม (ไม่แก้อะไร)
node scripts/update.mjs           # อัปเดตครั้งเดียวถ้ามีรุ่นใหม่
node scripts/update.mjs --auto    # วนตรวจและอัปเดตเองตามรอบ
```

สคริปต์จะ fetch tag, checkout, `docker compose --profile app up -d --build`,
รอ `/api/health` และ **ย้อนกลับ commit เดิม + rebuild** ถ้ารุ่นใหม่ไม่ขึ้น
(ปฏิเสธการทำงานถ้ามีไฟล์ที่ยังไม่ commit เพื่อไม่ให้งานหลุด)

ตั้ง `LUMIO_AUTO_UPDATE=true` เพื่อให้หน้าแอดมินบอกผู้ใช้ว่าระบบอัปเดตเอง
และติดตั้ง timer:

```bash
sudo cp infra/systemd/lumio-update.* /etc/systemd/system/
sudo systemctl enable --now lumio-update.timer
```

---

[← i18n](17-i18n.md) · [ถัดไป: Roadmap →](19-roadmap.md)
