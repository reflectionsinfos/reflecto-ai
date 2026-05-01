# Deployment Scripts

This folder contains the release deployment helpers for remote environments such as the production VM at `192.168.117.144`.

The primary script is `deployment/deploy.ps1`. It is the most up to date implementation and should be used on Windows.

`deployment/deploy.sh` is the Bash equivalent, but it currently lags behind the PowerShell version in a few safety and compatibility fixes. Treat `deploy.ps1` as the source of truth unless you intentionally need the shell version.

## Recommended Usage

PowerShell:

```powershell
.\deployment\deploy.ps1 -Environment prod
```

Bash:

```bash
./deployment/deploy.sh prod
```

Both scripts read `deployment/env.<environment>`.

Examples:

- `deployment/env.dev`
- `deployment/env.qa`
- `deployment/env.prod`

## What The Deployment Does

At a high level, the deployment flow is:

1. Read `deployment/env.<environment>`
2. Create `deployment/deployment.log` locally (cleared at the start of each run)
3. Build a release archive from an allowlisted subset of the repo
4. Overlay local environment files like backend/frontend `.env` files into the release payload
5. Upload the archive to the remote host over SSH/SCP
6. Extract it into a timestamped release directory on the remote server
7. Run `docker compose` on the remote host from that release directory
8. Update the `current` symlink to the new release
9. Remove old releases beyond the retention limit
10. Generate release notes locally using the release agent (if configured)
11. Copy `deployment.log` and release notes to the remote release directory
12. Append post-deployment verification steps to `deployment.log`

The remote host does not receive your entire Git repo. It receives only the allowlisted deployment payload.

## Environment File Keys

The scripts expect the environment file to define at least:

- `REMOTE_HOST`
- `REMOTE_USER`
- `REMOTE_PASSWORD`
- `REMOTE_DEPLOY_ROOT`
- `LOCAL_SOURCE_PATH`

Common optional keys:

- `REMOTE_PORT`
- `REMOTE_SUDO_PASSWORD`
- `DEPLOY_COMPOSE_FILE`
- `COMPOSE_PROJECT_NAME`
- `DEPLOY_REF`
- `DEPLOY_USE_GIT_ARCHIVE`
- `DEPLOY_INSTALL_DOCKER_IF_MISSING`
- `DEPLOY_RETAIN_RELEASES`
- `SSH_STRICT_HOST_KEY_CHECKING`
- `DEPLOY_INCLUDE_PATHS`
- `DEPLOY_LOCAL_EXTRA_PATHS`

Release notes optional keys (all three required to enable release notes generation):

- `RELEASE_AGENT_GROQ_API_KEY` — Groq API key; if absent, release notes are skipped
- `RELEASE_AGENT_DIR` — path to the release agent root (default: `C:\projects\nexus-ai\ai-agents\release`)
- `RELEASE_NOTES_PREVIOUS_BRANCH` — branch to diff against (default: `main`)

For production, `deployment/env.prod` currently points to:

- Host: `192.168.117.144`
- User: `refluser`
- Deploy root: `/var/www/reflecto-ai`
- Compose project: `reflecto-ai-prod`
- Compose file: `docker-compose.prod.yml`

## How The Payload Is Built

By default, `DEPLOY_USE_GIT_ARCHIVE="true"` in `deployment/env.prod`.

That means the deployment archive is built from:

- Git ref: `HEAD`
- Only tracked files
- Only the allowlisted paths

This is important:

- If you have local uncommitted fixes, they will not be deployed when `DEPLOY_USE_GIT_ARCHIVE=true`.
- If you want to deploy local working tree changes, set `DEPLOY_USE_GIT_ARCHIVE="false"` temporarily.

When `DEPLOY_USE_GIT_ARCHIVE=false`, the PowerShell script packages from the local working tree instead of `HEAD`.

## Default Included Paths

The PowerShell deployment script currently includes these paths by default:

- `apps/backend`
- `apps/frontend`
- `package.json`
- `package-lock.json`
- `docker-compose.prod.yml`
- `.dockerignore`
- `.npmrc`
- `apps/infra/reflecto-prod-app.conf`

These can be overridden through `DEPLOY_INCLUDE_PATHS` in `env.<environment>`.

This is an allowlist, not a repo copy.

## Environment File Overlays

After the allowlisted payload is created, the script overlays these local files into the staged release if they exist:

- `apps/backend/.env`
- `apps/backend/.env.production`
- `apps/frontend/.env.production`

These can be overridden through `DEPLOY_LOCAL_EXTRA_PATHS`.

This means:

- The backend shared env is copied into the release at `apps/backend/.env`
- The backend production env is copied into the release at `apps/backend/.env.production`
- The frontend production env is copied into the release at `apps/frontend/.env.production`

These files are not expected to come from Git. They are copied from your local machine at deploy time.

