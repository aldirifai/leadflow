"""Fetch and summarize lead's website for enrichment."""

import asyncio
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup


async def fetch_website_text(url: str, timeout: float = 10.0, max_chars: int = 8000) -> dict:
    """
    Fetch website, extract text content, return structured summary.
    Returns dict with: title, description, headings, body_excerpt, links, error.
    """
    if not url:
        return {"error": "no_url"}

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urlparse(url)
    if not parsed.netloc:
        return {"error": "invalid_url"}

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; LeadflowBot/1.0; personal research)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            if response.status_code >= 400:
                return {"error": f"http_{response.status_code}", "url": url}

            content_type = response.headers.get("content-type", "").lower()
            if "html" not in content_type:
                return {"error": "not_html", "content_type": content_type}

            html = response.text
    except httpx.TimeoutException:
        return {"error": "timeout", "url": url}
    except Exception as e:
        return {"error": f"fetch_failed:{type(e).__name__}", "url": url}

    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style", "noscript", "iframe"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else None

    description = None
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        description = meta_desc["content"].strip()

    headings = []
    for tag_name in ["h1", "h2", "h3"]:
        for h in soup.find_all(tag_name)[:5]:
            text = h.get_text(strip=True)
            if text and len(text) < 200:
                headings.append({"level": tag_name, "text": text})

    body_text = soup.get_text(separator=" ", strip=True)
    body_text = " ".join(body_text.split())
    body_excerpt = body_text[:max_chars]

    has_contact = bool(soup.find_all(text=lambda t: t and any(k in t.lower() for k in ["whatsapp", "wa.me", "kontak", "contact"])))
    has_form = bool(soup.find("form"))

    return {
        "url": url,
        "title": title,
        "description": description,
        "headings": headings[:10],
        "body_excerpt": body_excerpt,
        "has_contact_info": has_contact,
        "has_form": has_form,
        "html_length": len(html),
    }


def fetch_website_text_sync(url: str, timeout: float = 10.0, max_chars: int = 8000) -> dict:
    return asyncio.run(fetch_website_text(url, timeout, max_chars))
