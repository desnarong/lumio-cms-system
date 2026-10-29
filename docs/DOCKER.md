# Docker

ทุกอย่างใน Lumio รันใน Docker ได้: API, worker, admin, renderer, Caddy, Postgres,
Redis และ MinIO — แต่แยกเป็นสองโหมดเพื่อไม่ให้เสียเวลา rebuild ตอนพัฒนา

## โหมดพัฒนา (แนะนำ)

```bash
docker compose up -d        # db + redis + minio เท่านั้น
pnpm i && pnpm dev          # แอปทั้งหมดรันบนเครื่อง มี HMR
```

- พอร์ตผูกกับ `127.0.0.1` ทั้งหมด (ไม่มีใครจากภายนอกต่อตรงได้)
- ฐานข้อมูล: `localhost:49432` · Redis: `localhost:49537` · MinIO: `localhost:49600` (คอนโซล `49601`)
- สแกนไวรัส (ไม่บังคับ): `docker compose --profile scan up -d` แล้วตั้ง `MEDIA_SCANNER=clamav`, `CLAMAV_PORT=3310`

## โหมดทั้งก้อน (production-like)

```bash
docker compose --profile app up -d --build
```

ลำดับการเริ่ม:

1. `migrate` รัน `prisma migrate deploy` ครั้งเดียวแล้วจบ
2. `api` และ `worker` เริ่มหลัง migrate สำเร็จ (ไม่แย่งกัน migrate)
3. `renderer` รอ `api` healthy · `caddy` รอ api/admin/renderer healthy

เข้าใช้งานในเครื่อง:

| บริการ | ที่อยู่ |
|---|---|
| Admin | http://localhost:49300 |
| API | http://localhost:49100/api/health |
| Renderer | http://localhost:49200 |
| Caddy (dev hosts) | http://localhost:49700 · `Host: admin.example.com` หรือ `baandoi.example.com` (HTTP ล้วน) |

> admin image ถูก build ด้วย `VITE_API_URL` ตอน build (Vite ฝังค่าลงไฟล์ static)
> ถ้าเปลี่ยนที่อยู่ API ต้อง build ใหม่ ไม่ใช่แค่ restart container
>
> Caddy ในการพัฒนาเสิร์ฟ HTTP ล้วน (ไม่มี certificate) และอ่าน Caddyfile ตอน start
> ถ้าแก้ `infra/caddy/Caddyfile` ต้อง `docker compose restart caddy`
>
> renderer คุยกับ API ผ่าน `API_INTERNAL_URL=http://api:49100` (อ่านตอน runtime)
> ส่วน `NEXT_PUBLIC_API_URL` ถูกฝังตอน build และเป็นแค่ fallback สำหรับรันบนเครื่อง
>
> `RENDERER_URL` เป็นที่อยู่ภายใน (`http://renderer:49200`) สำหรับให้ worker สั่ง rebuild
> แต่ปุ่ม “ดูตัวอย่าง” ใน editor เปิดในเบราว์เซอร์ผู้ใช้ จึงใช้ `RENDERER_PUBLIC_URL`
> (production ตั้งเป็น `https://example.com`) — ถ้าไม่ตั้งจะ fallback ไปที่โดเมนของเว็บนั้น
>
> compose อ่านโดเมนของ stack จาก `LUMIO_DOMAIN`, `LUMIO_ADMIN_HOST`,
> `LUMIO_ADMIN_API_URL` และ `LUMIO_API_URL` — ใช้ชื่อแยกเพราะตัวแปร `PUBLIC_ROOT_DOMAIN`
> ที่ export ไว้ใน shell จะชนะค่าใน `.env` เสมอ

## ขึ้นเซิร์ฟเวอร์จริง

```bash
cp .env.docker.example .env.docker      # เติมโดเมน/รหัส/คีย์จริง (ไฟล์นี้ถูก gitignore)
LUMIO_ENV_FILE=.env.docker \
docker compose --env-file .env.docker --profile app up -d --build
```

- ใช้ `infra/caddy/Caddyfile.prod` (ตั้งใน `CADDYFILE`) — Caddy ขอ certificate
  on-demand ผ่าน API และรับ custom domain ให้เอง
