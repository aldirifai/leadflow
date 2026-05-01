"""Phone and identifier normalization helpers."""

import re


def normalize_phone(phone: str | None) -> str | None:
    """Normalize Indonesian phone to international format starting with 62."""
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if not digits:
        return None
    if digits.startswith("62"):
        return digits
    if digits.startswith("0"):
        return "62" + digits[1:]
    if digits.startswith("8"):
        return "62" + digits
    return digits


def normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    email = email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        return None
    return email


def extract_domain(url: str | None) -> str | None:
    if not url:
        return None
    url = url.strip().lower()
    url = re.sub(r"^https?://", "", url)
    url = re.sub(r"^www\.", "", url)
    return url.split("/")[0].split("?")[0] if url else None
