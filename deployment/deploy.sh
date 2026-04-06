#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] [INFO] %s\n' "$(date -u +%FT%TZ)" "$*"
}

fail() {
  printf '[%s] [ERROR] %s\n' "$(date -u +%FT%TZ)" "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

escape_squote() {
  printf "%s" "$1" | sed "s/'/'\\\\''/g"
}

split_csv() {
  local raw="$1"
  local -n result_ref="$2"
  result_ref=()
  IFS=',' read -r -a result_ref <<< "$raw"

  for i in "${!result_ref[@]}"; do
    result_ref[$i]="$(printf '%s' "${result_ref[$i]}" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  done
}

normalize_source_path() {
  local value="$1"
  if [[ "$value" =~ ^([A-Za-z]):/(.*)$ ]]; then
    local drive="${BASH_REMATCH[1],,}"
    local remainder="${BASH_REMATCH[2]}"
    printf '/%s/%s\n' "$drive" "$remainder"
    return
  fi

  printf '%s\n' "$value"
}

if [[ $# -ne 1 ]]; then
  fail "Usage: ./deployment/deploy.sh <dev|qa|prod>"
fi

ENVIRONMENT="$1"
case "$ENVIRONMENT" in
  dev|qa|prod) ;;
  *) fail "Environment must be one of: dev, qa, prod" ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/env.$ENVIRONMENT"
[[ -f "$ENV_FILE" ]] || fail "Environment file not found: $ENV_FILE"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

: "${REMOTE_HOST:?REMOTE_HOST is required}"
: "${REMOTE_USER:?REMOTE_USER is required}"
: "${REMOTE_PASSWORD:?REMOTE_PASSWORD is required}"
: "${REMOTE_DEPLOY_ROOT:?REMOTE_DEPLOY_ROOT is required}"
: "${LOCAL_SOURCE_PATH:?LOCAL_SOURCE_PATH is required}"

REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_SUDO_PASSWORD="${REMOTE_SUDO_PASSWORD:-$REMOTE_PASSWORD}"
DEPLOY_COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-reflecto-ai}"
DEPLOY_REF="${DEPLOY_REF:-HEAD}"
DEPLOY_USE_GIT_ARCHIVE="${DEPLOY_USE_GIT_ARCHIVE:-true}"
DEPLOY_INSTALL_DOCKER_IF_MISSING="${DEPLOY_INSTALL_DOCKER_IF_MISSING:-true}"
DEPLOY_RETAIN_RELEASES="${DEPLOY_RETAIN_RELEASES:-3}"
SSH_STRICT_HOST_KEY_CHECKING="${SSH_STRICT_HOST_KEY_CHECKING:-accept-new}"
DEPLOY_INCLUDE_PATHS="${DEPLOY_INCLUDE_PATHS:-apps/backend,apps/frontend,package.json,package-lock.json,docker-compose.prod.yml,.dockerignore,.npmrc,reflecto-prod-app.conf}"
DEPLOY_LOCAL_EXTRA_PATHS="${DEPLOY_LOCAL_EXTRA_PATHS:-apps/backend/.env,apps/backend/.env.production,apps/frontend/.env.production}"

LOCAL_SOURCE_PATH="$(normalize_source_path "$LOCAL_SOURCE_PATH")"
[[ -d "$LOCAL_SOURCE_PATH" ]] || fail "Local source path not found: $LOCAL_SOURCE_PATH"

require_command git
require_command tar
require_command ssh
require_command scp
require_command sshpass

ARTIFACT_ROOT="$(mktemp -d)"
STAGING_ROOT="$ARTIFACT_ROOT/staging"
mkdir -p "$STAGING_ROOT"
KNOWN_HOSTS_FILE="$SCRIPT_DIR/.known_hosts_$ENVIRONMENT"
TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
SHORT_COMMIT="workspace"

cleanup() {
  rm -rf "$ARTIFACT_ROOT"
}
trap cleanup EXIT

if [[ "$DEPLOY_USE_GIT_ARCHIVE" == "true" ]]; then
  git -C "$LOCAL_SOURCE_PATH" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "DEPLOY_USE_GIT_ARCHIVE=true requires LOCAL_SOURCE_PATH to be a Git repository."
  SHORT_COMMIT="$(git -C "$LOCAL_SOURCE_PATH" rev-parse --short "$DEPLOY_REF")"
fi

split_csv "$DEPLOY_INCLUDE_PATHS" INCLUDE_PATHS
split_csv "$DEPLOY_LOCAL_EXTRA_PATHS" LOCAL_EXTRA_PATHS