So for production on `192.168.117.144`, the remote release ends up containing:

- `/var/www/reflecto-ai/releases/<release>/apps/backend/.env`
- `/var/www/reflecto-ai/releases/<release>/apps/backend/.env.production`
- `/var/www/reflecto-ai/releases/<release>/apps/frontend/.env.production`

## Remote Directory Structure

With the current production config, files are deployed under:

```text
/var/www/reflecto-ai
```

The PowerShell script creates and uses this structure:

```text
/var/www/reflecto-ai/                        ← deploy root (192.168.117.144)
  current -> releases/<release-name>/        ← symlink, always points to live release
  releases/
    prod-<utc-timestamp>-<short-sha>/        ← one directory per deployment
      apps/
        backend/
          .env
          .env.production
          Dockerfile
          src/...
        frontend/
          .env.production
          Dockerfile
          app/...
      docker-compose.prod.yml
      package.json
      package-lock.json
      .dockerignore
      .npmrc
      apps/infra/reflecto-prod-app.conf
      deployment.log                         ← copy of local deployment log
      release_notes/                         ← generated by release agent (if configured)
        release_notes_<ver>_<date>_developer.html
        release_notes_<ver>_<date>_developer.md
        release_notes_<ver>_<date>_customer.html
        release_notes_<ver>_<date>_customer.md
```

The `current` symlink is updated atomically after a successful `docker compose up -d --build`. If the deployment fails before that point, `current` keeps pointing to the previously live release.

The release name format is:

```text
<environment>-<UTC timestamp>-<short git SHA or workspace>
```

Examples:

- `prod-20260406054413-workspace`
- `prod-20260406053446-9e78a49`

## Where The Archive Is Uploaded

Before extraction, the generated archive is uploaded to:

```text
/tmp/reflecto-ai-<release-name>.tar.gz
```

On the remote machine, the script then:

1. creates the release directory
2. extracts the archive there
3. validates the compose file
4. runs Docker Compose from that directory
5. removes the uploaded tarball from `/tmp`

## What Happens On The Remote Host

The PowerShell deployment script performs these remote operations:

1. `mkdir -p` for the releases directory and the new release directory
2. extract the uploaded tarball into the new release directory
3. optionally install Docker if missing
4. run `docker compose -p <project> -f <compose-file> config -q`
5. run `docker compose down --remove-orphans`
6. remove legacy fixed-name containers if they exist:
   - `reflecto-backend-prod`
   - `reflecto-frontend-prod`
7. run `docker compose up -d --build`
8. update `current` symlink to the new release
9. delete the uploaded `/tmp/*.tar.gz`
10. delete old release directories beyond `DEPLOY_RETAIN_RELEASES`

Retention is currently controlled by:

```text
DEPLOY_RETAIN_RELEASES="3"
```

So the script keeps the 3 most recent releases and removes older ones (current release + 2 backups).

## Deployment Log

Every run creates `deployment/deployment.log` locally (overwritten each run). It contains:

- **Header** — environment, start time, remote host, deploy root, branch, commit, release name
- **Per-step log lines** — timestamped INFO/WARN/ERROR entries from each phase
- **Summary** — start/end times, duration, remote server IP, deploy root, release directory, `current` symlink target, release notes path
- **Post-deployment verification** — step-by-step instructions to confirm the app is live

After a successful deployment the log is also SCP'd to `releases/<release-name>/deployment.log` on the remote server so there is a permanent record alongside the deployed code.

Sample success summary written to the log:

```text
============================================================
DEPLOYMENT SUMMARY
Status        : SUCCESS
Start Time    : 2026-05-02T10:00:00Z
End Time      : 2026-05-02T10:03:42Z
Duration      : 0h 3m 42s
Branch        : feature/kudos-card-enhancements
Commit        : 04db0ec
Release       : prod-20260502100000-04db0ec
------------------------------------------------------------
Remote Server : 192.168.117.144
Deploy Root   : /var/www/reflecto-ai
Release Dir   : /var/www/reflecto-ai/releases/prod-20260502100000-04db0ec
Active Link   : /var/www/reflecto-ai/current  ->  releases/prod-20260502100000-04db0ec
Release Notes : C:\projects\reflecto-ai\deployment\release_notes\prod-20260502100000-04db0ec
============================================================

POST-DEPLOYMENT VERIFICATION
------------------------------------------------------------
1. Open  : https://reflecto-ai.onreflections.com/
2. Action : Click "Sign in with Reflections SSO"
3. Credentials : Enter your Reflections SSO email and password
4. 2FA (if enabled) : Enter the verification code sent to your phone
5. Verify that the app loads correctly and key features work as expected
============================================================
```

## Release Notes Generation

The script can automatically generate release notes after a successful deployment using the [Release Agent](C:\projects\nexus-ai\ai-agents\release).

**Requirements** — add these three keys to `deployment/env.prod`:

