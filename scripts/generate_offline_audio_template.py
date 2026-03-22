#!/usr/bin/env python3
"""Generate offline audio source template from media-data.json."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MEDIA_DATA_PATH = ROOT / "media-data.json"
OUTPUT_DIR = ROOT / "offline-media"
OUTPUT_TEMPLATE = OUTPUT_DIR / "audio-sources.template.json"
OUTPUT_DEFAULT = OUTPUT_DIR / "audio-sources.json"


def track_identity(item: dict) -> str:
    return str(item.get("key") or item.get("url") or item.get("title") or "")


def build_template(media_data: dict) -> dict:
    tracks: dict[str, dict[str, str]] = {}
    all_audio = [*(media_data.get("audio", {}).get("top3", [])), *(media_data.get("audio", {}).get("rest", []))]
    for item in all_audio:
        identity = track_identity(item)
        if not identity:
            continue
        tracks[identity] = {
            "title": str(item.get("title", "")),
            "audioUrl": "",
            "notes": "Set a direct local URL or Dropbox direct-download URL (e.g. dl=1).",
        }
    return {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "strategy": "Map each cached MixCloud track identity to your own hosted audio source.",
        "tracks": tracks,
    }


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def main() -> int:
    if not MEDIA_DATA_PATH.exists():
        raise FileNotFoundError(f"Missing media data file: {MEDIA_DATA_PATH}")

    media_data = json.loads(MEDIA_DATA_PATH.read_text(encoding="utf-8"))
    template = build_template(media_data)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(OUTPUT_TEMPLATE, template)
    if not OUTPUT_DEFAULT.exists():
        write_json(OUTPUT_DEFAULT, template)
    print(f"Wrote template: {OUTPUT_TEMPLATE}")
    print(f"Wrote default (if missing): {OUTPUT_DEFAULT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
