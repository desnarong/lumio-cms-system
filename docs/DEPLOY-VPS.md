# ขึ้น VPS จริง (ตัวอย่าง: https://savvyapp.cc บนเครื่องที่มีระบบอื่นอยู่แล้ว)

> กรณีนี้คือ VPS ที่ **Nginx เดิมยึดพอร์ต 80/443 ไว้ให้ระบบอื่น** จึงไม่ใช้ Caddy
> ของ Lumio แต่ให้ Nginx เดิมเป็น reverse proxy ไปยัง container ที่ผูก `127.0.0.1`
> แนวทาง Docker ทั้งก้อนแบบมี Caddy อยู่ใน [`DOCKER.md`](DOCKER.md)

## 1. สถาปัตยกรรมที่แนะนำ

```
อินเทอร์เน็ต
   │  80/443 (Nginx เดิม + certbot)
   ├─ savvyapp.cc, www.savvyapp.cc, *.savvyapp.cc ──▶ 127.0.0.1:49200  renderer
   ├─ api.savvyapp.cc      ──▶ 127.0.0.1:49100  api
   └─ admin.savvyapp.cc    ──▶ 127.0.0.1:49300  admin (nginx static ใน container)

Docker ภายใน (ไม่เปิดพอร์ตออกนอก): db 49432 · redis 49537 · minio 49600/49601
worker ทำงานเบื้องหลัง ไม่มีพอร์ต
```

- ไม่รัน service `caddy` ของ Lumio (จะแย่ง 80/443 กับ Nginx เดิม)
- ทุก container ของแอปผูก `127.0.0.1` อยู่แล้ว จึงไม่ชนกับระบบอื่น
  และไม่มีใครจากภายนอกต่อตรงได้

## 2. สิ่งที่ต้องมีบน VPS

| ต้องมี                                                                   | หมายเหตุ                                                                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Docker Engine + `docker compose` v2                                      | `docker compose version` ต้องได้ v2                                                                                    |
| Node 22.13+                                                              | ใช้เฉพาะ `scripts/bump-version.mjs` และเครื่องมือช่วย; ตัวแอปรันใน container (ไม่ต้องติดตั้ง `pnpm` บน host)           |
| RAM ว่างอย่างน้อย ~2 GB (แนะนำ 4 GB)                                     | build image (Next + Vite) กิน RAM ช่วง build                                                                           |
| ดิสก์ว่าง ~15 GB                                                         | image + volume                                                                                                         |
| พอร์ตว่างบน `127.0.0.1`: 49100, 49200, 49300, 49432, 49537, 49600, 49601 | ตรวจด้วย `ss -lntp` ก่อน (ถ้าชน เปลี่ยน `API_PORT`, `RENDERER_PORT`, `ADMIN_PORT`, `DB_PORT`, `REDIS_PORT`, `S3_PORT`) |
| Git                                                                      | clone repo ขึ้นเครื่อง                                                                                                 |

## 3. DNS (ตั้งที่ผู้ให้บริการโดเมน)

| ชื่อ                | ชนิด  | ค่า           |
| ------------------- | ----- | ------------- |
| `savvyapp.cc`       | A     | IP ของ VPS    |
| `www.savvyapp.cc`   | CNAME | `savvyapp.cc` |
| `api.savvyapp.cc`   | A     | IP ของ VPS    |
| `admin.savvyapp.cc` | A     | IP ของ VPS    |
| `*.savvyapp.cc`     | A     | IP ของ VPS    |

`*.savvyapp.cc` จำเป็นถ้าจะใช้โดเมนฟรีของแต่ละเว็บ (`baandoi.savvyapp.cc`)
ถ้า VPS อยู่หลัง Cloudflare ให้ตั้ง proxied ได้ แต่ต้องเปิด Full (strict) และปล่อยให้
Cloudflare จัดการ TLS แทน certbot

## 4. ไฟล์ env (`.env.docker`)

```bash
cp .env.docker.example .env.docker
# เติมค่าจริง แล้วตั้งสิทธิ์  chmod 600 .env.docker
```

ค่าที่ต้องเปลี่ยนสำหรับ `savvyapp.cc` (นอกนั้นใช้ค่าจากตัวอย่างได้):

