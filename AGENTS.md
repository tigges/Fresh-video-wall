# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is a **static front-end website** (HTML/CSS/vanilla JS) for DJ UrbanT — no build step, no bundler, no Node.js runtime required. Content is driven by two committed JSON files (`media-data.json`, `site-content.json`).

### Running the dev server

Serve the repo root with any static HTTP server. The simplest approach:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Using `file://` will **not** work because the site uses `fetch()` to load JSON data files.

### Key pages

| Page | URL path |
|------|----------|
| Homepage | `/index.html` |
| Video wall | `/video.html` |
| Audio wall | `/audio.html` |
| Contact form | `/contact.html` |
| MixCloud offline | `/mixcloud-offline.html` |
| Admin panel | `/admin.html` |
| CMS | `/cms/index.html` |

### Python utility scripts

Scripts in `scripts/` use Python 3.12+ and the **standard library only** (no pip dependencies), except `capture_cms_preview_screens.py` which requires `playwright`.

- `sync_media_data.py` — fetches live data from YouTube/Mixcloud APIs and writes `media-data.json`. Can be run without any env vars.
- `sync_site_content_from_wp.py` — syncs from headless WordPress. Requires `WP_HEADLESS_BASE_URL` env var.
- `capture_cms_preview_screens.py` — requires `pip install playwright && playwright install chromium`.

### Lint / test / build

- **No build step** — all assets are pre-authored static files.
- **No test framework** — validation is manual (load pages, verify JSON rendering).
- **No linter configured** in the repo. Standard HTML/CSS/JS validation applies.

### Gotchas

- The contact form's "Send Inquiry" button constructs a `mailto:` link — it does not submit to a backend.
- `media-data.json` is auto-refreshed via GitHub Actions every 6 hours; local changes will be overwritten on merge.
- `site-content.json` is synced from WordPress every 30 minutes via GitHub Actions.
