# AGENTS.md

## Cursor Cloud specific instructions

### Overview

DJ UrbanT Media Wall — a static website (vanilla HTML/CSS/JS) with a Python data-generation script. No build tools, no package managers, no framework.

### Running the dev server

```bash
python3 -m http.server 8000
```

Serve from the repo root (`/workspace`). The site is then available at `http://localhost:8000`. A static HTTP server is required because `script.js` uses `fetch("./media-data.json")` which does not work over the `file://` protocol.

### Pages

| File | Route |
|---|---|
| `index.html` | Homepage — hero + Top 3 Videos + Top 3 Audio |
| `videos.html` | Sub-page — remaining videos beyond top 3 |
| `audio.html` | Sub-page — remaining audio mixes beyond top 3 |
| `version-gallery/index.html` | Internal dev tool — snapshot gallery |

### Data pipeline

`scripts/sync_media_data.py` scrapes YouTube and queries the Mixcloud API to regenerate `media-data.json`. It uses only Python stdlib (no pip dependencies). The checked-in `media-data.json` has valid data, so re-running the script is optional unless you need a refresh.

### Lint / Test / Build

- **No linter configured** — there is no ESLint, Prettier, or other lint tool in this repo.
- **No test framework** — there are no automated tests.
- **No build step** — files are served as-is (no bundler, no transpiler).

### Gotchas

- The hero image at `assets/images/djurbant-proto-1.png` is referenced in `index.html` but may not exist in the repo (only the SVG logo is tracked). This causes a broken image in the hero section but does not affect functionality.
- Embedded YouTube/Mixcloud iframes require internet access for playback; without it the cards still render but show connection errors inside the iframe.