- เปิดเฉพาะพอร์ต 80/443 ของ Caddy; api/admin/renderer ผูก `127.0.0.1`
- ตั้ง `NODE_ENV=production`, `QUEUE_DRIVER=bullmq`, `PUBLISH_INLINE=false`,
  `MEDIA_INLINE=false`, `TRASH_PURGE_INLINE=false`, `MEDIA_PURGE_INLINE=false`,
  `SITE_LOCALE_INLINE=false` เพื่อให้ worker ทำงานจริง
- ตั้ง `ADMIN_API_URL`/`API_PUBLIC_URL` เป็น `https://<โฮสต์ API>` และ
  `PUBLIC_ROOT_DOMAIN` เป็นโดเมนที่คุณถือจริง
- ต้องมี DNS ของ `<โดเมน>`, `*.<โดเมน>`, `admin.<โดเมน>` **และโฮสต์ของ API**
  (`LUMIO_API_HOST` ตั้งชื่ออะไรก็ได้ เช่น `apilumio.example.com`; `Caddyfile.prod`
  มี server block ของ API ให้แล้ว เพราะ admin เรียก API ที่นี่)
- ถ้าเครื่องมี reverse proxy เดิม (Nginx หรือ Nginx Proxy Manager) ยึดพอร์ต 80/443
  ให้ข้าม container `caddy` และตั้ง Proxy Host ตาม [`DEPLOY-VPS.md`](DEPLOY-VPS.md)
  (Nginx เปล่า ๆ ใช้ `infra/nginx/lumio-vps.conf` เป็นตัวอย่างได้)

## Volume ที่ต้องสำรอง

| Volume | เก็บอะไร | ถ้าหาย |
|---|---|---|
| `pgdata` | ฐานข้อมูล | ข้อมูลเว็บหายทั้งหมด |
| `lumio_data` | `secrets.key` + ไฟล์สำรองในเครื่อง | คีย์ที่เข้ารหัสใน DB ถอดไม่ได้ |
| `media` | ไฟล์อัปโหลดเมื่อ `MEDIA_STORAGE=local` | รูปหาย (ถ้าใช้ S3 ให้สำรอง bucket แทน) |
| `miniodata` | ไฟล์ใน MinIO | รูปหาย |
| `caddy_data` | ใบรับรอง TLS | Caddy ขอใหม่ (ไม่เสียหาย แต่มี downtime สั้น ๆ) |

```bash
docker compose exec db pg_dump -U lumio lumio > backup-$(date +%F).sql
docker run --rm -v lumio_lumio_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/lumio-data-$(date +%F).tgz -C /data .
```

ชื่อ volume ขึ้นกับชื่อโปรเจกต์ compose (ค่าเริ่มต้นคือชื่อโฟลเดอร์: `lumio-cms-system_<volume>`)
ถ้าเปลี่ยนชื่อโปรเจกต์ด้วย `COMPOSE_PROJECT_NAME` ต้องย้าย/สำรอง volume เดิมก่อน

## อัปเดตระบบที่มีผู้ใช้อยู่

```bash
docker compose --profile app build          # build image ใหม่ก่อน
docker compose --profile app run --rm migrate
docker compose --profile app up -d          # rolling: api/worker/admin/renderer ตามลำดับ
docker image prune -f                       # เก็บ image เก่า
```

- สำรอง `pgdata` ก่อน migrate ทุกครั้ง
- healthcheck ของ api ใช้ `/api/health`; ถ้า unhealthy ให้ดู `docker compose logs api`
- `restart: unless-stopped` ทำให้ container กลับมาเองหลังเครื่อง reboot

## ข้อจำกัดที่รู้อยู่

- Image ของ api/renderer ยัง copy ทั้ง repo (ยังไม่ prune devDependencies) — แลกกับความง่ายของ Prisma CLI และ Next
- ยังไม่รองรับ horizontal scaling ของ `migrate` (ออกแบบให้รันครั้งเดียว) — ถ้าจะมีหลาย replica ให้แยก migrate job นอก compose
- ยังไม่ตั้ง resource limits / non-root user ใน Dockerfile
