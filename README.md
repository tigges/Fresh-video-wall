# Fresh-video-wall

Fresh video wall.

## Cloudways automatic git deployment

This repository includes a GitHub Actions workflow at:

- `.github/workflows/deploy-cloudways.yml`

It deploys automatically on pushes to `main` (and can also be run manually from
the Actions tab), then performs a git-based sync on your Cloudways app server.

### 1) Add GitHub repository secrets

In GitHub -> **Settings** -> **Secrets and variables** -> **Actions**, add:

- `CLOUDWAYS_HOST` - Cloudways server host or IP
- `CLOUDWAYS_SSH_USER` - SSH user (for example `master` or app user)
- `CLOUDWAYS_SSH_KEY` - private key content used for SSH auth
- `CLOUDWAYS_APP_PATH` - app root path (for example
  `/home/master/applications/APP_ID/public_html`)

Optional:

- `CLOUDWAYS_SSH_PORT` - defaults to `22`
- `CLOUDWAYS_REPO_URL` - defaults to
  `https://github.com/<owner>/<repo>.git`. Set this explicitly if the repo is
  private or you need a custom authenticated remote URL.

### 2) Optional repository variable

In the same GitHub settings area, you can set:

- `CLOUDWAYS_DEPLOY_BRANCH` - branch to deploy by default (defaults to `main`)

### 3) Deploy flow

1. Push commits to `main`.
2. GitHub Actions opens an SSH session to Cloudways.
3. In `CLOUDWAYS_APP_PATH`, the workflow runs:
   - `git fetch --prune origin <branch>`
   - `git checkout -B <branch> origin/<branch>`
   - `git reset --hard origin/<branch>`
   - `git clean -fd`

This keeps production exactly aligned with the selected Git branch.

## Automatic media wall refresh

This repository also includes:

- `.github/workflows/refresh-media-data.yml`

It regenerates `media-data.json` from YouTube + Mixcloud and updates rankings
automatically on a schedule.

- cadence: every 6 hours (UTC) by default
- trigger: scheduled run or manual workflow dispatch
- commit behavior: only commits when meaningful ranking/content changes are
  detected (it ignores timestamp-only changes)

## Headless WordPress content sync (Phase 2)

This repository now includes:

- `.github/workflows/sync-site-content-from-wp.yml`
- `scripts/sync_site_content_from_wp.py`

It syncs editable site content from a headless WordPress endpoint into
`site-content.json`, which is used by Layer 1 pages (`index`, `video`, `audio`,
`contact`).

### Required configuration

In GitHub -> **Settings** -> **Secrets and variables** -> **Actions** set:

- `WP_HEADLESS_BASE_URL` (secret or variable)  
  Example: `https://cms.your-domain.com`

Optional:

- `WP_HEADLESS_CONTENT_PATH` (secret or variable)  
  Default: `/wp-json/djurbant/v1/site-content`
- `WP_HEADLESS_AUTH_TOKEN` (secret)  
  Bearer token for protected endpoints.

### How it works

1. Workflow runs every 30 minutes (or manually via workflow_dispatch).
2. Calls `scripts/sync_site_content_from_wp.py`.
3. Normalizes the response into the schema expected by `cms-content.js`.
4. Merges into existing `site-content.json` (preserving values not sent by CMS).
5. Commits only when actual content changes.
6. Push to `main` triggers Cloudways deploy workflow automatically.

### Endpoint payload shape

The sync script accepts either:

1. Canonical format:

```json
{
  "global": { "...": "..." },
  "pages": {
    "home": { "...": "..." },
    "video": { "...": "..." },
    "audio": { "...": "..." },
    "contact": { "...": "..." }
  }
}
```

2. Flexible format (script maps aliases and normalized field names), including
social lists or maps.
