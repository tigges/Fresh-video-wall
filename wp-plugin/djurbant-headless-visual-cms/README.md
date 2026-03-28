# DJ UrbanT Headless Visual CMS (WordPress plugin)

This plugin replaces raw JSON editing with a visual WordPress admin form and
keeps the same headless endpoint used by the main app sync pipeline:

- `/wp-json/djurbant/v1/site-content`

## What it provides

- Form-based editor in WP Admin (`Site Content CMS`)
- Live section preview cards in WP admin for each CMS section
- Publish confidence panel in WP admin (last WP save, last sync run, direct workflow links)
- Field-level sanitization for text, links, and toggles
- Legacy migration from the previous raw JSON option key
  (`djurbant_site_content_json`) into structured options
- Endpoint mapper that emits the same schema expected by `cms-content.js` and
  `scripts/sync_site_content_from_wp.py`

## Install on CMS app

1. In your CMS WordPress app, create folder:
   - `wp-content/plugins/djurbant-headless-visual-cms/`
2. Copy `djurbant-headless-visual-cms.php` into that folder.
3. WP Admin -> Plugins -> activate **DJ UrbanT Headless Visual CMS**
4. WP Admin -> **Site Content CMS** to edit forms/toggles.

## Field map (visual editor -> endpoint)

### Global

- Book button label -> `global.ctaDefaults.bookLabel`
- Book button URL -> `global.ctaDefaults.bookUrl`
- Reply SLA text -> `global.meta.replySlaText`

### Social links (per network: X, Instagram, YouTube, Mixcloud, Twitch, TikTok)

- Label -> `global.socialLinks.<network>.label`
- URL -> `global.socialLinks.<network>.url`
- Open in new tab -> `global.socialLinks.<network>.openInNewTab`
- Visible -> `global.socialLinks.<network>.enabled`

### Home page

- Hero tagline -> `pages.home.hero.tagline`
- Best of title -> `pages.home.bestOf.title`
- Show stats band -> `pages.home.sections.showStatsBand`
- Show booking band -> `pages.home.sections.showBookingBand`
- Show social strip -> `pages.home.sections.showSocialStrip`
- Booking band title -> `pages.home.bookingBand.title`
- Booking button label -> `pages.home.bookingBand.buttonLabel`
- Booking button URL -> `pages.home.bookingBand.buttonUrl`

### Video page

- Title -> `pages.video.title`
- Intro text -> `pages.video.intro`
- Top button label -> `pages.video.topButton.label`
- Top button URL -> `pages.video.topButton.url`
- Show social strip -> `pages.video.sections.showSocialStrip`

### Audio page

- Title -> `pages.audio.title`
- Intro text -> `pages.audio.intro`
- Top button label -> `pages.audio.topButton.label`
- Top button URL -> `pages.audio.topButton.url`
- Show social strip -> `pages.audio.sections.showSocialStrip`

### Contact page

- Title -> `pages.contact.title`
- Intro text -> `pages.contact.introText`
- Form action -> `pages.contact.formAction`
- Back button label -> `pages.contact.backButtonLabel`
- Submit button label -> `pages.contact.submitButtonLabel`
- Show social strip -> `pages.contact.sections.showSocialStrip`

## Live preview cards (Phase 1)

At the top of the WP visual CMS screen, the plugin renders live preview cards with
embedded mini-screens and direct links:

- Global CTAs + Socials
- Home — Hero + Best of
- Home — Stats + Booking
- Video page
- Audio page
- Contact page

The preview base URL is configurable via:

- `DJURBANT_MAIN_APP_BASE_URL` (define in `wp-config.php`)

If not set, plugin defaults to:

- `https://wordpress-1344959-6296666.cloudwaysapps.com`

## Automated preview screenshots (Phase 2)

The repo now includes an automation pipeline that refreshes static preview images
used by the WP plugin preview cards:

- Script: `scripts/capture_cms_preview_screens.py`
- Workflow: `.github/workflows/refresh-cms-preview-screens.yml`
- Output path:
  `wp-plugin/djurbant-headless-visual-cms/assets/previews/*.png`

Workflow behavior:

1. Runs on schedule and manual dispatch
2. Captures screenshots from the main app
3. Rebuilds `wp-plugin/djurbant-headless-visual-cms.zip`
4. Commits only when preview images changed

Config:

- `MAIN_APP_BASE_URL` repository variable (optional)
  - default:
    `https://wordpress-1344959-6296666.cloudwaysapps.com`

## Editor confidence workflow (Phase 3)

The visual CMS screen now includes an operator-focused confidence panel so content
editors can run the full publish flow without context switching:

- **Last WP save** timestamp (when the form payload was last saved)
- **Last sync run** status (success/in progress/failed)
- **Sync updated** timestamp from the latest workflow run
- Direct buttons for:
  - Sync workflow page
  - Workflow run history
  - Latest workflow run (when available)
  - Endpoint JSON
  - Main app CMS hub (`/cms`)

This uses public GitHub Actions run metadata for:

- repo: `tigges/Fresh-video-wall`
- workflow: `sync-site-content-from-wp.yml`

Both are filterable in code:

- `djurbant_hvc_github_repo`
- `djurbant_hvc_sync_workflow_file`

## Endpoint mapper output schema

The plugin endpoint returns:

```json
{
  "global": {
    "ctaDefaults": { "bookLabel": "...", "bookUrl": "..." },
    "meta": { "replySlaText": "..." },
    "socialLinks": {
      "youtube": {
        "label": "YouTube",
        "url": "https://...",
        "openInNewTab": true,
        "enabled": true
      }
    }
  },
  "pages": {
    "home": {},
    "video": {},
    "audio": {},
    "contact": {}
  }
}
```

## Notes

- If PHP CLI is not available locally, validate by activating in WordPress and
  testing:
  - `/wp-json/djurbant/v1/site-content`
- Recommended operator flow:
  1. Save edits in WP visual CMS.
  2. Run **Sync Site Content from WordPress**.
  3. Verify `/site-content.json` and live pages.
