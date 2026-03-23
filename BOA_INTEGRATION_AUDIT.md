# Best of Artist Integration Audit

This project is a static site implementation (not a WordPress theme in this repository), so the integration below references the local homepage stack used in this codebase.

## Existing fetch logic preserved

- **YouTube data fetch location**
  - File: `script.js`
  - Function: `hydrateMediaWalls()`
  - Fetch call: `fetch("./media-data.json", { cache: "no-store" })`
  - Home render path:
    - `renderGrid("videos-grid", data?.videos?.top3 ?? [], createVideoCard)`
    - `updateHeroLiveCta(data)`
    - `updateLiveStrip(data)`

- **Mixcloud data fetch location**
  - File: `script.js`
  - Function: `hydrateMediaWalls()`
  - Fetch call: same `fetch("./media-data.json", { cache: "no-store" })`
  - Home render path:
    - `renderGrid("audio-grid", data?.audio?.top3 ?? [], createAudioTopTileCard)`
  - Additional Mixcloud rendering:
    - `renderMixcloudFeed("audio-mixcloud-list", [...audioTop, ...audioRest])` for Mixcloud page

## Data shape observed

- **YouTube items** (`data.videos.top3` / `data.videos.rest`)
  - `id`
  - `title`
  - `url`
  - `embedUrl`
  - `thumbnailUrl`
  - `viewCount`
  - `publishedAt`
  - Optional ranking metadata (`baseViewCount`, `featuredBonus`, `isFeaturedRecent`)

- **YouTube live state** (`data.youtubeLive`)
  - `isLive`
  - `liveVideoId`
  - `liveUrl`
  - `latestVideoId`
  - `latestUrl`

- **Mixcloud items** (`data.audio.top3` / `data.audio.rest`)
  - `key`
  - `title`
  - `url`
  - `embedUrl`
  - `playCount`
  - `favoriteCount`
  - `publishedAt`
  - Optional ranking metadata (`basePlayCount`, `featuredBonus`, `isFeaturedRecent`)

- **Duration fields**
  - Not explicitly present in the current data source; BOA component safely supports duration when available and omits it when absent.

## Tokens / API keys

- No client-side API keys or tokens are exposed in this repository.
- Media data is consumed from the generated local file `media-data.json`.

## BOA integration approach

- New section uses existing fetched data only:
  - `script.js` stores fetched payload at `window.__DJURBANT_MEDIA_DATA__`.
  - `script.js` dispatches `window.dispatchEvent(new CustomEvent("mediaDataLoaded", { detail: data }))`.
  - `assets/js/best-of-artist.js` listens for this event and maps the existing payload into BOA card shape.
- No replacement of existing YouTube or Mixcloud fetch/render pipeline.
