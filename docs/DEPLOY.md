# Deployment Guide

Deploy Leadflow ke VPS dengan Docker Compose, Nginx reverse proxy, dan Let's Encrypt SSL otomatis.

## Prerequisites

- VPS Ubuntu 22.04+ (atau distro modern lain) dengan Docker dan Docker Compose plugin terpasang
- Domain (atau subdomain) yang sudah pointing ke IP VPS — misal `leadflow.aldirifai.com`
- Port 80 dan 443 terbuka di firewall
- OpenRouter API key untuk LLM enrichment

## Step-by-step

### 1. Clone repository di VPS

```bash
sudo mkdir -p /opt/leadflow
sudo chown $USER:$USER /opt/leadflow
cd /opt/leadflow
git clone <your-repo-url> .
```

### 2. Generate strong API key

```bash
openssl rand -hex 32
```

Simpan output — kamu butuh untuk `API_KEY` dan `NEXT_PUBLIC_API_KEY`.

### 3. Setup environment

```bash
cp .env.example .env
nano .env
```

Isi:

```bash
POSTGRES_USER=leadflow
POSTGRES_PASSWORD=<strong-password-generated>
POSTGRES_DB=leadflow_db

DATABASE_URL=postgresql://leadflow:<strong-password-generated>@postgres:5432/leadflow_db

API_KEY=<dari-openssl-step-2>

OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-haiku

DAILY_INGEST_LIMIT=200
COOLDOWN_DAYS=30

CORS_ORIGINS=https://leadflow.aldirifai.com

DOMAIN=leadflow.aldirifai.com
LE_EMAIL=you@example.com

NEXT_PUBLIC_API_URL=https://leadflow.aldirifai.com/api
NEXT_PUBLIC_API_KEY=<sama-dengan-API_KEY-di-atas>

ENVIRONMENT=production
```

### 4. Initialize SSL certificate (one-time)

Pastikan DNS-mu sudah resolve ke VPS sebelum step ini. Cek dengan `dig leadflow.aldirifai.com`.

```bash
./scripts/init-ssl.sh leadflow.aldirifai.com you@example.com
```

Script ini akan:
1. Run nginx temporary di port 80
2. Request SSL cert dari Let's Encrypt via ACME HTTP challenge
3. Bersihkan temporary container

Kalau berhasil, certificate tersimpan di volume `leadflow_certbot-conf`.

### 5. Start production stack

```bash
docker compose up -d
```

Cek status:

```bash
docker compose ps
docker compose logs -f
```

### 6. Verify

- Buka `https://leadflow.aldirifai.com` — harusnya muncul dashboard
- Cek backend health: `curl https://leadflow.aldirifai.com/health`
- Cek API: `curl -H "X-API-Key: <your-key>" https://leadflow.aldirifai.com/api/dashboard/stats`

### 7. Install Chrome extension

Di mesin lokal (laptop), bukan di VPS:

1. Buka `chrome://extensions`
2. Aktifkan Developer mode
3. Klik "Load unpacked", pilih folder `extension/` dari clone repo
4. Buka popup extension, isi:
   - API URL: `https://leadflow.aldirifai.com/api`
   - API Key: sama dengan `API_KEY` di `.env`
5. Klik Save

## Updates

```bash
cd /opt/leadflow
git pull
docker compose build
docker compose up -d
```

Migration Alembic akan auto-run di backend startup.

## Backup database

Quick backup:

```bash
docker compose exec postgres pg_dump -U leadflow leadflow_db > backup-$(date +%Y%m%d).sql
```

Setup automated backup pakai cron:

```bash
crontab -e
```

Tambah:

```
0 3 * * * cd /opt/leadflow && docker compose exec -T postgres pg_dump -U leadflow leadflow_db | gzip > /backup/leadflow-$(date +\%Y\%m\%d).sql.gz
```

## SSL renewal

Certbot service di docker-compose otomatis cek renewal tiap 12 jam. Sertifikat Let's Encrypt valid 90 hari, akan auto-renew kalau sisa < 30 hari.

Untuk manual renew:

```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

## Troubleshooting

**Nginx gagal start dengan error tentang cert tidak ditemukan:**
Berarti SSL belum di-init. Stop semua container, lalu jalankan `./scripts/init-ssl.sh` dulu.

**Backend keep restarting:**
Cek logs: `docker compose logs backend`. Biasanya karena DATABASE_URL salah atau Postgres belum ready.

**Frontend connect error ke backend:**
Pastikan `NEXT_PUBLIC_API_URL` di .env match dengan domain production-mu, dan `CORS_ORIGINS` di backend mengizinkannya.

**Extension dapat 401:**
API key di popup extension belum di-save, atau tidak match dengan backend.

**Daily quota habis:**
Tunggu UTC midnight untuk reset, atau naikkan `DAILY_INGEST_LIMIT` di `.env` lalu restart backend.

## Sub-domain dengan layanan lain (fintrack)

Karena fintrack udah jalan di subdomain berbeda (`fintrack.aldirifai.com`), Leadflow di `leadflow.aldirifai.com` gak akan konflik. Pastikan DNS A record kedua subdomain sama-sama point ke VPS, dan tiap stack pakai port mapping yang berbeda atau Nginx terpisah.

Kalau mau gabung satu Nginx untuk dua app, pindahkan Nginx ke level VPS (host-level install, bukan dalam Docker compose), dan setiap app expose port lokal saja.
