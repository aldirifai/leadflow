from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import blacklist, dashboard, enrichment, ingest, leads, outreach, tags, templates
from app.core.config import settings

app = FastAPI(
    title="Leadflow API",
    version="1.0.0",
    description="Personal lead generation backend.",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.environment != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.environment}


app.include_router(ingest.router, prefix="/api")
app.include_router(tags.lead_tag_router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(enrichment.router, prefix="/api")
app.include_router(outreach.router, prefix="/api")
app.include_router(outreach.outreach_router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(blacklist.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
