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
