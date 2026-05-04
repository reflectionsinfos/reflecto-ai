# Deployment Guide

This folder contains the release deployment scripts for remote environments.
The production target is the VM at `192.168.117.144`.

---

## Quick Reference

```powershell
# No arguments — shows branch, server, and path then asks Y/N
.\deployment\deploy.ps1

# Explicit modes
.\deployment\deploy.ps1 prod auto      # full automated pipeline (default)
.\deployment\deploy.ps1 prod copy      # upload + extract only, activate manually on server
.\deployment\deploy.ps1 prod manual    # print step-by-step guide, nothing executed
.\deployment\deploy.ps1 prod rollback  # switch current symlink to the previous release
.\deployment\deploy.ps1 -WhatIf        # dry-run any mode without executing
```

Both `Environment` and `Mode` default to `prod` / `auto`, so a bare
`.\deployment\deploy.ps1` runs the full production pipeline after confirmation.

---

## Deployment Modes

### `auto` — Full automated pipeline (default)

Packages the repo, uploads the archive, extracts it on the remote server,
builds and starts the Docker containers, and switches the `current` symlink.
Everything runs unattended.

```powershell
.\deployment\deploy.ps1 prod auto
```

Remote steps performed automatically:

1. Create release directory under `releases/`
2. Extract archive and validate compose file
3. Install Docker if missing
4. `docker compose down --remove-orphans`
5. Remove legacy fixed-name containers (`reflecto-backend-prod`, `reflecto-frontend-prod`)
6. `docker compose up -d --build`
7. Update `current` symlink
8. Delete `/tmp/*.tar.gz`
9. Remove old releases beyond `DEPLOY_RETAIN_RELEASES`

---

### `copy` — Upload and extract, then activate manually

Packages, uploads, and extracts the release on the server — but stops before
touching Docker. After it finishes, the script prints the exact `sudo docker compose`
commands to copy-paste in your SSH session.

Use this when you want to review or debug on the server before activating.

```powershell
.\deployment\deploy.ps1 prod copy
```

After the script exits, SSH in and run the printed commands:

```bash
ssh refluser@192.168.117.144

cd /var/www/reflecto-ai/releases/<release-name>
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml down --remove-orphans
sudo docker rm -f reflecto-backend-prod reflecto-frontend-prod 2>/dev/null || true
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml up -d --build
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml ps
sudo ln -sfn /var/www/reflecto-ai/releases/<release-name> /var/www/reflecto-ai/current
sudo rm -f /tmp/reflecto-ai-<release-name>.tar.gz
```

The script prints these commands with the real release name filled in.

---

### `manual` — Print full step-by-step guide, nothing executed

Computes the release name and timestamp, then prints a numbered 12-step guide
with 100% copy-paste-ready commands for both the local machine and the remote
server. Nothing is packaged, uploaded, or executed.

Use this for documentation, onboarding, disaster recovery, or when automated
SSH is blocked by a firewall or VPN change.

```powershell
.\deployment\deploy.ps1 prod manual
```

Output covers:

| Step | Where | What |
|------|--------|------|
| 1 | Local | `git archive` + `tar` to create the archive |
| 2 | Local | `scp` upload to remote `/tmp/` |
| 3 | Local | `ssh` into remote server |
| 4 | Remote | `mkdir` + `tar -xzf` + `chown` |
| 5 | Remote | `docker compose config -q` validation |
| 6 | Remote | `docker compose down` |
| 7 | Remote | `docker compose up -d --build` |
| 8 | Remote | `docker compose ps` verify |
| 9 | Remote | `ln -sfn` symlink switch |
| 10 | Remote | `/tmp` cleanup |
| 11 | Remote | Remove old releases |
| 12 | — | Post-deployment verification URL |

---

### `rollback` — Re-activate the previous release

Lists all releases on the server (newest first), stops the currently running
containers, starts the **second-most-recent** release with `docker compose up -d`,
and re-points `current` to it. No new archive is built or uploaded.

```powershell
.\deployment\deploy.ps1 prod rollback
```