```ini
LUMIO_DOMAIN=savvyapp.cc
LUMIO_ADMIN_HOST=admin.savvyapp.cc
# ที่อยู่ที่ "เบราว์เซอร์" เรียก ไม่ใช่ชื่อ container
LUMIO_ADMIN_API_URL=https://api.savvyapp.cc
LUMIO_API_URL=https://api.savvyapp.cc
LUMIO_ENV_FILE=.env.docker

NODE_ENV=production
PUBLIC_ROOT_DOMAIN=savvyapp.cc
ADMIN_HOST=admin.savvyapp.cc
API_PUBLIC_URL=https://api.savvyapp.cc
ADMIN_ORIGIN=https://admin.savvyapp.cc
RENDERER_ORIGIN=https://savvyapp.cc
ACME_EMAIL=you@savvyapp.cc

# ไม่ใช้ Caddy: ไม่ต้องตั้ง CADDYFILE / CADDY_HTTP_PORT / CADDY_HTTPS_PORT

# คีย์ทั้งหมดต้องสุ่มใหม่ (ห้ามใช้ change-me-*)
#   openssl rand -base64 32   แล้วรันซ้ำสำหรับแต่ละตัว
JWT_ACCESS_SECRET=<สุ่ม>
JWT_REFRESH_SECRET=<สุ่ม>
PREVIEW_SECRET=<สุ่ม>
REVALIDATE_SECRET=<สุ่ม>
MEDIA_UPLOAD_SECRET=<สุ่ม>
SECRETS_ENCRYPTION_KEY=<สุ่ม>   # หรือเว้นว่างให้เก็บใน volume lumio_data
ANALYTICS_HASH_SALT=<สุ่ม>

# คิวต้องวิ่งผ่าน worker (production)
QUEUE_DRIVER=bullmq
PUBLISH_INLINE=false
MEDIA_INLINE=false
TRASH_PURGE_INLINE=false
MEDIA_PURGE_INLINE=false
SITE_LOCALE_INLINE=false

# ทดสอบก่อน: เก็บไฟล์ใน volume ไม่ต้องตั้ง MinIO/S3 ให้ยุ่ง
MEDIA_STORAGE=local
MEDIA_PUBLIC_BASE_URL=
# (เว้นว่าง = ใช้ https://api.savvyapp.cc/media ซึ่ง CSP ของ renderer อนุญาตอยู่แล้ว)

RENDERER_URL=http://renderer:49200
RENDERER_PUBLIC_URL=https://savvyapp.cc
PUBLIC_DEFAULT_SITE=

# อีเมล/Stripe ยังไม่ต้องใช้ตอนทดสอบ เว้นว่างไว้ได้
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BILLING_RETURN_URL=https://admin.savvyapp.cc/settings/billing
EMAIL_FROM=Lumio <no-reply@savvyapp.cc>
```

> `VITE_API_URL` ของ admin ถูกฝังตอน build: ถ้าเปลี่ยน `LUMIO_ADMIN_API_URL`
> ต้อง build image ใหม่ (`--build`) ไม่ใช่แค่ restart
> เช่นเดียวกับ `NEXT_PUBLIC_API_URL` ของ renderer (มาจาก `LUMIO_API_URL`)

## 5. Deploy

```bash
git clone <repo> /srv/lumio && cd /srv/lumio

# ให้ volume ไม่ชนกับระบบอื่น ตั้งชื่อโปรเจกต์ให้ชัด
export COMPOSE_PROJECT_NAME=lumio

# build + start ทุกอย่างยกเว้น caddy
docker compose --env-file .env.docker --profile app up -d --build \
  db redis minio migrate api worker admin renderer

docker compose --env-file .env.docker ps
```

- `migrate` รัน `prisma migrate deploy` ครั้งเดียวแล้วจบ ก่อน api/worker เริ่ม
- ครั้งแรกที่ยังไม่มีข้อมูล: `docker compose exec api pnpm --filter api db:seed`
  แล้ว **เปลี่ยน/ลบบัญชีทดลองทันที**
  ตามหัวข้อ 1 ของ [`OPERATIONS.md`](OPERATIONS.md)

## 6. Nginx + TLS

คัดลอก `infra/nginx/lumio-vps.conf` ไปเป็น `/etc/nginx/conf.d/lumio.conf`
(แก้ชื่อโดเมนถ้าไม่ใช่ `savvyapp.cc`) แล้ว:

```bash
nginx -t && systemctl reload nginx
certbot --nginx -d savvyapp.cc -d www.savvyapp.cc \
  -d api.savvyapp.cc -d admin.savvyapp.cc
```

- อย่าแตะ server block ของระบบอื่น แค่เพิ่มไฟล์ใหม่แล้ว reload
- certbot จะเติม `listen 443 ssl` + redirect 80->443 ให้เอง
- โดเมนฟรี `*.savvyapp.cc` ต้องใช้ **wildcard certificate** (certbot + DNS-01
  ของผู้ให้บริการ DNS หรือ Cloudflare proxy) ไม่งั้นโดเมนฟรียังเปิดได้แค่ HTTP
  ซึ่งพอสำหรับทดสอบระบบหลังบ้านก่อน
- ตอนทดสอบครั้งแรก ถ้า certbot ยังไม่ผ่าน ให้ใช้ `http://` ก่อนแล้วค่อยเปิด 443

## 7. ทำให้ `savvyapp.cc` แสดงเว็บได้

`https://savvyapp.cc` เป็น **โดเมนเชื่อมของเว็บ** ไม่ใช่ subdomain ฟรี
จึงต้องมีข้อมูลในฐานข้อมูล:

