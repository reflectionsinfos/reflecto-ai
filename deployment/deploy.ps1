[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Position = 0)]
  [ValidateSet("dev", "qa", "prod")]
  [string]$Environment = "prod",

  [Parameter(Position = 1)]
  [ValidateSet("auto", "copy", "manual", "rollback")]
  [string]$Mode = "auto"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================
#  Helper functions
# ============================================================

function Write-Log {
  param(
    [Parameter(Mandatory = $true)] [string]$Message,
    [ValidateSet("INFO", "WARN", "ERROR")] [string]$Level = "INFO"
  )
  $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $line = "[$timestamp] [$Level] $Message"
  Write-Host $line
  if ($script:logPath) {
    Add-Content -LiteralPath $script:logPath -Value $line -Encoding UTF8
  }
}

function Load-EnvFile {
  param([Parameter(Mandatory = $true)] [string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { throw "Environment file not found: $Path" }
  $config = @{}
  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#")) { continue }
    $sep = $line.IndexOf("=")
    if ($sep -lt 1) { throw "Invalid config line in ${Path}: $rawLine" }
    $key   = $line.Substring(0, $sep).Trim()
    $value = $line.Substring($sep + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $config[$key] = $value
  }
  return $config
}

function Get-ConfigValue {
  param(
    [Parameter(Mandatory = $true)] [hashtable]$Config,
    [Parameter(Mandatory = $true)] [string]$Key,
    [AllowNull()] [string]$Default = $null
  )
  if ($Config.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace([string]$Config[$Key])) {
    return [string]$Config[$Key]
  }
  return $Default
}

function Get-ConfigList {
  param(
    [Parameter(Mandatory = $true)] [hashtable]$Config,
    [Parameter(Mandatory = $true)] [string]$Key,
    [Parameter(Mandatory = $true)] [string[]]$Default
  )
  $rawValue = Get-ConfigValue -Config $Config -Key $Key
  if ([string]::IsNullOrWhiteSpace($rawValue)) { return $Default }
  return @($rawValue.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Assert-RequiredConfig {
  param(
    [Parameter(Mandatory = $true)] [hashtable]$Config,
    [Parameter(Mandatory = $true)] [string[]]$Keys
  )
  foreach ($key in $Keys) {
    if (-not $Config.ContainsKey($key) -or [string]::IsNullOrWhiteSpace([string]$Config[$key])) {
      throw "Missing required config key '$key'."
    }
  }
}

function Escape-BashSingleQuoted {
  param([Parameter(Mandatory = $true)] [string]$Value)
  return $Value.Replace("'", "'""'""'")
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)] [string]$FilePath,
    [Parameter(Mandatory = $true)] [string[]]$Arguments
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Command failed: $FilePath $($Arguments -join ' ')" }
}

function New-DirectoryIfMissing {
  param([Parameter(Mandatory = $true)] [string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { [void](New-Item -ItemType Directory -Path $Path -Force) }
}

function Move-ExistingDeploymentLog {
  param([Parameter(Mandatory = $true)] [string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) { return }

  $existingLog = Get-Item -LiteralPath $Path
  if ($existingLog.Length -eq 0) { return }

  $content = Get-Content -LiteralPath $Path -Raw
  $environment = "unknown"
  $startTimestamp = $existingLog.LastWriteTimeUtc.ToString("yyyyMMddHHmmss")

  $environmentMatch = [regex]::Match($content, "(?m)^Environment\s*:\s*(.+?)\s*$")
  if ($environmentMatch.Success) {
    $environment = $environmentMatch.Groups[1].Value.Trim()
  }

  $startTimeMatch = [regex]::Match($content, "(?m)^Start Time\s*:\s*(.+?)\s*$")
  if ($startTimeMatch.Success) {
    $parsedStart = [datetimeoffset]::MinValue
    if ([datetimeoffset]::TryParse($startTimeMatch.Groups[1].Value.Trim(), [ref]$parsedStart)) {
      $startTimestamp = $parsedStart.UtcDateTime.ToString("yyyyMMddHHmmss")
    } else {
      $startTimestamp = ($startTimeMatch.Groups[1].Value.Trim() -replace "[^0-9A-Za-z_-]", "")
      if ([string]::IsNullOrWhiteSpace($startTimestamp)) {
        $startTimestamp = $existingLog.LastWriteTimeUtc.ToString("yyyyMMddHHmmss")
      }
    }
  }

  $safeEnvironment = $environment -replace "[^0-9A-Za-z_-]", "-"
  if ([string]::IsNullOrWhiteSpace($safeEnvironment)) { $safeEnvironment = "unknown" }

  $directory = Split-Path -Parent $Path
  $archivePath = Join-Path $directory "deployment-$safeEnvironment-$startTimestamp.log"
  $suffix = 1
  while (Test-Path -LiteralPath $archivePath) {
    $archivePath = Join-Path $directory "deployment-$safeEnvironment-$startTimestamp-$suffix.log"
    $suffix++
  }

  Move-Item -LiteralPath $Path -Destination $archivePath
}

function Test-GitPathExists {
  param(
    [Parameter(Mandatory = $true)] [string]$GitCommand,
    [Parameter(Mandatory = $true)] [string]$RepositoryPath,
    [Parameter(Mandatory = $true)] [string]$Ref,
    [Parameter(Mandatory = $true)] [string]$RelativePath
  )
  & $GitCommand -C $RepositoryPath cat-file -e "${Ref}:$RelativePath" 2>$null
  return $LASTEXITCODE -eq 0
}

function Copy-PathToStaging {
  param(
    [Parameter(Mandatory = $true)] [string]$SourceRoot,
    [Parameter(Mandatory = $true)] [string]$RelativePath,
    [Parameter(Mandatory = $true)] [string]$DestinationRoot
  )
  $sourcePath = Join-Path $SourceRoot $RelativePath
  if (-not (Test-Path -LiteralPath $sourcePath)) { return }
  $destinationPath   = Join-Path $DestinationRoot $RelativePath
  $destinationParent = Split-Path -Parent $destinationPath
  if ($destinationParent) { New-DirectoryIfMissing -Path $destinationParent }
  if ((Get-Item -LiteralPath $sourcePath).PSIsContainer) {
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse -Force
  } else {
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
  }
}

# Resolves __PLACEHOLDER__ tokens in a remote bash script template.
function Resolve-RemoteScript {
  param([string]$Template)
  $t = $Template
  $t = $t.Replace("__REMOTE_SUDO_PASSWORD__",    [string](Escape-BashSingleQuoted -Value $script:remoteSudoPassword))
  $t = $t.Replace("__REMOTE_DEPLOY_ROOT__",      [string](Escape-BashSingleQuoted -Value $script:remoteDeployRoot))
  $t = $t.Replace("__RELEASE_NAME__",            [string](Escape-BashSingleQuoted -Value $script:releaseName))
  $t = $t.Replace("__REMOTE_ARCHIVE_PATH__",     [string](Escape-BashSingleQuoted -Value $script:remoteArchivePath))
  $t = $t.Replace("__COMPOSE_FILE__",            [string](Escape-BashSingleQuoted -Value $script:composeFile))
  $t = $t.Replace("__COMPOSE_PROJECT_NAME__",    [string](Escape-BashSingleQuoted -Value $script:composeProjectName))
  $t = $t.Replace("__INSTALL_DOCKER_IF_MISSING__",[string](Escape-BashSingleQuoted -Value $script:installDockerIfMissing))
  $t = $t.Replace("__RETAIN_RELEASES__",         [string]$script:releaseRetention)
  $t = $t.Replace("__REMOTE_USER_NAME__",        [string](Escape-BashSingleQuoted -Value $script:remoteUser))
  return $t
}

# Prints a fully copy-paste-ready step-by-step guide. Used by 'manual' mode and
# appended to output after 'copy' mode completes extraction.
function Write-ActivationSteps {
  param(
    [string]$Heading = "ACTIVATION STEPS (run on remote server)"
  )
  $rel  = $script:releaseName
  $root = $script:remoteDeployRoot
  $cf   = $script:composeFile
  $proj = $script:composeProjectName
  $host = $script:remoteHost
  $user = $script:remoteUser
  $port = $script:remotePort
  $arc  = $script:remoteArchivePath
  $releaseDir = "$root/releases/$rel"
  $sep  = "-" * 60

  $block = @"

============================================================
  $Heading
  Release : $rel
  Dir     : $releaseDir
============================================================

  SSH into the server:
    ssh ${user}@${host} -p $port

  $sep
  STEP 1 - Stop and remove existing containers
  $sep
    sudo docker compose -p $proj -f $cf down --remove-orphans
    sudo docker rm -f reflecto-backend-prod reflecto-frontend-prod 2>/dev/null || true

  STEP 2 - Build and start new containers
  $sep
    cd $releaseDir
    sudo docker compose -p $proj -f $cf up -d --build

  STEP 3 - Verify containers are running
  $sep
    sudo docker compose -p $proj -f $cf ps

  STEP 4 - Switch active symlink
  $sep
    sudo ln -sfn $releaseDir $root/current

  STEP 5 - Cleanup
  $sep
    sudo rm -f $arc

============================================================
"@
  Write-Host $block -ForegroundColor Cyan
  if ($script:logPath) {
    Add-Content -LiteralPath $script:logPath -Value $block -Encoding UTF8
  }
}

function Write-ManualGuide {
  param([string[]]$TrackedPaths)

  $rel    = $script:releaseName
  $arc    = $script:archiveName
  $src    = $script:localSourcePath
  $root   = $script:remoteDeployRoot
  $cf     = $script:composeFile
  $proj   = $script:composeProjectName
  $host   = $script:remoteHost
  $user   = $script:remoteUser
  $port   = $script:remotePort
  $remArc = $script:remoteArchivePath
  $retain = $script:releaseRetention

  $releaseDir = "$root/releases/$rel"
  $pathsArg   = $TrackedPaths -join " "
  $sep        = "-" * 60

  $extraOverlays = ($script:localExtraPaths | ForEach-Object {
    $winPath = $_ -replace '/', '\'
    "    copy /Y `"$src\$winPath`" `"`$staging\$winPath`""
  }) -join "`n"

  $guide = @"

============================================================
  MANUAL DEPLOYMENT GUIDE
  Environment : $Environment
  Release     : $rel
  Archive     : $arc
  Remote      : ${user}@${host}:${port}
  Deploy Root : $root
============================================================

  STEP 1 - Create deployment archive  [local - PowerShell]
  $sep
    `$staging = "`$env:TEMP\staging-$rel"
    git -C "$src" archive --format=tar --output="`$env:TEMP\payload-$rel.tar" HEAD -- $pathsArg
    New-Item -ItemType Directory -Force -Path `$staging | Out-Null
    tar -xf "`$env:TEMP\payload-$rel.tar" -C `$staging
    # Overlay env / secrets files:
$extraOverlays
    tar -czf "`$env:TEMP\$arc" -C `$staging .
    # Cleanup staging:
    Remove-Item -Recurse -Force `$staging
    Remove-Item "`$env:TEMP\payload-$rel.tar"

  STEP 2 - Upload archive to remote server  [local - PowerShell]
  $sep
    scp -P $port "`$env:TEMP\$arc" ${user}@${host}:$remArc

  STEP 3 - SSH into remote server  [local]
  $sep
    ssh ${user}@${host} -p $port

  STEP 4 - Create release directory and extract  [remote]
  $sep
    sudo mkdir -p $releaseDir
    sudo tar -xzf $remArc -C $releaseDir
    sudo chown -R ${user}:${user} $releaseDir

  STEP 5 - Validate Docker Compose configuration  [remote]
  $sep
    cd $releaseDir
    sudo docker compose -p $proj -f $cf config -q

  STEP 6 - Stop and remove existing containers  [remote]
  $sep
    sudo docker compose -p $proj -f $cf down --remove-orphans
    sudo docker rm -f reflecto-backend-prod reflecto-frontend-prod 2>/dev/null || true

  STEP 7 - Build and start new containers  [remote]
  $sep
    cd $releaseDir
    sudo docker compose -p $proj -f $cf up -d --build

  STEP 8 - Verify containers are running  [remote]
  $sep
    sudo docker compose -p $proj -f $cf ps

  STEP 9 - Activate: switch current symlink  [remote]
  $sep
    sudo ln -sfn $releaseDir $root/current

  STEP 10 - Cleanup archive  [remote]
  $sep
    sudo rm -f $remArc

  STEP 11 - Remove old releases, keep last $retain  [remote]
  $sep
    ls -1t $root/releases/ | tail -n +$($retain + 1) | xargs -I{} sudo rm -rf "$root/releases/{}"

  STEP 12 - Post-deployment verification
  $sep
    Open  : https://reflecto-ai.onreflections.com/
    Action: Sign in with Reflections SSO and verify the app loads correctly.

============================================================
"@
  Write-Host $guide -ForegroundColor Cyan
  if ($script:logPath) {
    Add-Content -LiteralPath $script:logPath -Value $guide -Encoding UTF8
  }
}

# ============================================================
#  Remote bash script templates
#
#  Three pieces assembled per mode:
#    auto   = $remoteCommon + $remoteExtractBody + $remoteActivateBody
#    copy   = $remoteCommon + $remoteExtractBody
#    rollback = $remoteRollbackBody  (standalone, no common header needed)
# ============================================================

# Shared bash helpers + variable declarations. Used by both auto and copy.
$remoteCommon = @'
set -euo pipefail

log()  { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

run_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    printf '%s\n' '__REMOTE_SUDO_PASSWORD__' | sudo -S -p '' "$@"
  fi
}

run_compose() {
  local action="$1"
  run_sudo sh -lc "cd \"$RELEASE_DIR\" && docker compose -p \"$COMPOSE_PROJECT_NAME\" -f \"$COMPOSE_FILE\" $action"
}

ensure_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    run_sudo systemctl enable --now docker >/dev/null 2>&1 || true
    return 0
  fi
  if [ "$INSTALL_DOCKER_IF_MISSING" != "true" ]; then
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
    printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/%s %s stable\n' \
      "$(dpkg --print-architecture)" "${ID}" "${VERSION_CODENAME}" | \
      run_sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    run_sudo apt-get update
    run_sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    rm -f /tmp/docker.gpg.asc
  else
    fail "Unsupported Linux distribution for automatic Docker installation."
  fi
  run_sudo systemctl enable --now docker
}

REMOTE_DEPLOY_ROOT='__REMOTE_DEPLOY_ROOT__'
RELEASES_DIR="$REMOTE_DEPLOY_ROOT/releases"
CURRENT_LINK="$REMOTE_DEPLOY_ROOT/current"
RELEASE_NAME='__RELEASE_NAME__'
RELEASE_DIR="$RELEASES_DIR/$RELEASE_NAME"
REMOTE_ARCHIVE_PATH='__REMOTE_ARCHIVE_PATH__'
COMPOSE_FILE='__COMPOSE_FILE__'
COMPOSE_PROJECT_NAME='__COMPOSE_PROJECT_NAME__'
INSTALL_DOCKER_IF_MISSING='__INSTALL_DOCKER_IF_MISSING__'
RETAIN_RELEASES='__RETAIN_RELEASES__'
REMOTE_USER_NAME='__REMOTE_USER_NAME__'
'@

# Phase 1: unpack archive, install docker if needed, validate compose.
# Runs in both 'auto' and 'copy' modes.
$remoteExtractBody = @'

log "Ensuring release directory at $RELEASE_DIR"
run_sudo mkdir -p "$RELEASES_DIR"
run_sudo mkdir -p "$RELEASE_DIR"
run_sudo tar -xzf "$REMOTE_ARCHIVE_PATH" -C "$RELEASE_DIR"
run_sudo test -f "$RELEASE_DIR/$COMPOSE_FILE" || fail "Compose file not found at $RELEASE_DIR/$COMPOSE_FILE"
run_sudo chown -R "${REMOTE_USER_NAME}:${REMOTE_USER_NAME}" "$RELEASE_DIR" >/dev/null 2>&1 || true

ensure_docker

log "Validating Docker Compose configuration"
run_compose "config -q"

log "Release extracted and validated: $RELEASE_DIR"
'@

# Phase 2: docker down/up, symlink switch, cleanup old releases.
# Only appended in 'auto' mode. In 'copy' mode the user runs these manually.
$remoteActivateBody = @'

cleanup_old_releases() {
  if [ "$RETAIN_RELEASES" -le 0 ] 2>/dev/null; then return 0; fi
  mapfile -t old_releases < <(
    find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' |
    sort -nr | awk 'NR>'"$RETAIN_RELEASES"' {print $2}'
  )
  for old_release in "${old_releases[@]}"; do
    [ -z "$old_release" ] && continue
    [ "$old_release" = "$RELEASE_DIR" ] && continue
    log "Removing old release $old_release"
    run_sudo rm -rf "$old_release"
  done
}

log "Stopping existing containers"
run_compose "down --remove-orphans" || true
run_sudo docker rm -f reflecto-backend-prod reflecto-frontend-prod >/dev/null 2>&1 || true

log "Building and starting containers"
run_compose "up -d --build"
run_sudo ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
run_sudo chown -h "${REMOTE_USER_NAME}:${REMOTE_USER_NAME}" "$CURRENT_LINK" >/dev/null 2>&1 || true

log "Current deployment status"
run_compose "ps"

run_sudo rm -f "$REMOTE_ARCHIVE_PATH"
cleanup_old_releases

log "Deployment completed successfully."
'@

# Standalone rollback script: lists releases, re-points current symlink.
$remoteRollbackScript = @'
set -euo pipefail

log()  { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

run_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    printf '%s\n' '__REMOTE_SUDO_PASSWORD__' | sudo -S -p '' "$@"
  fi
}

REMOTE_DEPLOY_ROOT='__REMOTE_DEPLOY_ROOT__'
RELEASES_DIR="$REMOTE_DEPLOY_ROOT/releases"
CURRENT_LINK="$REMOTE_DEPLOY_ROOT/current"
COMPOSE_FILE='__COMPOSE_FILE__'
COMPOSE_PROJECT_NAME='__COMPOSE_PROJECT_NAME__'
REMOTE_USER_NAME='__REMOTE_USER_NAME__'

run_compose() {
  local dir="$1" action="$2"
  run_sudo sh -lc "cd \"$dir\" && docker compose -p \"$COMPOSE_PROJECT_NAME\" -f \"$COMPOSE_FILE\" $action"
}

log "Available releases (newest first):"
mapfile -t releases < <(
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk '{print $2}'
)
for i in "${!releases[@]}"; do
  label=""
  current_target=$(readlink "$CURRENT_LINK" 2>/dev/null || true)
  [ "${releases[$i]}" = "$current_target" ] && label=" <-- current"
  printf '  [%d] %s%s\n' "$i" "$(basename "${releases[$i]}")" "$label"
done

[ "${#releases[@]}" -lt 2 ] && fail "No previous release available to roll back to."

previous_release="${releases[1]}"
log "Rolling back to: $(basename "$previous_release")"

log "Stopping current containers"
current_target=$(readlink "$CURRENT_LINK" 2>/dev/null || true)
if [ -n "$current_target" ] && [ -d "$current_target" ]; then
  run_compose "$current_target" "down --remove-orphans" || true
fi

log "Starting previous release"
run_compose "$previous_release" "up -d"

run_sudo ln -sfn "$previous_release" "$CURRENT_LINK"
run_sudo chown -h "${REMOTE_USER_NAME}:${REMOTE_USER_NAME}" "$CURRENT_LINK" >/dev/null 2>&1 || true

log "Rollback complete. Active release: $(basename "$previous_release")"
run_compose "$previous_release" "ps"
'@

# ============================================================
#  Configuration loading
# ============================================================

$scriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:logPath = Join-Path $scriptDir "deployment.log"
Move-ExistingDeploymentLog -Path $script:logPath
[System.IO.File]::WriteAllText($script:logPath, "", [System.Text.Encoding]::UTF8)

$envFilePath = Join-Path $scriptDir "env.$Environment"
$config      = Load-EnvFile -Path $envFilePath

Assert-RequiredConfig -Config $config -Keys @(
  "REMOTE_HOST", "REMOTE_USER", "REMOTE_PASSWORD", "REMOTE_DEPLOY_ROOT", "LOCAL_SOURCE_PATH"
)

$script:remoteHost             = Get-ConfigValue -Config $config -Key "REMOTE_HOST"
$script:remotePort             = Get-ConfigValue -Config $config -Key "REMOTE_PORT" -Default "22"
$script:remoteUser             = Get-ConfigValue -Config $config -Key "REMOTE_USER"
$script:remotePassword         = Get-ConfigValue -Config $config -Key "REMOTE_PASSWORD"
$script:remoteSudoPassword     = Get-ConfigValue -Config $config -Key "REMOTE_SUDO_PASSWORD" -Default $script:remotePassword
$script:remoteDeployRoot       = Get-ConfigValue -Config $config -Key "REMOTE_DEPLOY_ROOT"
$script:localSourcePath        = [System.IO.Path]::GetFullPath((Get-ConfigValue -Config $config -Key "LOCAL_SOURCE_PATH"))
$script:composeFile            = Get-ConfigValue -Config $config -Key "DEPLOY_COMPOSE_FILE"    -Default "docker-compose.prod.yml"
$script:composeProjectName     = Get-ConfigValue -Config $config -Key "COMPOSE_PROJECT_NAME"   -Default "reflecto-ai"
$deployRef                     = Get-ConfigValue -Config $config -Key "DEPLOY_REF"             -Default "HEAD"
$useGitArchive                 = (Get-ConfigValue -Config $config -Key "DEPLOY_USE_GIT_ARCHIVE" -Default "true").ToLowerInvariant()
$script:installDockerIfMissing = (Get-ConfigValue -Config $config -Key "DEPLOY_INSTALL_DOCKER_IF_MISSING" -Default "true").ToLowerInvariant()
$retainReleases                = Get-ConfigValue -Config $config -Key "DEPLOY_RETAIN_RELEASES" -Default "3"
$releaseAgentDir               = Get-ConfigValue -Config $config -Key "RELEASE_AGENT_DIR"      -Default "C:\projects\nexus-ai\ai-agents\release"
$releaseNotesPreviousBranch    = Get-ConfigValue -Config $config -Key "RELEASE_NOTES_PREVIOUS_BRANCH" -Default "main"
$releaseAgentGroqKey           = Get-ConfigValue -Config $config -Key "RELEASE_AGENT_GROQ_API_KEY"
$strictHostKeyChecking         = Get-ConfigValue -Config $config -Key "SSH_STRICT_HOST_KEY_CHECKING" -Default "accept-new"

$script:localExtraPaths = Get-ConfigList -Config $config -Key "DEPLOY_LOCAL_EXTRA_PATHS" -Default @(
  "apps/backend/.env",
  "apps/backend/.env.production",
  "apps/frontend/.env.production"
)
$includePaths = Get-ConfigList -Config $config -Key "DEPLOY_INCLUDE_PATHS" -Default @(
  "apps/backend",
  "apps/frontend",
  "package.json",
  "package-lock.json",
  "docker-compose.prod.yml",
  ".dockerignore",
  ".npmrc",
  "apps/infra/reflecto-prod-app.conf"
)
$workingTreeExcludes = @(
  ".git", "node_modules", ".turbo",
  "apps/backend/node_modules",  "apps/frontend/node_modules",
  "apps/backend/dist",          "apps/frontend/dist",
  "apps/frontend/.next",
  "apps/backend/.env.local",                "apps/frontend/.env.local",
  "apps/backend/.env.development.local",    "apps/frontend/.env.development.local",
  "apps/backend/.env.test.local",           "apps/frontend/.env.test.local",
  "apps/backend/.env.production.local",     "apps/frontend/.env.production.local",
  "deployment/env.dev", "deployment/env.qa", "deployment/env.prod",
  "deployment/*.tar.gz", "nul"
)

if (-not (Test-Path -LiteralPath $script:localSourcePath)) {
  throw "Local source path not found: $script:localSourcePath"
}

[int]$parsedPort = 0
if (-not [int]::TryParse($script:remotePort, [ref]$parsedPort)) {
  throw "REMOTE_PORT must be a valid integer. Got: $script:remotePort"
}

[int]$script:releaseRetention = 0
if (-not [int]::TryParse($retainReleases, [ref]$script:releaseRetention)) {
  throw "DEPLOY_RETAIN_RELEASES must be a valid integer. Got: $retainReleases"
}

$gitCommand = (Get-Command git      -ErrorAction Stop).Source
$sshCommand = (Get-Command ssh.exe  -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $sshCommand) { $sshCommand = (Get-Command ssh  -ErrorAction Stop).Source }
$scpCommand = (Get-Command scp.exe  -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $scpCommand) { $scpCommand = (Get-Command scp  -ErrorAction Stop).Source }
$tarCommand = (Get-Command tar.exe  -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $tarCommand) { $tarCommand = (Get-Command tar  -ErrorAction Stop).Source }

# Resolve commit / branch for all modes that need a release name.
$timestamp     = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$shortCommit   = "workspace"
$currentBranch = "N/A"

if ($Mode -ne "rollback") {
  if ($useGitArchive -eq "true") {
    $insideWorkTree = (& $gitCommand -C $script:localSourcePath rev-parse --is-inside-work-tree).Trim()
    if ($LASTEXITCODE -ne 0 -or $insideWorkTree -ne "true") {
      throw "DEPLOY_USE_GIT_ARCHIVE=true requires LOCAL_SOURCE_PATH to be a Git repository."
    }
    $shortCommit = (& $gitCommand -C $script:localSourcePath rev-parse --short $deployRef).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($shortCommit)) {
      throw "Unable to resolve DEPLOY_REF '$deployRef'."
    }
    $branchOut = (& $gitCommand -C $script:localSourcePath rev-parse --abbrev-ref HEAD 2>$null).Trim()
    if (-not [string]::IsNullOrEmpty($branchOut)) { $currentBranch = $branchOut }
  }
}

$script:releaseName       = "$Environment-$timestamp-$shortCommit"
$script:archiveName       = "reflecto-ai-$($script:releaseName).tar.gz"
$script:remoteArchivePath = "/tmp/$($script:archiveName)"
$knownHostsPath           = Join-Path $scriptDir ".known_hosts_$Environment"

$logHeader = @"
============================================================
REFLECTO-AI DEPLOYMENT LOG
============================================================
Environment  : $Environment
Mode         : $Mode
Start Time   : $((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
Remote Host  : $($script:remoteUser)@$($script:remoteHost):$($script:remotePort)
Deploy Root  : $($script:remoteDeployRoot)
Releases Dir : $($script:remoteDeployRoot)/releases
Active Link  : $($script:remoteDeployRoot)/current
Deploy Ref   : $deployRef
Branch       : $currentBranch
Commit       : $shortCommit
Release Name : $($script:releaseName)
Compose File : $($script:composeFile)
Source Path  : $($script:localSourcePath)
Retain Rel.  : $($script:releaseRetention)
============================================================
"@
Add-Content -LiteralPath $script:logPath -Value $logHeader -Encoding UTF8

# ============================================================
#  No-argument confirmation prompt
#  When the script is invoked with no arguments both parameters
#  fall back to their defaults (prod / auto). Show the user what
#  is about to happen and require explicit Y before continuing.
# ============================================================
if ($PSBoundParameters.Count -eq 0) {
  $displayBranch = if ($currentBranch -ne "N/A") { $currentBranch } else { "(unknown branch)" }
  $displayCommit = if ($shortCommit   -ne "workspace") { " @ $shortCommit" } else { "" }

  Write-Host ""
  Write-Host "  No arguments supplied - using defaults." -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "  About to deploy:" -ForegroundColor Yellow
  Write-Host "    Branch  : $displayBranch$displayCommit"   -ForegroundColor Cyan
  Write-Host "    Server  : $($script:remoteUser)@$($script:remoteHost)"  -ForegroundColor Cyan
  Write-Host "    Path    : $($script:remoteDeployRoot)"    -ForegroundColor Cyan
  Write-Host "    Mode    : $Mode"                           -ForegroundColor Cyan
  Write-Host ""

  $answer = Read-Host "  Proceed? [Y/N]"
  if ($answer -notmatch '^[Yy]$') {
    Write-Host ""
    Write-Host "  Deployment cancelled." -ForegroundColor DarkYellow
    Write-Host ""
    exit 0
  }
  Write-Host ""
}

# ============================================================
#  Main execution
# ============================================================
$deploymentStart   = Get-Date
$deploymentSuccess = $false
$artifactRoot      = $null
$askPassPath       = $null

try {

  # ----------------------------------------------------------
  #  MANUAL - print guide, do nothing on remote
  # ----------------------------------------------------------
  if ($Mode -eq "manual") {

    $trackedPaths = @()
    if ($useGitArchive -eq "true") {
      foreach ($p in $includePaths) {
        if (Test-GitPathExists -GitCommand $gitCommand -RepositoryPath $script:localSourcePath -Ref $deployRef -RelativePath $p) {
          $trackedPaths += $p
        }
      }
    } else {
      $trackedPaths = $includePaths
    }

    Write-ManualGuide -TrackedPaths $trackedPaths
    $deploymentSuccess = $true

  # ----------------------------------------------------------
  #  ROLLBACK / AUTO / COPY - interact with the remote server
  # ----------------------------------------------------------
  } elseif ($PSCmdlet.ShouldProcess("$($script:remoteUser)@$($script:remoteHost)", "[$Mode] $($script:releaseName)")) {

    # ---- SSH askpass setup (shared by all remote modes) ----
    $askPassPath = Join-Path $env:TEMP "reflecto-ssh-askpass-$PID.cmd"
    $askPassScript = "@echo off`r`nsetlocal EnableDelayedExpansion`r`necho(!DEPLOY_SSH_PASSWORD!"
    [System.IO.File]::WriteAllText($askPassPath, $askPassScript, [System.Text.Encoding]::ASCII)
    $env:DEPLOY_SSH_PASSWORD  = $script:remotePassword
    $env:SSH_ASKPASS          = $askPassPath
    $env:SSH_ASKPASS_REQUIRE  = "force"
    $env:DISPLAY              = "reflecto"

    $sshBaseArgs = @(
      "-o", "StrictHostKeyChecking=$strictHostKeyChecking",
      "-o", "UserKnownHostsFile=$knownHostsPath",
      "-p", $script:remotePort
    )
    $scpBaseArgs = @(
      "-o", "StrictHostKeyChecking=$strictHostKeyChecking",
      "-o", "UserKnownHostsFile=$knownHostsPath",
      "-P", $script:remotePort
    )

    # ---- ROLLBACK ----
    if ($Mode -eq "rollback") {

      Write-Log "Executing rollback on $($script:remoteHost)."
      $rollScript = Resolve-RemoteScript -Template $remoteRollbackScript
      $rollScript | & $sshCommand @sshBaseArgs "$($script:remoteUser)@$($script:remoteHost)" "bash -s"
      if ($LASTEXITCODE -ne 0) { throw "Remote rollback failed." }

      $deploymentEnd = Get-Date
      $duration      = $deploymentEnd - $deploymentStart
      $durationStr   = "{0}h {1}m {2}s" -f [int]$duration.TotalHours, $duration.Minutes, $duration.Seconds

      $logSummary = @"

============================================================
DEPLOYMENT SUMMARY
Status       : ROLLBACK COMPLETE
Mode         : rollback
Start Time   : $($deploymentStart.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
End Time     : $($deploymentEnd.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
Duration     : $durationStr
Remote Server: $($script:remoteHost)
Deploy Root  : $($script:remoteDeployRoot)
============================================================
"@
      Add-Content -LiteralPath $script:logPath -Value $logSummary -Encoding UTF8
      $deploymentSuccess = $true

    } else {

      # ---- PACKAGING (auto and copy) ----
      $artifactRoot   = Join-Path $env:TEMP ("reflecto-ai-deploy-" + [System.Guid]::NewGuid().ToString("N"))
      $stagingRoot    = Join-Path $artifactRoot "staging"
      $payloadTarPath = Join-Path $artifactRoot "payload.tar"
      $archivePath    = Join-Path $artifactRoot $script:archiveName
      New-DirectoryIfMissing -Path $artifactRoot
      New-DirectoryIfMissing -Path $stagingRoot

      if ($useGitArchive -eq "true") {
        $trackedIncludePaths = @()
        foreach ($path in $includePaths) {
          if (Test-GitPathExists -GitCommand $gitCommand -RepositoryPath $script:localSourcePath -Ref $deployRef -RelativePath $path) {
            $trackedIncludePaths += $path
          } else {
            Write-Log "Skipping non-tracked path from Git archive: $path" "WARN"
          }
        }
        if ($trackedIncludePaths.Count -eq 0) { throw "No tracked deployment paths found for DEPLOY_INCLUDE_PATHS." }
        Write-Log "Creating allowlisted payload from Git ref '$deployRef'."
        Invoke-External -FilePath $gitCommand -Arguments (
          @("-C", $script:localSourcePath, "archive", "--format=tar", "--output=$payloadTarPath", $deployRef, "--") + $trackedIncludePaths
        )
      } else {
        Write-Log "Creating allowlisted payload from working tree '$($script:localSourcePath)'."
        $existingPaths = @()
        foreach ($path in $includePaths) {
          if (Test-Path -LiteralPath (Join-Path $script:localSourcePath $path)) {
            $existingPaths += $path
          } else {
            Write-Log "Skipping missing path: $path" "WARN"
          }
        }
        if ($existingPaths.Count -eq 0) { throw "No deployment paths found in working tree." }
        $tarExcludeArgs = @()
        foreach ($ex in $workingTreeExcludes) { $tarExcludeArgs += "--exclude=$ex" }
        Invoke-External -FilePath $tarCommand -Arguments ($tarExcludeArgs + @("-cf", $payloadTarPath, "-C", $script:localSourcePath) + $existingPaths)
      }

      Invoke-External -FilePath $tarCommand -Arguments @("-xf", $payloadTarPath, "-C", $stagingRoot)

      foreach ($extraPath in $script:localExtraPaths) {
        if (Test-Path -LiteralPath (Join-Path $script:localSourcePath $extraPath)) {
          Write-Log "Overlaying local deployment file: $extraPath"
          Copy-PathToStaging -SourceRoot $script:localSourcePath -RelativePath $extraPath -DestinationRoot $stagingRoot
        }
      }

      Invoke-External -FilePath $tarCommand -Arguments @("-czf", $archivePath, "-C", $stagingRoot, ".")
      if (-not (Test-Path -LiteralPath $archivePath)) { throw "Deployment archive not created: $archivePath" }

      # ---- UPLOAD (auto and copy) ----
      Write-Log "Uploading archive to $($script:remoteHost)."
      Invoke-External -FilePath $scpCommand -Arguments (
        $scpBaseArgs + @($archivePath, "$($script:remoteUser)@$($script:remoteHost):$($script:remoteArchivePath)")
      )

      # ---- COPY: extract + validate only, print activation steps ----
      if ($Mode -eq "copy") {

        Write-Log "Extracting release on remote (activation is manual)."
        $extractScript = Resolve-RemoteScript -Template ($remoteCommon + $remoteExtractBody)
        $extractScript | & $sshCommand @sshBaseArgs "$($script:remoteUser)@$($script:remoteHost)" "bash -s"
        if ($LASTEXITCODE -ne 0) { throw "Remote extraction failed." }

        $deploymentEnd = Get-Date
        $duration      = $deploymentEnd - $deploymentStart
        $durationStr   = "{0}h {1}m {2}s" -f [int]$duration.TotalHours, $duration.Minutes, $duration.Seconds

        Write-ActivationSteps -Heading "COPY DEPLOYMENT COMPLETE - run these to activate"

        $logSummary = @"

============================================================
DEPLOYMENT SUMMARY
Status       : COPY (extraction complete, activation pending)
Mode         : copy
Start Time   : $($deploymentStart.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
End Time     : $($deploymentEnd.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
Duration     : $durationStr
Branch       : $currentBranch
Commit       : $shortCommit
Release      : $($script:releaseName)
Release Dir  : $($script:remoteDeployRoot)/releases/$($script:releaseName)
Archive      : $($script:remoteArchivePath) (remove after activation)
============================================================
"@
        Add-Content -LiteralPath $script:logPath -Value $logSummary -Encoding UTF8
        $deploymentSuccess = $true

      # ---- AUTO: full remote deploy ----
      } else {

        Write-Log "Executing full remote deployment."
        $fullScript = Resolve-RemoteScript -Template ($remoteCommon + $remoteExtractBody + $remoteActivateBody)
        $fullScript | & $sshCommand @sshBaseArgs "$($script:remoteUser)@$($script:remoteHost)" "bash -s"
        if ($LASTEXITCODE -ne 0) { throw "Remote deployment failed." }

        $deploymentEnd = Get-Date
        $duration      = $deploymentEnd - $deploymentStart
        $durationStr   = "{0}h {1}m {2}s" -f [int]$duration.TotalHours, $duration.Minutes, $duration.Seconds

        # ---- Release notes (optional, auto only) ----
        $releaseNotesLocalDir = Join-Path $scriptDir "release_notes\$($script:releaseName)"
        $releaseNotesRef      = "skipped"
        $releaseAgentPython   = Join-Path $releaseAgentDir ".venv\Scripts\python.exe"

        if (-not (Test-Path -LiteralPath $releaseAgentPython)) {
          Write-Log "Release agent venv not found at $releaseAgentPython - skipping release notes." "WARN"
        } elseif ([string]::IsNullOrWhiteSpace($releaseAgentGroqKey)) {
          Write-Log "RELEASE_AGENT_GROQ_API_KEY not configured - skipping release notes." "WARN"
        } elseif ($currentBranch -eq "N/A") {
          Write-Log "Branch name unavailable - skipping release notes." "WARN"
        } else {
          Write-Log "Generating release notes ($currentBranch vs $releaseNotesPreviousBranch)."
          New-DirectoryIfMissing -Path $releaseNotesLocalDir
          Push-Location $releaseAgentDir
          try {
            & $releaseAgentPython -m agent run `
              --current-release  $currentBranch `
              --previous-release $releaseNotesPreviousBranch `
              --repos            $script:localSourcePath `
              --no-approval `
              --output-dir       $releaseNotesLocalDir `
              --groq-api-key     $releaseAgentGroqKey
            if ($LASTEXITCODE -eq 0) {
              $releaseNotesRef = $releaseNotesLocalDir
              Write-Log "Release notes saved to $releaseNotesLocalDir"
            } else {
              Write-Log "Release notes generation exited $LASTEXITCODE - continuing." "WARN"
            }
          } catch {
            Write-Log "Release notes error: $_ - continuing." "WARN"
          } finally {
            Pop-Location
          }
        }

        $logSummary = @"

============================================================
DEPLOYMENT SUMMARY
Status        : SUCCESS
Mode          : auto
Start Time    : $($deploymentStart.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
End Time      : $($deploymentEnd.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
Duration      : $durationStr
Branch        : $currentBranch
Commit        : $shortCommit
Release       : $($script:releaseName)
------------------------------------------------------------
Remote Server : $($script:remoteHost)
Deploy Root   : $($script:remoteDeployRoot)
Release Dir   : $($script:remoteDeployRoot)/releases/$($script:releaseName)
Active Link   : $($script:remoteDeployRoot)/current  ->  releases/$($script:releaseName)
Release Notes : $releaseNotesRef
============================================================

POST-DEPLOYMENT VERIFICATION
------------------------------------------------------------
1. Open  : https://reflecto-ai.onreflections.com/
2. Action : Click "Sign in with Reflections SSO"
3. Verify that the app loads correctly and key features work as expected
============================================================
"@
        Add-Content -LiteralPath $script:logPath -Value $logSummary -Encoding UTF8
        $deploymentSuccess = $true

        Write-Log "Copying deployment log to remote server."
        Invoke-External -FilePath $scpCommand -Arguments (
          $scpBaseArgs + @(
            $script:logPath,
            "$($script:remoteUser)@$($script:remoteHost):$($script:remoteDeployRoot)/releases/$($script:releaseName)/deployment.log"
          )
        )

        if ($releaseNotesRef -ne "skipped" -and (Test-Path -LiteralPath $releaseNotesLocalDir)) {
          Write-Log "Uploading release notes to remote server."
          Invoke-External -FilePath $scpCommand -Arguments (
            @("-r") + $scpBaseArgs + @(
              $releaseNotesLocalDir,
              "$($script:remoteUser)@$($script:remoteHost):$($script:remoteDeployRoot)/releases/$($script:releaseName)/release_notes"
            )
          )
        }

      } # end auto
    } # end auto/copy
  } # end ShouldProcess

  Write-Log "Deployment flow finished for '$Environment' [$Mode]."

} finally {

  if (-not $deploymentSuccess -and $script:logPath -and (Test-Path -LiteralPath $script:logPath)) {
    $failEnd      = Get-Date
    $failDuration = $failEnd - $deploymentStart
    $failStr      = "{0}h {1}m {2}s" -f [int]$failDuration.TotalHours, $failDuration.Minutes, $failDuration.Seconds
    $errorSummary = @"

============================================================
DEPLOYMENT SUMMARY
Status       : FAILED
Mode         : $Mode
Start Time   : $($deploymentStart.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
End Time     : $($failEnd.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
Duration     : $failStr
Branch       : $currentBranch
Commit       : $shortCommit
Release      : $($script:releaseName)
============================================================
"@
    Add-Content -LiteralPath $script:logPath -Value $errorSummary -Encoding UTF8
  }

  if ($artifactRoot -and (Test-Path -LiteralPath $artifactRoot -ErrorAction SilentlyContinue)) {
    Remove-Item -LiteralPath $artifactRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
  if ($askPassPath -and (Test-Path -LiteralPath $askPassPath -ErrorAction SilentlyContinue)) {
    Remove-Item -LiteralPath $askPassPath -Force -ErrorAction SilentlyContinue
  }
  Remove-Item Env:\DEPLOY_SSH_PASSWORD  -ErrorAction SilentlyContinue
  Remove-Item Env:\SSH_ASKPASS          -ErrorAction SilentlyContinue
  Remove-Item Env:\SSH_ASKPASS_REQUIRE  -ErrorAction SilentlyContinue
  Remove-Item Env:\DISPLAY              -ErrorAction SilentlyContinue
}
