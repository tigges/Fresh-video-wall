# DJ UrbanT Site Structure and Page Logic

## Short Summary

The current site is a **hub-and-spoke media landing experience**:

- A branded homepage with Top 3 video/audio highlights
- Three audio experiences:
  - **Audio Direct**
  - **Micloud Clone**
  - **MixCloud Offline Clone**

Most content is driven from `media-data.json` and rendered by `script.js` based on each page's `data-page` mode.

---

## Page Hierarchy (Human-Readable Map)

### 1) Home - **DJ UrbanT Video & Audio Wall**
- **Route:** `./index.html`
- **Role:** Main landing page and navigation hub

**Links out to:**
- More Videos -> `./videos.html`
- More Audio -> `./audio.html` (Micloud Clone)
- Audio Direct -> `./audio-direct.html`
- Social/footer links (X, Instagram, Twitch, TikTok, etc.)

### 2) More Videos
- **Route:** `./videos.html`
- **Role:** Extended video wall (beyond Top 3)

**Links out to:**
- Back/Home
- Top Videos anchor on homepage (`./index.html#videos`)

### 3) Audio Direct
- **Route:** `./audio-direct.html`
- **Role:** Tile-based direct audio playback page with custom controls style

**Links out to:**
- Back/Home
- Micloud Clone (`./audio.html`)

### 4) Micloud Clone (embedded feed view)
- **Route:** `./audio.html`
- **Role:** Mixcloud-style feed using embedded Mixcloud players inside your site

**Links out to:**
- Home
- Open Mixcloud button -> `./mixcloud-offline.html` (offline clone hub)
- Individual track actions -> `./mixcloud-offline-track.html?track=...`

### 5) MixCloud Offline Clone - Home
- **Route:** `./mixcloud-offline.html`
- **Role:** Independent offline-styled Mixcloud profile/feed using `mixcloud-offline.css`

**Links out to:**
- Offline cloudcast cards -> `./mixcloud-offline-track.html?track=...`
- Mobile bottom nav to Home / Clone / Direct / Offline

### 6) MixCloud Offline Clone - Track Detail
- **Route:** `./mixcloud-offline-track.html?track=...`
- **Role:** Per-track page with player shell, comments, and related tracks

**Links out to:**
- Back to Offline Cloudcasts
- Micloud Clone
- Related track links (same page type with different `track` parameter)

---

## Core Logic Layer (Shared Behavior)

- `script.js` checks `body[data-page]` and runs the matching renderer
- `hydrateMediaWalls()` fetches `./media-data.json` and populates each page
- Data model split:
  - `videos.top3`, `videos.rest`
  - `audio.top3`, `audio.rest`
  - `youtubeLive` state for hero CTA behavior
- Home hero CTA:
  - Shows **Join Live Now!** when live
  - Otherwise shows **Watch Latest Video**
  - CTA click attempts to play top video tile in-page first
- Track identity routing:
  - Uses encoded `track` parameter
  - Offline track page resolves the matching item
  - Falls back to first track if parameter is missing/invalid

---

## Key Visual Components by Page

### Home (`index.html`)
- Fixed/glass-style header with UrbanT brand and social icons
- Hero with animated diamond asset, layered title treatment, tagline, and CTA
- Two Top 3 sections:
  - Top Videos cards (YouTube embeds)
  - Top Audio cards (Mixcloud iframe tiles + set-number overlay)
- Genre badge on media cards ("Bass House")
- About/bio block + booking CTA
- Social strip + footer

### More Videos (`videos.html`)
- Shared brand shell
- Section heading + ranked "rest" video cards
- Bottom nav CTA (Back / Top Videos)

### Audio Direct (`audio-direct.html`)
- Shared brand shell
- Audio tiles with custom playback interaction style
- Bottom nav CTA (Back / Micloud Clone)

### Micloud Clone (`audio.html`)
- Profile intro block (`@urbant`)
- Feed cards with:
  - Embedded Mixcloud iframe
  - Track title
  - Stats row
  - Action button linking to cloned track detail page

### MixCloud Offline Clone Home (`mixcloud-offline.html`)
- Separate visual system (`mixcloud-offline.css`)
- Mixcloud-like top nav, cover area, sidebar profile, and highlighted feed
- Cloudcast cards with waveform, tags, counters, and action chips
- Mobile app-style bottom nav

### MixCloud Offline Track (`mixcloud-offline-track.html`)
- Offline hero + large player shell
- Playback controls (play/pause, +/-30s, previous/next, progress)
- Optional real audio via `offline-media/audio-sources.json`
- Comments + related cloudcasts modules

---

## Additional Utility Pages in Repository

- Gradient options showcase -> `./gradient-options.html`
- Version gallery -> `./version-gallery/index.html`

