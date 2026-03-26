#!/usr/bin/env python3
"""Sync site-content.json from a headless WordPress endpoint."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "site-content.json"
DEFAULT_CONTENT_PATH = "/wp-json/djurbant/v1/site-content"
DEFAULT_TIMEOUT_SECONDS = 30
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

NETWORK_ALIASES = {
    "x": "x",
    "x-twitter": "x",
    "twitter": "x",
    "instagram": "instagram",
    "youtube": "youtube",
    "mixcloud": "mixcloud",
    "twitch": "twitch",
    "tiktok": "tiktok",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("WP_HEADLESS_BASE_URL", "").strip(),
        help="WordPress base URL (e.g. https://cms.example.com)",
    )
    parser.add_argument(
        "--content-path",
        default=os.environ.get("WP_HEADLESS_CONTENT_PATH", DEFAULT_CONTENT_PATH).strip(),
        help="Headless content path or full URL",
    )
    parser.add_argument(
        "--auth-token",
        default=os.environ.get("WP_HEADLESS_AUTH_TOKEN", "").strip(),
        help="Optional Bearer token for protected endpoint",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=int(os.environ.get("WP_HEADLESS_TIMEOUT", DEFAULT_TIMEOUT_SECONDS)),
        help="Request timeout in seconds",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="Output JSON file path",
    )
    return parser.parse_args()


def get_by_path(source: Any, path: str) -> Any:
    current = source
    for part in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
        if current is None:
            return None
    return current


def first_str(source: dict[str, Any], paths: list[str]) -> str | None:
    for path in paths:
        value = get_by_path(source, path)
        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned:
                return cleaned
    return None


def to_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        if value == 1:
            return True
        if value == 0:
            return False
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "y", "on"}:
            return True
        if normalized in {"0", "false", "no", "n", "off"}:
            return False
    return None


def first_bool(source: dict[str, Any], paths: list[str]) -> bool | None:
    for path in paths:
        value = get_by_path(source, path)
        coerced = to_bool(value)
        if coerced is not None:
            return coerced
    return None


def deep_merge(base: Any, override: Any) -> Any:
    if isinstance(base, dict) and isinstance(override, dict):
        merged: dict[str, Any] = {**base}
        for key, value in override.items():
            merged[key] = deep_merge(base.get(key), value)
        return merged
    if override is None:
        return base
    return override


def normalize_network_key(raw_key: str) -> str:
    normalized = raw_key.strip().lower().replace(" ", "-").replace("_", "-")
    return NETWORK_ALIASES.get(normalized, normalized)


def normalize_social_links(raw_social: Any) -> dict[str, Any]:
    if isinstance(raw_social, dict):
        items = []
        for key, value in raw_social.items():
            if isinstance(value, dict):
                item = dict(value)
                item.setdefault("network", key)
                items.append(item)
    elif isinstance(raw_social, list):
        items = [item for item in raw_social if isinstance(item, dict)]
    else:
        return {}

    out: dict[str, Any] = {}
    for item in items:
        network_source = (
            item.get("network")
            or item.get("platform")
            or item.get("slug")
            or item.get("key")
            or item.get("name")
        )
        if not isinstance(network_source, str) or not network_source.strip():
            continue
        key = normalize_network_key(network_source)
        url = (
            item.get("url")
            or item.get("href")
            or item.get("link")
            or item.get("value")
            or ""
        )
        if not isinstance(url, str) or not url.strip():
            continue
        label = item.get("label")
        if not isinstance(label, str) or not label.strip():
            label = key.replace("-", " ").title()

        open_in_new_tab = to_bool(
            item.get("openInNewTab", item.get("open_new_tab", item.get("new_tab")))
        )
        enabled = to_bool(item.get("enabled", item.get("is_enabled", item.get("active"))))

        out[key] = {
            "label": label.strip(),
            "url": url.strip(),
            "openInNewTab": True if open_in_new_tab is None else open_in_new_tab,
            "enabled": True if enabled is None else enabled,
        }
    return out


def normalize_home(raw: dict[str, Any]) -> dict[str, Any]:
    page: dict[str, Any] = {}

    tagline = first_str(
        raw,
        [
            "hero.tagline",
            "hero.subtitle",
            "heroTagline",
            "hero_tagline",
            "tagline",
        ],
    )
    if tagline:
        page.setdefault("hero", {})["tagline"] = tagline

    best_title = first_str(
        raw,
        [
            "bestOf.title",
            "best_of.title",
            "bestOfTitle",
            "best_of_title",
            "best_of_artist_title",
        ],
    )
    if best_title:
        page.setdefault("bestOf", {})["title"] = best_title

    show_stats = first_bool(raw, ["sections.showStatsBand", "showStatsBand", "show_stats_band"])
    show_booking = first_bool(raw, ["sections.showBookingBand", "showBookingBand", "show_booking_band"])
    show_social = first_bool(raw, ["sections.showSocialStrip", "showSocialStrip", "show_social_strip"])
    if show_stats is not None or show_booking is not None or show_social is not None:
        page.setdefault("sections", {})
    if show_stats is not None:
        page["sections"]["showStatsBand"] = show_stats
    if show_booking is not None:
        page["sections"]["showBookingBand"] = show_booking
    if show_social is not None:
        page["sections"]["showSocialStrip"] = show_social

    booking_title = first_str(raw, ["bookingBand.title", "booking_title", "booking.title"])
    booking_button_label = first_str(
        raw,
        [
            "bookingBand.buttonLabel",
            "bookingBand.ctaLabel",
            "booking_button_label",
            "booking_cta_label",
        ],
    )
    booking_button_url = first_str(
        raw,
        [
            "bookingBand.buttonUrl",
            "bookingBand.ctaUrl",
            "booking_button_url",
            "booking_cta_url",
        ],
    )
    if booking_title or booking_button_label or booking_button_url:
        page.setdefault("bookingBand", {})
    if booking_title:
        page["bookingBand"]["title"] = booking_title
    if booking_button_label:
        page["bookingBand"]["buttonLabel"] = booking_button_label
    if booking_button_url:
        page["bookingBand"]["buttonUrl"] = booking_button_url

    return page


def normalize_video_or_audio(raw: dict[str, Any]) -> dict[str, Any]:
    page: dict[str, Any] = {}

    title = first_str(raw, ["title", "pageTitle", "page_title"])
    intro = first_str(raw, ["intro", "introText", "intro_text"])
    top_label = first_str(raw, ["topButton.label", "top_button_label", "topCtaLabel"])
    top_url = first_str(raw, ["topButton.url", "top_button_url", "topCtaUrl"])
    show_social = first_bool(raw, ["sections.showSocialStrip", "showSocialStrip", "show_social_strip"])

    if title:
        page["title"] = title
    if intro:
        page["intro"] = intro
    if top_label or top_url:
        page["topButton"] = {}
    if top_label:
        page["topButton"]["label"] = top_label
    if top_url:
        page["topButton"]["url"] = top_url
    if show_social is not None:
        page["sections"] = {"showSocialStrip": show_social}

    return page


def normalize_contact(raw: dict[str, Any]) -> dict[str, Any]:
    page: dict[str, Any] = {}

    title = first_str(raw, ["title", "pageTitle", "page_title"])
    intro = first_str(raw, ["introText", "intro_text", "intro"])
    form_action = first_str(raw, ["formAction", "form_action", "contact_form_action"])
    back_label = first_str(raw, ["backButtonLabel", "back_button_label"])
    submit_label = first_str(raw, ["submitButtonLabel", "submit_button_label"])
    show_social = first_bool(raw, ["sections.showSocialStrip", "showSocialStrip", "show_social_strip"])

    if title:
        page["title"] = title
    if intro:
        page["introText"] = intro
    if form_action:
        page["formAction"] = form_action
    if back_label:
        page["backButtonLabel"] = back_label
    if submit_label:
        page["submitButtonLabel"] = submit_label
    if show_social is not None:
        page["sections"] = {"showSocialStrip": show_social}

    return page


def normalize_global(raw_global: dict[str, Any]) -> dict[str, Any]:
    global_out: dict[str, Any] = {}

    book_label = first_str(
        raw_global,
        ["ctaDefaults.bookLabel", "book_label", "bookLabel", "cta.bookLabel"],
    )
    book_url = first_str(
        raw_global,
        ["ctaDefaults.bookUrl", "book_url", "bookUrl", "cta.bookUrl"],
    )
    if book_label or book_url:
        global_out.setdefault("ctaDefaults", {})
    if book_label:
        global_out["ctaDefaults"]["bookLabel"] = book_label
    if book_url:
        global_out["ctaDefaults"]["bookUrl"] = book_url

    reply_sla = first_str(
        raw_global,
        ["meta.replySlaText", "reply_sla_text", "replySlaText", "reply_sla"],
    )
    if reply_sla:
        global_out["meta"] = {"replySlaText": reply_sla}

    raw_social = (
        get_by_path(raw_global, "socialLinks")
        or get_by_path(raw_global, "social_links")
        or get_by_path(raw_global, "socials")
        or raw_global.get("socialLinks")
        or raw_global.get("social_links")
        or raw_global.get("socials")
    )
    normalized_social = normalize_social_links(raw_social)
    if normalized_social:
        global_out["socialLinks"] = normalized_social

    return global_out


def normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if "global" in payload or "pages" in payload:
        raw_global = payload.get("global")
        raw_pages = payload.get("pages")
    else:
        raw_global = (
            payload.get("site_settings")
            or payload.get("global_settings")
            or payload.get("settings")
            or payload.get("options")
        )
        raw_pages = payload.get("pages")

    if not isinstance(raw_global, dict):
        raw_global = {}
    if not isinstance(raw_pages, dict):
        raw_pages = {}

    # Support flattened payload where page keys are top-level.
    for flat_key in ("home", "index", "video", "audio", "contact"):
        value = payload.get(flat_key)
        if isinstance(value, dict) and flat_key not in raw_pages:
            raw_pages[flat_key] = value

    home_raw = raw_pages.get("home") or raw_pages.get("index") or {}
    video_raw = raw_pages.get("video") or {}
    audio_raw = raw_pages.get("audio") or raw_pages.get("audio-more") or {}
    contact_raw = raw_pages.get("contact") or {}

    if not isinstance(home_raw, dict):
        home_raw = {}
    if not isinstance(video_raw, dict):
        video_raw = {}
    if not isinstance(audio_raw, dict):
        audio_raw = {}
    if not isinstance(contact_raw, dict):
        contact_raw = {}

    normalized = {
        "global": normalize_global(raw_global),
        "pages": {
            "home": normalize_home(home_raw),
            "video": normalize_video_or_audio(video_raw),
            "audio": normalize_video_or_audio(audio_raw),
            "contact": normalize_contact(contact_raw),
        },
    }
    return normalized


def build_content_url(base_url: str, content_path: str) -> str:
    if content_path.startswith("http://") or content_path.startswith("https://"):
        return content_path
    if not base_url:
        raise ValueError("base URL is required when content path is not absolute")
    base = base_url.rstrip("/") + "/"
    path = content_path.lstrip("/")
    return urljoin(base, path)


def fetch_json(url: str, timeout: int, auth_token: str = "") -> dict[str, Any]:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    request = Request(url, headers=headers)
    try:
        with urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="ignore")
            data = json.loads(body)
            if not isinstance(data, dict):
                raise ValueError("headless endpoint must return a JSON object")
            return data
    except HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} while fetching {url}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network error while fetching {url}: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON response from {url}") from exc


def load_existing(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        return data
    return {}


def main() -> int:
    args = parse_args()
    if not args.base_url and not (
        args.content_path.startswith("http://") or args.content_path.startswith("https://")
    ):
        print(
            "Missing --base-url (or WP_HEADLESS_BASE_URL) for relative content path.",
            file=sys.stderr,
        )
        return 2

    output_path = Path(args.output).resolve()
    existing = load_existing(output_path)

    content_url = build_content_url(args.base_url, args.content_path)
    remote_payload = fetch_json(content_url, timeout=args.timeout, auth_token=args.auth_token)
    normalized = normalize_payload(remote_payload)

    merged = deep_merge(existing, normalized)
    output_path.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")

    social_count = len(get_by_path(merged, "global.socialLinks") or {})
    print(
        f"Synced site content from {content_url} -> {output_path} "
        f"(social links: {social_count})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
