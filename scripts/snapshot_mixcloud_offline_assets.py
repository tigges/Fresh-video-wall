#!/usr/bin/env python3
"""Snapshot public MixCloud page assets for offline styling reference."""

from __future__ import annotations

import json
import re
import ssl
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "mixcloud-clone" / "snapshot"
TARGETS = ["https://www.mixcloud.com/urbant/"]
MAX_PRIMARY_ASSETS = 60
MAX_SECONDARY_ASSETS = 80
MAX_FILE_BYTES = 6 * 1024 * 1024
TIMEOUT = 20
UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)


class AssetCollector(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__()
        self.base_url = base_url
        self.assets: set[str] = set()
        self.style_assets: set[str] = set()
        self.image_assets: set[str] = set()
        self.inline_styles: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {k.lower(): v for k, v in attrs}
        if tag.lower() == "link":
            href = attr.get("href")
            rel = (attr.get("rel") or "").lower()
            as_value = (attr.get("as") or "").lower()
            if href and ("stylesheet" in rel or as_value in {"style", "font"}):
                url = urljoin(self.base_url, href)
                self.assets.add(url)
                if as_value == "font":
                    self.assets.add(url)
                if "stylesheet" in rel or as_value == "style":
                    self.style_assets.add(url)
        elif tag.lower() == "img":
            src = attr.get("src")
            if src:
                url = urljoin(self.base_url, src)
                self.assets.add(url)
                self.image_assets.add(url)
        elif tag.lower() == "source":
            srcset = attr.get("srcset")
            if srcset:
                src = srcset.split(",")[0].strip().split(" ")[0].strip()
                if src:
                    self.assets.add(urljoin(self.base_url, src))
        elif tag.lower() == "meta":
            if (attr.get("property") or "").lower() in {"og:image", "twitter:image"}:
                content = attr.get("content")
                if content:
                    url = urljoin(self.base_url, content)
                    self.assets.add(url)
                    self.image_assets.add(url)
        style_value = attr.get("style")
        if style_value:
            self.inline_styles.append(style_value)


def http_get(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": UA})
    ctx = ssl.create_default_context()
    with urlopen(req, timeout=TIMEOUT, context=ctx) as response:
        return response.read()


def safe_filename(url: str) -> str:
    parsed = urlparse(url)
    name = Path(parsed.path).name or "asset"
    if "." not in name:
        name = f"{name}.bin"
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return safe


def classify_folder(url: str, content_type: str) -> str:
    lower_type = content_type.lower()
    path = urlparse(url).path.lower()
    if "css" in lower_type or path.endswith(".css"):
        return "css"
    if any(token in lower_type for token in ["font", "woff", "ttf", "otf"]) or re.search(
        r"\.(woff2?|ttf|otf|eot)$", path
    ):
        return "fonts"
    if any(token in lower_type for token in ["image", "svg"]) or re.search(
        r"\.(png|jpe?g|webp|gif|svg)$", path
    ):
        return "images"
    return "other"


def extract_css_urls(css_text: str, base_url: str) -> set[str]:
    found: set[str] = set()
    for raw in re.findall(r"url\(([^)]+)\)", css_text):
        candidate = raw.strip().strip("'\"")
        if not candidate or candidate.startswith("data:"):
            continue
        found.add(urljoin(base_url, candidate))
    return found


def extract_font_families(css_blobs: Iterable[str]) -> list[str]:
    families: set[str] = set()
    pattern = re.compile(r"font-family\s*:\s*([^;]+);", re.IGNORECASE)
    for blob in css_blobs:
        for match in pattern.findall(blob):
            names = [name.strip().strip("'\"") for name in match.split(",")]
            for name in names:
                if name and len(name) <= 80:
                    families.add(name)
    return sorted(families)


def extract_colors(css_blobs: Iterable[str], inline_styles: Iterable[str]) -> dict[str, int]:
    color_counter: Counter[str] = Counter()
    patterns = [
        re.compile(r"#[0-9a-fA-F]{3,8}"),
        re.compile(r"rgba?\([^)]*\)", re.IGNORECASE),
        re.compile(r"hsla?\([^)]*\)", re.IGNORECASE),
    ]
    for blob in [*css_blobs, *inline_styles]:
        for pattern in patterns:
            for token in pattern.findall(blob):
                color_counter[token.strip()] += 1
    return dict(color_counter.most_common(120))


def download_asset(url: str, index: int) -> tuple[dict, str | None]:
    req = Request(url, headers={"User-Agent": UA})
    ctx = ssl.create_default_context()
    with urlopen(req, timeout=TIMEOUT, context=ctx) as response:
        content = response.read(MAX_FILE_BYTES + 1)
        if len(content) > MAX_FILE_BYTES:
            raise ValueError(f"Asset too large: {url}")
        content_type = (response.headers.get("Content-Type") or "").split(";")[0]

    folder = classify_folder(url, content_type)
    ext = Path(urlparse(url).path).suffix
    filename = safe_filename(url)
    if not filename.endswith(ext) and ext:
        filename = f"{Path(filename).stem}{ext}"
    save_dir = OUT_DIR / folder
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / f"{index:03d}-{filename}"
    save_path.write_bytes(content)
    return (
        {
            "url": url,
            "contentType": content_type,
            "savedAs": str(save_path.relative_to(ROOT)),
            "bytes": len(content),
        },
        content.decode("utf-8", errors="ignore") if folder == "css" else None,
    )


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pages: list[dict] = []
    all_assets: list[str] = []
    style_assets: list[str] = []
    inline_styles: list[str] = []

    for target in TARGETS:
        html = http_get(target).decode("utf-8", errors="ignore")
        parser = AssetCollector(target)
        parser.feed(html)
        pages.append(
            {
                "url": target,
                "htmlLength": len(html),
                "assetCount": len(parser.assets),
                "styleCount": len(parser.style_assets),
                "imageCount": len(parser.image_assets),
            }
        )
        all_assets.extend(sorted(parser.assets))
        style_assets.extend(sorted(parser.style_assets))
        inline_styles.extend(parser.inline_styles)
        (OUT_DIR / "html").mkdir(parents=True, exist_ok=True)
        page_name = re.sub(r"[^a-z0-9]+", "-", urlparse(target).path.strip("/") or "home")
        (OUT_DIR / "html" / f"{page_name}.html").write_text(html, encoding="utf-8")

    unique_assets = list(dict.fromkeys(all_assets))[:MAX_PRIMARY_ASSETS]
    downloaded: list[dict] = []
    css_blobs: list[str] = []
    discovered_from_css: set[str] = set()

    for idx, asset_url in enumerate(unique_assets, start=1):
        try:
            record, css_text = download_asset(asset_url, idx)
            downloaded.append(record)
            if css_text is not None:
                css_blobs.append(css_text)
                discovered_from_css.update(extract_css_urls(css_text, record["url"]))
        except Exception as exc:  # noqa: BLE001
            downloaded.append({"url": asset_url, "error": str(exc)})

    secondary_candidates = [
        url
        for url in discovered_from_css
        if url not in {entry.get("url") for entry in downloaded}
    ][:MAX_SECONDARY_ASSETS]

    for idx, asset_url in enumerate(secondary_candidates, start=len(downloaded) + 1):
        try:
            record, css_text = download_asset(asset_url, idx)
            downloaded.append(record)
            if css_text is not None:
                css_blobs.append(css_text)
        except Exception as exc:  # noqa: BLE001
            downloaded.append({"url": asset_url, "error": str(exc)})

    font_families = extract_font_families(css_blobs)
    colors = extract_colors(css_blobs, inline_styles)

    manifest = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "targets": TARGETS,
        "pages": pages,
        "downloadedAssets": downloaded,
        "fontFamilies": font_families,
        "topColors": colors,
        "notes": "Use only assets you are allowed to host. Audio/video files are not downloaded by this snapshot script.",
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(f"Saved snapshot manifest: {OUT_DIR / 'manifest.json'}")
    print(f"Assets downloaded: {sum(1 for entry in downloaded if 'savedAs' in entry)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
