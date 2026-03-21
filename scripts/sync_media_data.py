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

SEED_VIDEO_IDS = (
    "Jf7nPjlK2Bo",
    "8XF8FRusnWc",
    "PPUISj_W6Kw",
    "uFJzPmG7zS8",
    "odAzUGdV_so",
)


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")


def fetch_json(url: str) -> dict[str, Any]:
    return json.loads(fetch_text(url))


def normalize_brand(text: str) -> str:
    """Keep feed title but normalize UrbanT capitalization."""
    return re.sub(r"\burbant\b", "UrbanT", text, flags=re.IGNORECASE)


def unique_preserve_order(items: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


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
    return {
        "key": key,
        "title": normalize_brand(str(entry.get("name", "Untitled Mix"))),
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


def main() -> None:
    videos = ranked_youtube_items()
    audio = ranked_mixcloud_items()
    top_videos, rest_videos = split_top_rest(videos)
    top_audio, rest_audio = split_top_rest(audio)

    data = {
        "generatedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "strategy": {
            "videos": "Sorted by YouTube viewCount desc, then publishedAt desc",
            "audio": "Sorted by Mixcloud playCount desc, then publishedAt desc",
        },
        "videos": {"top3": top_videos, "rest": rest_videos},
        "audio": {"top3": top_audio, "rest": rest_audio},
    }

    OUTPUT_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with {len(videos)} videos and {len(audio)} audio items.")


if __name__ == "__main__":
    main()
