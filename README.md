# Leadflow

Personal lead generation tool for B2B outreach. Scrape Google Maps via Chrome extension, auto-qualify leads with rule-based scoring, enrich with LLM analysis, then craft personalized outreach messages — sent manually by you.

**This is a personal tool, not a SaaS or spam machine.** Architecture deliberately prevents bulk automated sending. Every contact requires manual click.

## Stack

- **Backend:** FastAPI (Python 3.11), SQLAlchemy 2, Alembic, Postgres 16
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind, shadcn-style components
- **Extension:** Chrome Manifest V3, vanilla JS
- **LLM:** OpenRouter (configurable model)
- **Deploy:** Docker Compose + Nginx reverse proxy + Certbot (Let's Encrypt)

## Quick start (development)

```bash
git clone <your-repo> leadflow
cd leadflow
cp .env.example .env
# edit .env

docker compose -f docker-compose.dev.yml up -d
```

Then:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api
- API docs: http://localhost:8001/docs
- Postgres: localhost:5433

Install extension: open `chrome://extensions`, enable Developer mode, "Load unpacked", select `extension/` folder.

## Production deploy

See [docs/DEPLOY.md](docs/DEPLOY.md) for full VPS deployment to `leadflow.aldirifai.com` with SSL.

```bash
# On VPS
git clone <your-repo> /opt/leadflow
cd /opt/leadflow
cp .env.example .env
# edit .env with production values
./scripts/init-ssl.sh leadflow.aldirifai.com you@email.com
docker compose up -d
```

## Architecture

Six-stage pipeline:

| Stage | Component | What it does |
|---|---|---|
| 1. Acquisition | Chrome extension | Captures listings as you browse Maps |
| 2. Storage | Postgres + FastAPI | Stores raw leads, dedupes by place_id |
| 3. Qualification | Scoring service | Auto-scores 0-100 by configurable rules |
| 4. Enrichment | LLM service | Analyzes website, suggests outreach angle |
| 5. Manual review | Next.js dashboard | You approve top-scoring leads |
| 6. Outreach | Manual + log | Click-to-send via Email/WA/LinkedIn, tracked |

## Ethical guardrails (built into architecture)

- **Daily ingest cap:** 200 leads/day max (configurable via env)
- **No bulk send:** every outreach requires manual click per lead
- **Opt-out detection:** replies containing stop/berhenti/unsubscribe auto-blacklist
- **Cooldown:** no recontact within 30 days unless they replied
- **Audit log:** every outreach timestamped with full message content
- **Personal channels stay manual:** WhatsApp/LinkedIn open compose UI, you click send

## Documentation

- [docs/DEPLOY.md](docs/DEPLOY.md) — production VPS deployment
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — local development setup
- [docs/EXTENSION.md](docs/EXTENSION.md) — Chrome extension installation and usage
- [docs/API.md](docs/API.md) — backend API reference

## Project structure

```
leadflow/
├── backend/                FastAPI service
│   ├── app/
│   │   ├── api/           Route handlers
│   │   ├── core/          Config, deps
│   │   ├── db/            Session, base
│   │   ├── models/        SQLAlchemy ORM
│   │   ├── schemas/       Pydantic
│   │   └── services/      Scoring, enrichment, etc.
│   ├── alembic/           DB migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/              Next.js dashboard
│   ├── src/
│   │   ├── app/           App Router pages
│   │   ├── components/    UI components
│   │   ├── lib/           API client, helpers
│   │   └── types/         TS types
│   ├── Dockerfile
│   └── package.json
├── extension/             Chrome extension
│   ├── src/               Background, content, popup
│   ├── manifest.json
│   └── icons/
├── docker/
│   └── nginx/             Nginx config
├── scripts/               Deploy helpers
├── docs/                  Documentation
├── docker-compose.yml         Production compose
├── docker-compose.dev.yml     Development compose
└── .env.example
```

## License

Personal use. Not licensed for redistribution.
