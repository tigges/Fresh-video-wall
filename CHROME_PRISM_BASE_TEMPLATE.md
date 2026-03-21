# Chrome Prism Base

This file defines the baseline version to return to at any time.

## Baseline Name
- **Chrome Prism Base**

## Permanent Git References
- `snapshot-chrome-prism-base` (annotated snapshot tag)
- `pin-chrome-prism-base` (long-term pin tag)

## What this baseline includes
- Chrome Prism gradient palette (Option A)
- Server-side YouTube live CTA state in `media-data.json`
- Hero CTA behavior:
  - `Join Live Now!` when live
  - `Watch Latest Video` when not live (plays top tile)
- Subscribe button moved to bottom of `videos.html`
- Current badge styling and hero title refinements

## Hero title font test options (remembered)
- `?heroFont=current` -> current Syne-style look
- `?heroFont=montserrat` -> Montserrat 900 Black (upright)
- `?heroFont=russo` -> Russo One italic test

## Restore commands
```bash
git fetch origin --tags
git checkout tags/pin-chrome-prism-base -b restore/chrome-prism-base
```