Requirements: at least two releases must exist under `releases/` on the server.

---

## Mode Comparison

| | `auto` | `copy` | `manual` | `rollback` |
|---|:---:|:---:|:---:|:---:|
| Packages archive | ✅ | ✅ | ❌ | ❌ |
| Uploads archive | ✅ | ✅ | ❌ | ❌ |
| Extracts on remote | ✅ | ✅ | ❌ | ❌ |
| Docker activate | ✅ | ❌ manual | ❌ printed | previous release |
| Switches symlink | ✅ | ❌ manual | ❌ printed | ✅ to previous |
| Release notes | ✅ | ❌ | ❌ | ❌ |
| Deployment log SCP'd | ✅ | ❌ | ❌ | ❌ |

---

## No-Argument Confirmation Prompt

When the script is run with **no arguments**, it resolves the current branch
and server details from config, then asks for confirmation before doing anything:

```
  No arguments supplied — using defaults.

  About to deploy:
    Branch  : feature/kudos-card-enhancements @ a90c5c8
    Server  : refluser@192.168.117.144
    Path    : /var/www/reflecto-ai
    Mode    : auto

  Proceed? [Y/N]:
```

Typing `Y` continues. Any other key exits cleanly with no changes made.
When arguments are passed explicitly, the prompt is skipped.

---

## Scripts

| File | Purpose |
|------|---------|
| `deploy.ps1` | **Primary script** — Windows PowerShell, all four modes, source of truth |
| `deploy.sh` | Bash equivalent — lags behind `deploy.ps1`; use only if deploying from Linux/macOS |
| `env.prod` | Production target config (credentials, paths, project name) |
| `env.dev` / `env.qa` | Non-production configs (if/when those targets exist) |
| `deployment.log` | Created/overwritten on every run; also SCP'd to the remote release in `auto` mode |
| `release_notes/` | Generated by the release agent after each `auto` deploy (if configured) |
| `../tools/release-notes.ps1` | Wrapper that invokes the nexus-ai release agent CLI — `deploy.ps1` calls this; it owns all Python/venv internals |

`deploy.ps1` is the authoritative implementation. `deploy.sh` does not include
the `copy` / `manual` / `rollback` modes or the confirmation prompt.

---

## Environment File Keys

Both scripts read `deployment/env.<environment>`.

### Required

| Key | Example |
|-----|---------|
| `REMOTE_HOST` | `192.168.117.144` |
| `REMOTE_USER` | `refluser` |
| `REMOTE_PASSWORD` | `gi5ruS4s=…` |
| `REMOTE_DEPLOY_ROOT` | `/var/www/reflecto-ai` |
| `LOCAL_SOURCE_PATH` | `C:/projects/reflecto-ai` |

### Optional — deployment behaviour

| Key | Default | Notes |
|-----|---------|-------|
| `REMOTE_PORT` | `22` | SSH port |
| `REMOTE_SUDO_PASSWORD` | same as `REMOTE_PASSWORD` | Separate sudo password if different |
| `DEPLOY_COMPOSE_FILE` | `docker-compose.prod.yml` | Compose file name inside release dir |
| `COMPOSE_PROJECT_NAME` | `reflecto-ai` | Docker Compose project name |
| `DEPLOY_REF` | `HEAD` | Git ref to archive when `DEPLOY_USE_GIT_ARCHIVE=true` |
| `DEPLOY_USE_GIT_ARCHIVE` | `true` | `true` = archive from git; `false` = working tree |
| `DEPLOY_INSTALL_DOCKER_IF_MISSING` | `true` | Auto-install Docker on remote if absent |
| `DEPLOY_RETAIN_RELEASES` | `3` | Number of releases to keep (current + N-1 backups) |
| `SSH_STRICT_HOST_KEY_CHECKING` | `accept-new` | SSH host key policy |
| `DEPLOY_INCLUDE_PATHS` | see below | Comma-separated allowlist of paths to package |
| `DEPLOY_LOCAL_EXTRA_PATHS` | see below | Comma-separated local files overlaid after packaging |

### Optional — release notes

