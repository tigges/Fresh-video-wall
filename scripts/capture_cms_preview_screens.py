#!/usr/bin/env python3
"""Capture static CMS preview screenshots for WordPress visual editor cards.

Outputs PNG files consumed by the visual CMS plugin, reducing reliance on iframes.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "wp-plugin" / "djurbant-headless-visual-cms" / "assets" / "previews"

BASE_URL = os.environ.get(
    "MAIN_APP_BASE_URL",
    "https://wordpress-1344959-6296666.cloudwaysapps.com",
).rstrip("/")

VIEWPORT = {"width": 1280, "height": 720}

CAPTURE_TARGETS = [
    ("global-ctas-socials.png", "/index.html", ".main-nav-book"),
    ("home-hero-bestof.png", "/index.html#best-of-artist", "#best-of-artist"),
    ("home-stats-booking.png", "/index.html", ".stats-strip"),
    ("video-page.png", "/video.html", ".media-section"),
    ("audio-page.png", "/audio.html", ".media-section"),
    ("contact-page.png", "/contact.html", ".media-section"),
]


async def capture_previews() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        for filename, path, selector in CAPTURE_TARGETS:
            url = f"{BASE_URL}{path}"
            print(f"Capturing {url} -> {filename}")
            page = await browser.new_page(viewport=VIEWPORT)
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            try:
                await page.wait_for_selector(selector, timeout=12000)
            except Exception:
                # Fall back to full-page screenshot even if selector misses.
                pass
            await page.wait_for_timeout(500)
            await page.screenshot(
                path=str(OUTPUT_DIR / filename),
                full_page=False,
            )
            await page.close()
        await browser.close()


def main() -> int:
    asyncio.run(capture_previews())
    print(f"Wrote previews to {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

