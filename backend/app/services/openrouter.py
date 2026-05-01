"""OpenRouter API client for LLM calls."""

import json

import httpx

from app.core.config import settings


class OpenRouterError(Exception):
    pass


async def chat_completion(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1000,
    response_format_json: bool = False,
) -> str:
    if not settings.openrouter_api_key:
        raise OpenRouterError("OPENROUTER_API_KEY not configured")

    payload = {
        "model": model or settings.openrouter_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format_json:
        payload["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://leadflow.aldirifai.com",
        "X-Title": "Leadflow",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
        )

    if response.status_code >= 400:
        raise OpenRouterError(f"OpenRouter API error {response.status_code}: {response.text}")

    data = response.json()
    if "choices" not in data or not data["choices"]:
        raise OpenRouterError(f"Unexpected OpenRouter response: {data}")

    return data["choices"][0]["message"]["content"]


async def chat_completion_json(messages: list[dict], **kwargs) -> dict:
    """Chat completion expecting JSON output. Strips markdown fences if present."""
    text = await chat_completion(messages, response_format_json=True, **kwargs)
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if "```" in text[3:] else text
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    return json.loads(text)