`RELEASE_NOTES_ENABLED=true` plus **at least one** LLM API key must be set.
If no key is configured the step is skipped with a WARN and deployment continues.

| Key | Default | Notes |
|-----|---------|-------|
| `RELEASE_NOTES_ENABLED` | `false` | Set to `true` to enable release note generation |
| `RELEASE_NOTES_PREVIOUS_BRANCH` | `main` | Branch to diff current branch against |
| `RELEASE_AGENT_GROQ_API_KEY` | — | Groq API key (free tier available) |
| `RELEASE_AGENT_GEMINI_API_KEY` | — | Google Gemini API key |
| `RELEASE_AGENT_ANTHROPIC_API_KEY` | — | Anthropic Claude API key |

Set whichever provider key you use — at least one is required. The key is injected
as the corresponding env var (`GROQ_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`)
before invoking `tools/release-notes.ps1`, so the agent picks it up automatically.
The LLM provider is configured inside the release agent's own `.env` / `.env.local`.

---

## Payload — What Gets Packaged

### `DEPLOY_USE_GIT_ARCHIVE=true` (default)

The archive is built from a `git archive` of `HEAD` (or `DEPLOY_REF`).
Only committed tracked files are included.

> **Important:** uncommitted local changes are **not** deployed when this is `true`.
> Set `DEPLOY_USE_GIT_ARCHIVE=false` temporarily to deploy working-tree changes.

### `DEPLOY_USE_GIT_ARCHIVE=false`

Packages directly from the working tree, excluding common build artefacts
(`.git`, `node_modules`, `dist`, `.next`, local `.env.*` files, etc.).

### Default included paths (`DEPLOY_INCLUDE_PATHS`)

```
apps/backend
apps/frontend
package.json
package-lock.json
docker-compose.prod.yml
.dockerignore
.npmrc
apps/infra/reflecto-prod-app.conf
```

### Default env file overlays (`DEPLOY_LOCAL_EXTRA_PATHS`)

After the allowlisted payload is built, these local files are copied on top:

```
apps/backend/.env
apps/backend/.env.production
apps/frontend/.env.production
```

These are **not** expected to come from Git. They are copied from your local machine
at deploy time and land in the release at the same relative paths.

---

## Remote Directory Structure

```text
/var/www/reflecto-ai/                          ← REMOTE_DEPLOY_ROOT
  current -> releases/<latest-release>/        ← symlink, always points to live release
  releases/
    prod-<utc-timestamp>-<short-sha>/          ← one directory per deployment
      apps/
        backend/
          .env
          .env.production
          Dockerfile
          src/
        frontend/
          .env.production
          Dockerfile
          app/
      docker-compose.prod.yml
      package.json
      package-lock.json
      .dockerignore
      .npmrc
      apps/infra/reflecto-prod-app.conf
      deployment.log                           ← copy of local log (auto mode only)
      release_notes/                           ← generated by release agent (if configured)
        release_notes_<ver>_<date>_developer.html
        release_notes_<ver>_<date>_developer.md
        release_notes_<ver>_<date>_customer.html
        release_notes_<ver>_<date>_customer.md
```

The `current` symlink is updated **only after** a successful `docker compose up -d --build`.
If the deployment fails before that point, `current` keeps pointing to the previously
live release — no downtime.

### Release name format

```
<environment>-<UTC timestamp>-<short git SHA>
```

Examples:
- `prod-20260501213217-04db0ec`
- `prod-20260406080735-6b892a0`

---

## Deployment Log

Every run overwrites `deployment/deployment.log` locally. Contents:

- **Header** — environment, mode, start time, remote host, branch, commit, release name
- **Per-step entries** — timestamped `INFO` / `WARN` / `ERROR` lines
- **Summary block** — start/end time, duration, remote paths, active symlink, release notes path
- **Post-deployment verification** — steps to confirm the app is live

In `auto` mode the log is also SCP'd to `releases/<release-name>/deployment.log` on the
remote server for a permanent record alongside the deployed code.

Sample success summary:

```
============================================================
DEPLOYMENT SUMMARY
Status        : SUCCESS
Mode          : auto
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
```

