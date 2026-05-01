# API Reference

Base URL: `https://leadflow.aldirifai.com/api` (prod) atau `http://localhost:8001/api` (dev)

Semua endpoint butuh header `X-API-Key: <your-api-key>` kecuali `/health`.

Swagger UI tersedia di `/docs` di development mode.

## Health

`GET /health` → `{ "status": "ok", "environment": "..." }`

## Ingest

### `POST /api/leads/ingest`

Body:
```json
{
  "leads": [
    {
      "place_id": "ChIJ...",
      "name": "Klinik X",
      "address": "...",
      "phone": "0812...",
      "website": "...",
      "category": "...",
      "rating": 4.5,
      "review_count": 120,
      "latitude": -7.25,
      "longitude": 112.75,
      "city": "Surabaya",
      "province": "Jawa Timur"
    }
  ],
  "search_query": "klinik gigi Surabaya",
  "search_location": "Surabaya"
}
```

Response:
```json
{
  "inserted": 12,
  "updated": 3,
  "skipped_blacklisted": 1,
  "quota_used": 16,
  "quota_limit": 200,
  "quota_remaining": 184
}
```

Returns 429 jika quota habis.

## Leads

| Method | Path | Description |
|---|---|---|
| GET | `/api/leads` | List with filters |
| GET | `/api/leads/{id}` | Detail with score, enrichment, outreach count |
| PATCH | `/api/leads/{id}` | Update email/linkedin/instagram/notes |
| PATCH | `/api/leads/{id}/status` | Update status |
| PATCH | `/api/leads/{id}/notes` | Update notes |
| POST | `/api/leads/{id}/score` | Re-run scoring |
| POST | `/api/leads/score-all` | Re-score all leads |
| DELETE | `/api/leads/{id}` | Delete permanently |

### List filters (query params)

- `page` (int, default 1)
- `page_size` (int, max 200)
- `status` — new/approved/contacted/replied/converted/skipped/dropped
- `min_score` / `max_score` (0-100)
- `city` (exact match, case-insensitive)
- `category` (substring match)
- `has_website` (boolean)
- `is_blacklisted` (boolean — default excludes blacklisted)
- `search` (substring across name/address/category)
- `sort` — score_desc / score_asc / recent / oldest / name

## Enrichment & message generation

### `POST /api/leads/{id}/enrich`

Run LLM-powered website analysis. Returns updated lead with enrichment data.

Cost ~$0.001-0.005 per call (Claude Haiku via OpenRouter).

### `POST /api/leads/{id}/generate-message`

Body:
```json
{
  "channel": "email",
  "template_id": 1,
  "custom_instructions": "lebih casual"
}
```

Response:
```json
{ "subject": "...", "body": "..." }
```

`subject` only returned for email channel. Generated messages are stored in lead.enrichment.

## Outreach

| Method | Path | Description |
|---|---|---|
| POST | `/api/leads/{id}/outreach` | Log a sent message |
| GET | `/api/leads/{id}/outreach` | History for one lead |
| POST | `/api/leads/{lead_id}/outreach/{log_id}/reply` | Mark a reply (auto-detects opt-out) |
| GET | `/api/outreach` | List all outreach (filterable by channel/replied) |

Cooldown enforced: returns 409 if you try to log new outreach < `COOLDOWN_DAYS` since last unreplied message to same lead.

## Templates

| Method | Path | Description |
|---|---|---|
| GET | `/api/templates?channel=email` | List templates |
| POST | `/api/templates` | Create |
| PUT | `/api/templates/{id}` | Update |
| DELETE | `/api/templates/{id}` | Delete |

## Blacklist

| Method | Path | Description |
|---|---|---|
| GET | `/api/blacklist` | List entries |
| POST | `/api/blacklist` | Add (auto-blacklists matching leads) |
| DELETE | `/api/blacklist/{id}` | Remove |

`identifier_type`: `phone` / `whatsapp` / `email` / `domain` / `place_id`

## Dashboard

### `GET /api/dashboard/stats`

Response:
```json
{
  "total_leads": 1234,
  "by_status": { "new": 800, "approved": 50, "contacted": 30, "replied": 5 },
  "by_score_tier": { "high": 100, "medium": 400, "low": 700 },
  "today_quota_used": 45,
  "today_quota_limit": 200,
  "today_quota_remaining": 155,
  "outreach_today": 8,
  "outreach_this_week": 47,
  "reply_rate_30d": 4.2,
  "top_cities": [{ "city": "Surabaya", "count": 450 }, ...],
  "top_categories": [{ "category": "Klinik gigi", "count": 32 }, ...]
}
```

## Auto-features

- **Auto-scoring**: every ingest/update triggers scoring rules
- **Auto-blacklist on opt-out**: replies containing stop/berhenti/unsubscribe/dll auto-add identifiers to blacklist + set lead status to `dropped`
- **Auto-blacklist on ingest**: leads matching existing blacklist entries are flagged on insert
- **Cooldown**: prevents recontact too soon (configurable via `COOLDOWN_DAYS`)
