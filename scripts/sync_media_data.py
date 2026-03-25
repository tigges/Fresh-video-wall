#!/usr/bin/env python3
"""Build ranked media-data.json from YouTube and Mixcloud feeds."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "media-data.json"

YOUTUBE_SOURCES = (
    "https://www.youtube.com/@DJ_UrbanT/videos",
    "https://www.youtube.com/@DJ_UrbanT/streams",
)
YOUTUBE_STREAMS_URL = "https://www.youtube.com/@DJ_UrbanT/streams"

SEED_VIDEO_IDS = (
    "Jf7nPjlK2Bo",
    "8XF8FRusnWc",
    "PPUISj_W6Kw",
    "uFJzPmG7zS8",
    "odAzUGdV_so",
)

FEATURED_RECENT_BONUS = 150


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")


def fetch_json(url: str) -> dict[str, Any]:
    return json.loads(fetch_text(url))


def normalize_brand(text: str) -> str:
    """Keep feed title but normalize UrbanT capitalization."""
    return re.sub(r"\burbant\b", "UrbanT", text, flags=re.IGNORECASE)


GENRE_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("bass-house", re.compile(r"\bbass\s*house\b", flags=re.IGNORECASE)),
    ("tech-house", re.compile(r"\btech\s*house\b", flags=re.IGNORECASE)),
    ("deep-house", re.compile(r"\bdeep\s*house\b", flags=re.IGNORECASE)),
    ("progressive-house", re.compile(r"\bprogressive\s*house\b", flags=re.IGNORECASE)),
    ("house", re.compile(r"\bhouse\b", flags=re.IGNORECASE)),
    ("electro-house", re.compile(r"\belectro\s*house\b", flags=re.IGNORECASE)),
    ("future-house", re.compile(r"\bfuture\s*house\b", flags=re.IGNORECASE)),
]


def detect_genres(title: str) -> list[str]:
    if not title:
        return []
    genres: list[str] = []
    for slug, pattern in GENRE_PATTERNS:
        if pattern.search(title):
            if slug == "house" and any(
                specific in genres
                for specific in (
                    "bass-house",
                    "tech-house",
                    "deep-house",
                    "progressive-house",
                    "electro-house",
                    "future-house",
                )
            ):
                continue
            genres.append(slug)
    return genres


def unique_preserve_order(items: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def parse_published_at(value: str) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=UTC)

    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.replace(tzinfo=UTC)
        except ValueError:
            continue

    try:
        # Handles ISO with timezone offsets if present.
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=UTC)


def extract_video_ids() -> list[str]:
    ids: list[str] = []
    for source_url in YOUTUBE_SOURCES:
        try:
            html = fetch_text(source_url)
            ids.extend(re.findall(r"watch\?v=([A-Za-z0-9_-]{11})", html))
        except Exception:
            continue
    ids.extend(SEED_VIDEO_IDS)
    return unique_preserve_order(ids)


def detect_live_video_id(streams_html: str) -> str:
    patterns = (
        r'"videoId":"([A-Za-z0-9_-]{11})".{0,1200}?"BADGE_STYLE_TYPE_LIVE_NOW"',
        r'"BADGE_STYLE_TYPE_LIVE_NOW".{0,1200}?"videoId":"([A-Za-z0-9_-]{11})"',
    )
    for pattern in patterns:
        match = re.search(pattern, streams_html, flags=re.DOTALL)
        if match:
            return str(match.group(1))
    return ""


def youtube_live_state() -> dict[str, Any]:
    try:
        streams_html = fetch_text(YOUTUBE_STREAMS_URL)
    except Exception:
        return {
            "isLive": False,
            "liveVideoId": "",
            "liveUrl": "",
            "latestVideoId": "",
            "latestUrl": "",
        }

    stream_ids = unique_preserve_order(
        re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', streams_html)
    )
    latest_video_id = stream_ids[0] if stream_ids else ""

    live_video_id = detect_live_video_id(streams_html)
    is_live = bool(live_video_id)

    if not live_video_id and "BADGE_STYLE_TYPE_LIVE_NOW" in streams_html:
        # If YouTube markup changes and we still see a live badge token,
        # fall back to first stream item so the CTA keeps working.
        live_video_id = latest_video_id
        is_live = bool(live_video_id)

    return {
        "isLive": is_live,
        "liveVideoId": live_video_id,
        "liveUrl": f"https://www.youtube.com/watch?v={live_video_id}" if live_video_id else "",
        "latestVideoId": latest_video_id,
        "latestUrl": f"https://www.youtube.com/watch?v={latest_video_id}" if latest_video_id else "",
    }


def youtube_video_item(video_id: str) -> dict[str, Any]:
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    mobile_watch_url = f"https://m.youtube.com/watch?v={video_id}"

    title = f"YouTube Video {video_id}"
    published_at = ""
    view_count = 0

    try:
        oembed = fetch_json(
            f"https://www.youtube.com/oembed?url={quote(watch_url, safe=':/?=&')}&format=json"
        )
        title = normalize_brand(str(oembed.get("title", title)))
    except Exception:
        pass

    try:
        mobile_html = fetch_text(mobile_watch_url)
        view_match = re.search(
            r'"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([0-9,\.]+ views)"',
            mobile_html,
        )
        date_match = re.search(r'"dateText":\{"simpleText":"([^"]+)"', mobile_html)

        if view_match:
            numeric = re.sub(r"[^\d]", "", view_match.group(1))
            view_count = int(numeric) if numeric else 0

        if date_match:
            raw_date = date_match.group(1)
            try:
                parsed = datetime.strptime(raw_date, "%b %d, %Y")
                published_at = parsed.strftime("%Y-%m-%d")
            except ValueError:
                cleaned = raw_date.replace("Streamed live on ", "")
                try:
                    parsed = datetime.strptime(cleaned, "%b %d, %Y")
                    published_at = parsed.strftime("%Y-%m-%d")
                except ValueError:
                    published_at = raw_date
    except Exception:
        pass

    return {
        "id": video_id,
        "title": unescape(title),
        "genres": detect_genres(unescape(title)),
        "url": watch_url,
        "embedUrl": f"https://www.youtube.com/embed/{video_id}",
        "thumbnailUrl": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        "viewCount": view_count,
        "publishedAt": published_at,
    }


def ranked_youtube_items() -> list[dict[str, Any]]:
    videos = [youtube_video_item(video_id) for video_id in extract_video_ids()]
    videos = [video for video in videos if video.get("id")]
    videos.sort(
        key=lambda item: (
            int(item.get("viewCount", 0)),
            str(item.get("publishedAt", "")),
        ),
        reverse=True,
    )
    return videos


def mixcloud_item(entry: dict[str, Any]) -> dict[str, Any]:
    key = str(entry.get("key", ""))
    encoded_key = quote(key, safe="")
    title = normalize_brand(str(entry.get("name", "Untitled Mix")))
    return {
        "key": key,
        "title": title,
        "genres": detect_genres(title),
        "url": str(entry.get("url", "")),
        "embedUrl": (
            "https://www.mixcloud.com/widget/iframe/?hide_cover=0&mini=0&light=0&feed="
            f"{encoded_key}"
        ),
        "playCount": int(entry.get("play_count") or 0),
        "favoriteCount": int(entry.get("favorite_count") or 0),
        "publishedAt": str(entry.get("created_time", "")),
    }


def ranked_mixcloud_items() -> list[dict[str, Any]]:
    response = fetch_json("https://api.mixcloud.com/urbant/cloudcasts/?limit=50")
    items = [mixcloud_item(entry) for entry in response.get("data", [])]
    items = [item for item in items if item.get("key")]
    items.sort(
        key=lambda item: (
            int(item.get("playCount", 0)),
            str(item.get("publishedAt", "")),
        ),
        reverse=True,
    )
    return items


def split_top_rest(items: list[dict[str, Any]], top_n: int = 3) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    return items[:top_n], items[top_n:]


def feature_most_recent(
    items: list[dict[str, Any]], count_key: str, bonus: int = FEATURED_RECENT_BONUS
) -> list[dict[str, Any]]:
    if not items:
        return items

    featured_index = max(
        range(len(items)),
        key=lambda index: parse_published_at(str(items[index].get("publishedAt", ""))),
    )

    featured = dict(items[featured_index])
    original_count = int(featured.get(count_key, 0) or 0)
    featured[f"base{count_key[0].upper()}{count_key[1:]}"] = original_count
    featured[count_key] = original_count + bonus
    featured["featuredBonus"] = bonus
    featured["isFeaturedRecent"] = True

    remaining = [item for idx, item in enumerate(items) if idx != featured_index]
    return [featured, *remaining]


def main() -> None:
    videos = feature_most_recent(ranked_youtube_items(), "viewCount")
    audio = feature_most_recent(ranked_mixcloud_items(), "playCount")
    youtube_live = youtube_live_state()
    top_videos, rest_videos = split_top_rest(videos)
    top_audio, rest_audio = split_top_rest(audio)

    data = {
        "generatedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "strategy": {
            "videos": (
                "Base sort by YouTube viewCount desc, then publishedAt desc; "
                "most recent item pinned to slot #1 with +150 bonus"
            ),
            "audio": (
                "Base sort by Mixcloud playCount desc, then publishedAt desc; "
                "most recent item pinned to slot #1 with +150 bonus"
            ),
            "youtubeLive": (
                "Derived from @DJ_UrbanT/streams page; exposes current live video "
                "if present and latest stream URL fallback"
            ),
        },
        "youtubeLive": youtube_live,
        "videos": {"top3": top_videos, "rest": rest_videos},
        "audio": {"top3": top_audio, "rest": rest_audio},
    }

    OUTPUT_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with {len(videos)} videos and {len(audio)} audio items.")


if __name__ == "__main__":
    main()