1. สร้างเว็บ (Site) 1 เว็บ ซึ่งจะได้ที่อยู่ฟรี `<subdomain>.savvyapp.cc`
   (เช่น `mysite.savvyapp.cc`)
2. ในหน้า ตั้งค่า > โดเมน เพิ่ม `savvyapp.cc` (และ `www.savvyapp.cc` ถ้าต้องการ)
3. ถ้า A record ของ `savvyapp.cc` ชี้ IP เดียวกับ `mysite.savvyapp.cc`
   ระบบจะยืนยันโดเมนให้เองภายใน ~5 นาที (`DomainsVerifier`) หรือกด
   "ตรวจสอบอีกครั้ง" ในหน้าโดเมน
4. เมื่อ `ssl_status = active` แล้ว renderer จะเสิร์ฟเว็บนั้นที่ root domain

> `PUBLIC_DEFAULT_SITE` ใช้เฉพาะ host loopback (localhost) เท่านั้น
> ตั้งเป็นค่าว่างใน production ถูกต้องแล้ว

## 8. ตรวจหลัง deploy

```bash
curl -fsS http://127.0.0.1:49100/api/health
curl -I  https://api.savvyapp.cc/api/health
curl -I  https://admin.savvyapp.cc
curl -I  https://savvyapp.cc
```

- เปิด https://admin.savvyapp.cc ล็อกอิน แล้วสร้างหน้า + กดเผยแพร่
- อัปโหลดรูป 1 รูป แล้วตรวจว่ารูปขึ้นที่ `https://api.savvyapp.cc/media/...`
- เปิด `docker compose logs -f api worker` ดู error 15 นาทีแรก
- `ADMIN_ORIGIN`/`RENDERER_ORIGIN` ผิดจะได้ 403 "คำขอมาจากโดเมนที่ไม่อนุญาต"
- admin เรียก API ไม่ได้ ให้ตรวจ `LUMIO_ADMIN_API_URL` ตอน build อีกครั้ง

## 9. สำรอง / อัปเดต / ย้อนกลับ

```bash
# สำรอง (ทำก่อน migrate ทุกครั้ง)
docker compose exec db pg_dump -U lumio lumio > backup-$(date +%F).sql
docker run --rm -v lumio_lumio_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/lumio-data-$(date +%F).tgz -C /data .

# อัปเดต
git pull
docker compose --env-file .env.docker --profile app build
docker compose --env-file .env.docker --profile app run --rm migrate
docker compose --env-file .env.docker --profile app up -d \
  db redis minio api worker admin renderer

# ย้อนกลับ: checkout commit/tag เดิม แล้ว build + up ใหม่ (ห้ามย้อน migration ที่ลบข้อมูล)
```

Volume ที่ห้ามหาย: `lumio_pgdata`, `lumio_lumio_data` (คีย์เข้ารหัส + backup),
`lumio_media` (เมื่อ `MEDIA_STORAGE=local`), `lumio_miniodata`, `lumio_redisdata`

## 10. อยู่ร่วมกับระบบอื่นบนเครื่องเดียวกัน

- ตั้ง `COMPOSE_PROJECT_NAME` (เช่น `lumio`) เพื่อไม่ให้ชื่อ volume/network
  ชนกับ compose project อื่น
- Lumio ไม่แตะ `/etc/nginx` เดิมและไม่แตะ container/พอร์ตของระบบอื่น
  สิ่งเดียวที่แชร์คือ Nginx (คนละ server block) และดิสก์/RAM
- จำกัดทรัพยากรได้ถ้าเครื่องแน่น โดยเพิ่มใน `docker-compose.override.yml`:

  ```yaml
  services:
    api:     { deploy: { resources: { limits: { memory: 1g } } } }
    worker:  { deploy: { resources: { limits: { memory: 512m } } } }
    renderer:{ deploy: { resources: { limits: { memory: 1g } } } }
    admin:   { deploy: { resources: { limits: { memory: 128m } } } }
    caddy:   { profiles: ['never'] }   # กันไม่ให้ caddy ถูก start โดยไม่ตั้งใจ
  ```

- Node/npm บน host ใช้ร่วมกับระบบอื่นได้ไม่มีปัญหา เพราะแอป Lumio รันใน container
  (ใช้ `pnpm` ผ่าน corepack ใน image) ไม่ได้ลง dependency ลง global ของเครื่อง

## 11. ยังไม่ต้องทำรอบทดสอบนี้ แต่ต้องทำก่อนเปิดขาย

ดู checklist เต็มใน [`OPERATIONS.md`](OPERATIONS.md): RLS/role ฐานข้อมูล,
`MEDIA_STORAGE=s3` + ClamAV, Resend/Stripe จริง, license public key,
monitoring `/api/health`, ลบ `.env`/คีย์ออกจาก git, AGPL notice