```ini
RELEASE_AGENT_GROQ_API_KEY=gsk_...
RELEASE_AGENT_DIR=C:\projects\nexus-ai\ai-agents\release   # optional, this is the default
RELEASE_NOTES_PREVIOUS_BRANCH=main                          # optional, this is the default
```

If any required key is missing or the release agent venv is not set up, the step is skipped with a WARN and the deployment continues normally.

**What it generates** — four files saved locally under `deployment/release_notes/<release-name>/` and also SCP'd to the remote release directory:

| File | Audience |
|---|---|
| `release_notes_<ver>_<date>_developer.html` | Engineers, QA, Product — full technical detail |
| `release_notes_<ver>_<date>_developer.md` | Same, Markdown format |
| `release_notes_<ver>_<date>_customer.html` | Business users — plain English, no jargon |
| `release_notes_<ver>_<date>_customer.md` | Same, Markdown format |

The agent diffs `<current-branch>` against `main` (or whatever `RELEASE_NOTES_PREVIOUS_BRANCH` is set to) using Groq as the LLM provider.

**Setup the release agent venv** (one-time, if not already done):

```powershell
cd C:\projects\nexus-ai\ai-agents\release
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
.venv\Scripts\python.exe -m pip install -e .
```

## Important PowerShell Vs Shell Differences

The PowerShell script has the latest fixes and operational behavior.

Current `deploy.ps1` improvements:

- correct include path for `apps/infra/reflecto-prod-app.conf`
- supports working-tree deploys safely when `DEPLOY_USE_GIT_ARCHIVE=false`
- skips missing include paths in working-tree mode
- stops the existing compose project before rebuilding
- removes legacy fixed-name containers to avoid port/container conflicts
- uses a more robust remote script templating approach

Current `deploy.sh` differences to be aware of:

- still defaults to `reflecto-prod-app.conf` at repo root
- does not include the same remote cleanup steps as `deploy.ps1`
- should be treated as older behavior unless brought back into parity

If you are deploying from Windows, use `deploy.ps1`.

## Manual Verification On The Remote Host

For the current production VM:

- Host: `192.168.117.144`
- User: `refluser`
- Deploy root: `/var/www/reflecto-ai`
- Compose project: `reflecto-ai-prod`

SSH to the VM:

```bash
ssh refluser@192.168.117.144
```

If Docker access requires sudo, use `sudo` on the commands below.

Check release layout:

```bash
cd /var/www/reflecto-ai
ls -lah
ls -lah releases
readlink -f current
```

Inspect the current release contents:

```bash
cd /var/www/reflecto-ai/current
find . -maxdepth 2 -type f | sort
```

Confirm the environment files exist in the current release:

```bash
cd /var/www/reflecto-ai/current
ls -lah apps/backend/.env
ls -lah apps/backend/.env.production
ls -lah apps/frontend/.env.production
```

Check the running compose stack:

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml ps
```

Check container logs:

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml logs --tail=200 backend
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml logs --tail=200 frontend
```

Follow logs live:

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml logs -f backend
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml logs -f frontend
```

Check Docker images and containers:

```bash
sudo docker ps
sudo docker images | grep reflecto-ai-prod
```

Check backend health directly on the VM:

```bash
curl http://127.0.0.1:4000/health
```

Expected response looks like:

```json
{"status":"ok","timestamp":"..."}
```

Check the frontend locally on the VM:

```bash
curl -I http://127.0.0.1:3000
```

Inspect the resolved Docker Compose config:

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml config
```

Restart services manually:

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml restart
```

Bring the stack down manually:

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml down --remove-orphans
```

Rebuild and start manually:

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml up -d --build
```

## How To Verify Which Release Is Live

This shows the current symlink target:

```bash
readlink -f /var/www/reflecto-ai/current
```

This shows all releases sorted by timestamp:

```bash
ls -lah /var/www/reflecto-ai/releases
```

This shows the compose process status from the current live release:

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml ps
```

## Common Operational Notes

- If `DEPLOY_USE_GIT_ARCHIVE=true`, only committed tracked files from `HEAD` are deployed.
- Local `.env` files are copied from your machine during deploy if present.
- The PowerShell script deploys a release archive, not a Git clone.
- The remote `current` symlink is updated only after a successful `docker compose up -d --build`.
- If a deployment fails before the new stack comes up, inspect `/var/www/reflecto-ai/releases/<failed-release>` and Docker logs on the VM.

## Recommended Production Command

Use this on Windows:

```powershell
.\deployment\deploy.ps1 -Environment prod
```

If you need to deploy local uncommitted changes intentionally, temporarily set this in `deployment/env.prod`:

```text
DEPLOY_USE_GIT_ARCHIVE="false"
```

Then run the deploy and set it back afterward if you want production to remain commit-based.
