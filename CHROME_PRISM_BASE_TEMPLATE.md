# Chrome Prism Base (Updated)

This file defines the baseline version to return to at any time.

## Baseline Name
- **Chrome Prism Base (Updated)**

## Permanent Git References
- `snapshot-chrome-prism-base-v3` (annotated snapshot tag)
- `pin-chrome-prism-base-v3` (long-term pin tag)
- Historical baseline tags kept:
  - `snapshot-chrome-prism-base-v2`
  - `pin-chrome-prism-base-v2`
  - `snapshot-chrome-prism-base`
  - `pin-chrome-prism-base`

## What this baseline includes
- Chrome Prism gradient palette (Option A)
- Server-side YouTube live CTA state in `media-data.json`
- Hero CTA behavior:
  - `Join Live Now!` when live
  - `Watch Latest Video` when not live (plays top tile)
- Subpage header updates:
  - round YouTube/Mixcloud icon links (matches homepage icon style)
  - bottom navigation row with left `Back` action
  - videos subpage keeps `Subscribe` as right-side action
  - audio subpage keeps `Open Mixcloud` as right-side action
  - subpage `Home` button aligned to outline action button style
- Grid/CTA refinements:
  - desktop/tablet `More Videos` and `More Audio` centered below home grids
  - mobile home hides below-grid More buttons and uses end-of-row menu tiles
  - mobile subpages use horizontal snap rows with end-of-row action tiles
- Current badge styling and hero title refinements

## Hero title font test options (remembered)
- `?heroFont=current` -> current Syne-style look
- `?heroFont=montserrat` -> Montserrat 900 Black (upright)
- `?heroFont=russo` -> Russo One italic test

## Restore commands
```bash
git fetch origin --tags
git checkout tags/pin-chrome-prism-base-v3 -b restore/chrome-prism-base
```

