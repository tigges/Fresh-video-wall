# DJ UrbanT Headless Visual CMS (WordPress plugin)

This plugin replaces raw JSON editing with a visual WordPress admin form and
keeps the same headless endpoint used by the main app sync pipeline:

- `/wp-json/djurbant/v1/site-content`

## What it provides

- Form-based editor in WP Admin (`Site Content CMS`)
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
- After edits in CMS app, run GitHub workflow:
  - **Sync Site Content from WordPress**
