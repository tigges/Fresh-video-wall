# Chrome Prism Base

This file defines the baseline version to return to at any time.

## Baseline Name
- **Chrome Prism Base**

## Permanent Git References
- `snapshot-chrome-prism-base-v2` (annotated snapshot tag)
- `pin-chrome-prism-base-v2` (long-term pin tag)
- Historical baseline tags kept:
  - `snapshot-chrome-prism-base`
  - `pin-chrome-prism-base`

## What this baseline includes
- Chrome Prism gradient palette (Option A)
- Server-side YouTube live CTA state in `media-data.json`
- Hero CTA behavior:
  - `Join Live Now!` when live
  - `Watch Latest Video` when not live (plays top tile)
- Subscribe button moved to bottom of `videos.html`
- Subpage header updates:
  - round YouTube/Mixcloud icon links (matches homepage icon style)
  - `Open Channel` / `Open Mixcloud` moved below subpage grids
  - subpage `Home` button aligned to outline action button style
- Current badge styling and hero title refinements

## Hero title font test options (remembered)
- `?heroFont=current` -> current Syne-style look
- `?heroFont=montserrat` -> Montserrat 900 Black (upright)
- `?heroFont=russo` -> Russo One italic test

## Restore commands
```bash
git fetch origin --tags
git checkout tags/pin-chrome-prism-base-v2 -b restore/chrome-prism-base
```