---

## Release Notes Generation

Automatically runs after a successful `auto` deployment when `RELEASE_NOTES_ENABLED=true`
and at least one LLM API key is configured in `env.prod`.

**What is generated** — four files saved locally under
`deployment/release_notes/<release-name>/` and published into the frontend app at
`apps/frontend/public/release-notes/` so the in-app release notes viewer can serve them:

| File | Audience |
|------|---------|
| `release_notes_<ver>_<date>_developer.html` | Engineers, QA, Product — full technical detail |
| `release_notes_<ver>_<date>_developer.md` | Same, Markdown format |
| `release_notes_<ver>_<date>_customer.html` | Business users — plain English, no jargon |
| `release_notes_<ver>_<date>_customer.md` | Same, Markdown format |

The agent diffs the current branch against `RELEASE_NOTES_PREVIOUS_BRANCH` (default `main`).
The LLM provider (Groq, Gemini, or Claude) is selected inside the release agent's own
`.env.local` at `C:\projects\nexus-ai\ai-agents\release\.env.local`.

**How `deploy.ps1` calls the agent:**

`deploy.ps1` invokes `tools/release-notes.ps1` — a thin wrapper in this repo that
calls the nexus-ai release agent CLI. No knowledge of venv or Python paths is needed
in `deploy.ps1`; the wrapper owns those internals.

**One-time setup for the release agent:**

```powershell
cd C:\projects\nexus-ai\ai-agents\release
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python.exe -m pip install -e .
```

After setup, you can also run the agent directly for testing:

```powershell
.\tools\release-notes.ps1 run `
  --current-release  feature/kudos-card-enhancements `
  --previous-release main `
  --repos            C:\projects\reflecto-ai `
  --no-approval `
  --output-dir       C:\tmp\release-notes-test
```

---

## Manual Verification on the Remote Server

Production VM:
- Host: `192.168.117.144`
- User: `refluser`
- Deploy root: `/var/www/reflecto-ai`
- Compose project: `reflecto-ai-prod`

```bash
ssh refluser@192.168.117.144
```

> `refluser` is not in the `docker` group — prefix all `docker` commands with `sudo`.

### Check release layout

```bash
cd /var/www/reflecto-ai
ls -lah
ls -lah releases/
readlink -f current
```

### Check running containers

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml ps
```

### Tail container logs

```bash
# Follow both services
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml logs -f

# Last 200 lines from one service
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml logs --tail=200 backend
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml logs --tail=200 frontend
```

### Health checks

```bash
# Backend health endpoint
curl http://127.0.0.1:4000/health
# Expected: {"status":"ok","timestamp":"..."}

# Frontend HTTP response
curl -I http://127.0.0.1:3000
```

### Rebuild and restart manually

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml up -d --build
```

### Bring the stack down

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml down --remove-orphans
```

### Inspect resolved compose config

```bash
cd /var/www/reflecto-ai/current
sudo docker compose -p reflecto-ai-prod -f docker-compose.prod.yml config
```

### Confirm env files exist in current release

```bash
ls -lah /var/www/reflecto-ai/current/apps/backend/.env
ls -lah /var/www/reflecto-ai/current/apps/backend/.env.production
ls -lah /var/www/reflecto-ai/current/apps/frontend/.env.production
```

---

## Operational Notes

- If `DEPLOY_USE_GIT_ARCHIVE=true` (default), only committed files from `HEAD` are deployed.
  Local uncommitted changes are **excluded**.
- To deploy local changes temporarily: set `DEPLOY_USE_GIT_ARCHIVE=false` in `env.prod`,
  deploy, then set it back.
- The `current` symlink is only re-pointed after a successful container start.
  A failed deployment never touches the live release.
- If a deployment fails mid-way, inspect the partial release directory and Docker logs on the VM
  before retrying.
- Old releases beyond `DEPLOY_RETAIN_RELEASES=3` are deleted automatically in `auto` mode.
  In `copy` mode you must clean them up manually or run `auto` on the next deploy.
