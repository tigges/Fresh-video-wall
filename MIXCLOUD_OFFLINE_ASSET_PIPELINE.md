# MixCloud Offline Clone Asset Pipeline

This project now supports a more independent offline clone workflow with two utilities:

1. `scripts/snapshot_mixcloud_offline_assets.py`
2. `scripts/generate_offline_audio_template.py`

## 1) Snapshot design/assets from MixCloud profile

Run:

```bash
python3 scripts/snapshot_mixcloud_offline_assets.py
```

Outputs:

- `assets/mixcloud-clone/snapshot/html/*.html` (captured reference page html)
- `assets/mixcloud-clone/snapshot/css/*` (captured css bundles)
- `assets/mixcloud-clone/snapshot/fonts/*` (captured font files referenced by css)
- `assets/mixcloud-clone/snapshot/manifest.json`:
  - extracted font families
  - top color tokens
  - downloaded asset inventory

Use this snapshot to tune `mixcloud-offline.css` toward a closer visual match.

## 2) Build offline audio source map

Run:

```bash
python3 scripts/generate_offline_audio_template.py
```

Outputs:

- `offline-media/audio-sources.template.json`
- `offline-media/audio-sources.json` (created once if missing)

`audio-sources.json` format:

```json
{
  "tracks": {
    "/urbant/track-key/": {
      "title": "UrbanT Live! #315 - ...",
      "audioUrl": "https://YOUR-HOST/path/to/audio-file.mp3",
      "notes": "..."
    }
  }
}
```

The offline track page (`mixcloud-offline-track.html`) checks this map.

- If `audioUrl` exists, playback controls use a real HTML5 audio source.
- If missing, controls fall back to local simulation mode.

## Recommended storage for audio/video files

- Prefer your own object storage/CDN or Dropbox direct-download links (`?dl=1`) for controlled ownership.
- Keep assets versioned and immutable where possible (timestamped filenames).

## Notes

- Downloading or mirroring copyrighted third-party audio/video without rights can violate platform terms and laws.
- This pipeline intentionally prepares local structure and optional source mapping without forcing unauthorized media extraction.