WORKING_TREE_EXCLUDES=(
  ".git"
  "node_modules"
  ".turbo"
  "apps/backend/node_modules"
  "apps/frontend/node_modules"
  "apps/backend/dist"
  "apps/frontend/dist"
  "apps/frontend/.next"
  "apps/backend/.env.local"
  "apps/frontend/.env.local"
  "apps/backend/.env.development.local"
  "apps/frontend/.env.development.local"
  "apps/backend/.env.test.local"
  "apps/frontend/.env.test.local"
  "apps/backend/.env.production.local"
  "apps/frontend/.env.production.local"
  "deployment/env.dev"
  "deployment/env.qa"
  "deployment/env.prod"
  "deployment/*.tar.gz"
  "nul"
)

RELEASE_NAME="$ENVIRONMENT-$TIMESTAMP-$SHORT_COMMIT"
ARCHIVE_NAME="reflecto-ai-$RELEASE_NAME.tar.gz"
ARCHIVE_PATH="$ARTIFACT_ROOT/$ARCHIVE_NAME"
REMOTE_ARCHIVE_PATH="/tmp/$ARCHIVE_NAME"
PAYLOAD_TAR_PATH="$ARTIFACT_ROOT/payload.tar"

if [[ "$DEPLOY_USE_GIT_ARCHIVE" == "true" ]]; then
  log "Creating allowlisted payload from Git ref '$DEPLOY_REF'."
  TRACKED_INCLUDE_PATHS=()
  for include_path in "${INCLUDE_PATHS[@]}"; do
    if git -C "$LOCAL_SOURCE_PATH" cat-file -e "$DEPLOY_REF:$include_path" 2>/dev/null; then
      TRACKED_INCLUDE_PATHS+=("$include_path")
    else
      log "Skipping non-tracked path from Git archive: $include_path"
    fi
  done

  [[ ${#TRACKED_INCLUDE_PATHS[@]} -gt 0 ]] || fail "No tracked deployment paths were found for DEPLOY_INCLUDE_PATHS."
  git -C "$LOCAL_SOURCE_PATH" archive --format=tar --output="$PAYLOAD_TAR_PATH" "$DEPLOY_REF" -- "${TRACKED_INCLUDE_PATHS[@]}"
else
  log "Creating allowlisted payload from working tree '$LOCAL_SOURCE_PATH'."
  TAR_EXCLUDE_ARGS=()
  for exclude_path in "${WORKING_TREE_EXCLUDES[@]}"; do
    TAR_EXCLUDE_ARGS+=( "--exclude=$exclude_path" )
  done
  tar "${TAR_EXCLUDE_ARGS[@]}" -cf "$PAYLOAD_TAR_PATH" -C "$LOCAL_SOURCE_PATH" "${INCLUDE_PATHS[@]}"
fi

tar -xf "$PAYLOAD_TAR_PATH" -C "$STAGING_ROOT"

for extra_path in "${LOCAL_EXTRA_PATHS[@]}"; do
  if [[ -e "$LOCAL_SOURCE_PATH/$extra_path" ]]; then
    log "Overlaying local deployment file: $extra_path"
    mkdir -p "$STAGING_ROOT/$(dirname "$extra_path")"
    cp -R "$LOCAL_SOURCE_PATH/$extra_path" "$STAGING_ROOT/$extra_path"
  fi
done

tar -czf "$ARCHIVE_PATH" -C "$STAGING_ROOT" .
[[ -f "$ARCHIVE_PATH" ]] || fail "Deployment archive was not created."

log "Uploading archive to $REMOTE_HOST."
SSHPASS="$REMOTE_PASSWORD" sshpass -e scp \
  -o "StrictHostKeyChecking=$SSH_STRICT_HOST_KEY_CHECKING" \
  -o "UserKnownHostsFile=$KNOWN_HOSTS_FILE" \
  -P "$REMOTE_PORT" \
  "$ARCHIVE_PATH" \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_ARCHIVE_PATH"

REMOTE_SCRIPT="$(cat <<EOF
set -euo pipefail

log() {
  printf '[%s] %s\n' "\$(date -u +%FT%TZ)" "\$*"
}

fail() {
  log "ERROR: \$*"
  exit 1
}

run_sudo() {
  if [ "\$(id -u)" -eq 0 ]; then
    "\$@"
  else
    printf '%s\n' '$(escape_squote "$REMOTE_SUDO_PASSWORD")' | sudo -S -p '' "\$@"
  fi
}

run_compose() {
  local action="\$1"
  run_sudo sh -lc "cd \"\$RELEASE_DIR\" && docker compose -p \"\$COMPOSE_PROJECT_NAME\" -f \"\$COMPOSE_FILE\" \$action"
}

ensure_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    run_sudo systemctl enable --now docker >/dev/null 2>&1 || true
    return 0
  fi

  if [ "\$INSTALL_DOCKER_IF_MISSING" != "true" ]; then
    fail "Docker or docker compose is not installed on the remote host."
  fi

  log "Docker not detected. Installing Docker Engine and compose plugin."

  if command -v dnf >/dev/null 2>&1; then
    run_sudo dnf install -y dnf-plugins-core
    run_sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    run_sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  elif command -v yum >/dev/null 2>&1; then
    run_sudo yum install -y yum-utils
    run_sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    run_sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  elif command -v apt-get >/dev/null 2>&1; then
    run_sudo apt-get update
    run_sudo apt-get install -y ca-certificates curl gnupg
    run_sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /tmp/docker.gpg.asc
    run_sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg /tmp/docker.gpg.asc
    run_sudo chmod a+r /etc/apt/keyrings/docker.gpg
    . /etc/os-release
    printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/%s %s stable\n' "\$(dpkg --print-architecture)" "\${ID}" "\${VERSION_CODENAME}" | run_sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    run_sudo apt-get update
    run_sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    rm -f /tmp/docker.gpg.asc
  else
    fail "Unsupported Linux distribution for automatic Docker installation."
  fi

  run_sudo systemctl enable --now docker
}

cleanup_old_releases() {
  if [ "\$RETAIN_RELEASES" -le 0 ] 2>/dev/null; then
    return 0
  fi

  mapfile -t old_releases < <(find "\$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk 'NR>'"\$RETAIN_RELEASES"' {print \$2}')
  for old_release in "\${old_releases[@]}"; do
    [ -z "\$old_release" ] && continue
    [ "\$old_release" = "\$RELEASE_DIR" ] && continue
    log "Removing old release \$old_release"
    run_sudo rm -rf "\$old_release"
  done
}

REMOTE_DEPLOY_ROOT='$(escape_squote "$REMOTE_DEPLOY_ROOT")'
RELEASES_DIR="\$REMOTE_DEPLOY_ROOT/releases"
CURRENT_LINK="\$REMOTE_DEPLOY_ROOT/current"
RELEASE_NAME='$(escape_squote "$RELEASE_NAME")'
RELEASE_DIR="\$RELEASES_DIR/\$RELEASE_NAME"
REMOTE_ARCHIVE_PATH='$(escape_squote "$REMOTE_ARCHIVE_PATH")'
COMPOSE_FILE='$(escape_squote "$DEPLOY_COMPOSE_FILE")'
COMPOSE_PROJECT_NAME='$(escape_squote "$COMPOSE_PROJECT_NAME")'
INSTALL_DOCKER_IF_MISSING='$(escape_squote "$DEPLOY_INSTALL_DOCKER_IF_MISSING")'
RETAIN_RELEASES='$(escape_squote "$DEPLOY_RETAIN_RELEASES")'
REMOTE_USER_NAME='$(escape_squote "$REMOTE_USER")'

log "Ensuring deployment directories exist at \$REMOTE_DEPLOY_ROOT"
run_sudo mkdir -p "\$RELEASES_DIR"
run_sudo mkdir -p "\$RELEASE_DIR"
run_sudo tar -xzf "\$REMOTE_ARCHIVE_PATH" -C "\$RELEASE_DIR"
run_sudo test -f "\$RELEASE_DIR/\$COMPOSE_FILE" || fail "Compose file not found at \$RELEASE_DIR/\$COMPOSE_FILE"
run_sudo chown -R "\$REMOTE_USER_NAME:\$REMOTE_USER_NAME" "\$RELEASE_DIR" >/dev/null 2>&1 || true

ensure_docker

log "Validating docker compose configuration"
run_compose "config -q"

log "Building and starting containers"
run_compose "up -d --build"
run_sudo ln -sfn "\$RELEASE_DIR" "\$CURRENT_LINK"
run_sudo chown -h "\$REMOTE_USER_NAME:\$REMOTE_USER_NAME" "\$CURRENT_LINK" >/dev/null 2>&1 || true

log "Current deployment status"
run_compose "ps"

run_sudo rm -f "\$REMOTE_ARCHIVE_PATH"
cleanup_old_releases

log "Deployment completed successfully."
EOF
)"

log "Executing remote deployment."
printf '%s\n' "$REMOTE_SCRIPT" | SSHPASS="$REMOTE_PASSWORD" sshpass -e ssh \
  -o "StrictHostKeyChecking=$SSH_STRICT_HOST_KEY_CHECKING" \
  -o "UserKnownHostsFile=$KNOWN_HOSTS_FILE" \
  -p "$REMOTE_PORT" \
  "$REMOTE_USER@$REMOTE_HOST" \
  "bash -s"

log "Deployment flow finished for '$ENVIRONMENT'."
