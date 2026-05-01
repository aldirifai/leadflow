# Development Guide

## Quick start dengan Docker

```bash
git clone <repo> leadflow
cd leadflow
cp .env.example .env
# Set API_KEY ke string apa saja, OPENROUTER_API_KEY kalau mau test enrichment

docker compose -f docker-compose.dev.yml up -d
```

Akan menjalankan:
- Postgres di `localhost:5433`
- Backend FastAPI di `localhost:8001` (dengan auto-reload)
- Frontend Next.js di `localhost:3000` (dengan hot-reload)

Logs:
```bash
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
```

## Tanpa Docker (alternatif)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set DATABASE_URL ke instance Postgres lokalmu

alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Database migration

Buat migration baru setelah edit ORM model:

```bash
docker compose -f docker-compose.dev.yml exec backend alembic revision --autogenerate -m "describe change"
docker compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

Atau tanpa Docker:

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Reset database

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

## Test API langsung

Backend punya `/docs` (Swagger UI) di development mode. Buka `http://localhost:8001/docs`.

Untuk pakai endpoint, klik "Authorize" dan isi `X-API-Key` header dengan value `API_KEY` dari `.env`.

## Project layout

Lihat [README.md](../README.md) untuk struktur lengkap. Highlights:

- `backend/app/api/` — semua route handlers
- `backend/app/services/` — business logic (scoring, enrichment, blacklist)
- `backend/app/models/lead.py` — semua ORM models
- `frontend/src/app/` — App Router pages
- `frontend/src/lib/api.ts` — backend client (semua endpoint)
- `extension/src/content.js` — Google Maps DOM scraper

## Customizing scoring rules

Edit `backend/app/services/scoring.py`:

- Tambah function baru `def rule_xxx(lead) -> tuple[int, str | None]`
- Append ke `RULES` list
- Restart backend
- Optional: trigger re-score all leads dari Settings page atau via API: `POST /api/leads/score-all`

## Customizing message templates

Bisa lewat UI di `/templates` atau langsung edit migration `0002_seed_templates.py` untuk default values.

## Logs / debugging

- Backend log di stdout (lihat `docker compose logs -f backend`)
- Frontend log di stdout dan browser console
- Postgres queries: set environment `SQLALCHEMY_ECHO=1` di backend (TODO — saat ini logging level WARN)
