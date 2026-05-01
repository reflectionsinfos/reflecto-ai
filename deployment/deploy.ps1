[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("dev", "qa", "prod")]
  [string]$Environment
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Log {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [ValidateSet("INFO", "WARN", "ERROR")]
    [string]$Level = "INFO"
  )

  $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $line = "[$timestamp] [$Level] $Message"
  Write-Host $line
  if ($script:logPath) {
    Add-Content -LiteralPath $script:logPath -Value $line -Encoding UTF8
  }
}

function Load-EnvFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Environment file not found: $Path"
  }

  $config = @{}
  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      continue
    }

    $separatorIndex = $line.IndexOf("=")
    if ($separatorIndex -lt 1) {
      throw "Invalid config line in ${Path}: $rawLine"
    }

    $key = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1).Trim()

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $config[$key] = $value
  }

  return $config
}

function Get-ConfigValue {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Config,
    [Parameter(Mandatory = $true)]
    [string]$Key,
    [AllowNull()]
    [string]$Default = $null
  )

  if ($Config.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace([string]$Config[$Key])) {
    return [string]$Config[$Key]
  }

  return $Default
}

function Get-ConfigList {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Config,
    [Parameter(Mandatory = $true)]
    [string]$Key,
    [Parameter(Mandatory = $true)]
    [string[]]$Default
  )

  $rawValue = Get-ConfigValue -Config $Config -Key $Key
  if ([string]::IsNullOrWhiteSpace($rawValue)) {
    return $Default
  }

  return @(
    $rawValue.Split(",") |
      ForEach-Object { $_.Trim() } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  )
}

function Assert-RequiredConfig {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Config,
    [Parameter(Mandatory = $true)]
    [string[]]$Keys
  )

  foreach ($key in $Keys) {
    if (-not $Config.ContainsKey($key) -or [string]::IsNullOrWhiteSpace([string]$Config[$key])) {
      throw "Missing required config key '$key'."
    }
  }
}

function Escape-BashSingleQuoted {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  return $Value.Replace("'", "'""'""'")
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($Arguments -join ' ')"
  }
}

function New-DirectoryIfMissing {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    [void](New-Item -ItemType Directory -Path $Path -Force)
  }
}

function Test-GitPathExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$GitCommand,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryPath,
    [Parameter(Mandatory = $true)]
    [string]$Ref,
    [Parameter(Mandatory = $true)]
    [string]$RelativePath
  )

  & $GitCommand -C $RepositoryPath cat-file -e "${Ref}:$RelativePath" 2>$null
  return $LASTEXITCODE -eq 0
}

function Copy-PathToStaging {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourceRoot,
    [Parameter(Mandatory = $true)]
    [string]$RelativePath,
    [Parameter(Mandatory = $true)]
    [string]$DestinationRoot
  )

  $sourcePath = Join-Path $SourceRoot $RelativePath
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    return
  }

  $destinationPath = Join-Path $DestinationRoot $RelativePath
  $destinationParent = Split-Path -Parent $destinationPath
  if ($destinationParent) {
    New-DirectoryIfMissing -Path $destinationParent
  }

  if ((Get-Item -LiteralPath $sourcePath).PSIsContainer) {
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse -Force
  } else {
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:logPath = Join-Path $scriptDir "deployment.log"
[System.IO.File]::WriteAllText($script:logPath, "", [System.Text.Encoding]::UTF8)
$envFilePath = Join-Path $scriptDir "env.$Environment"
$config = Load-EnvFile -Path $envFilePath

Assert-RequiredConfig -Config $config -Keys @(
  "REMOTE_HOST",
  "REMOTE_USER",
  "REMOTE_PASSWORD",
  "REMOTE_DEPLOY_ROOT",
  "LOCAL_SOURCE_PATH"
)

$remoteHost = Get-ConfigValue -Config $config -Key "REMOTE_HOST"
$remotePort = Get-ConfigValue -Config $config -Key "REMOTE_PORT" -Default "22"
$remoteUser = Get-ConfigValue -Config $config -Key "REMOTE_USER"
$remotePassword = Get-ConfigValue -Config $config -Key "REMOTE_PASSWORD"
$remoteSudoPassword = Get-ConfigValue -Config $config -Key "REMOTE_SUDO_PASSWORD" -Default $remotePassword
$remoteDeployRoot = Get-ConfigValue -Config $config -Key "REMOTE_DEPLOY_ROOT"
$localSourcePath = [System.IO.Path]::GetFullPath((Get-ConfigValue -Config $config -Key "LOCAL_SOURCE_PATH"))
$composeFile = Get-ConfigValue -Config $config -Key "DEPLOY_COMPOSE_FILE" -Default "docker-compose.prod.yml"
$composeProjectName = Get-ConfigValue -Config $config -Key "COMPOSE_PROJECT_NAME" -Default "reflecto-ai"
$deployRef = Get-ConfigValue -Config $config -Key "DEPLOY_REF" -Default "HEAD"
$useGitArchive = (Get-ConfigValue -Config $config -Key "DEPLOY_USE_GIT_ARCHIVE" -Default "true").ToLowerInvariant()
$installDockerIfMissing = (Get-ConfigValue -Config $config -Key "DEPLOY_INSTALL_DOCKER_IF_MISSING" -Default "true").ToLowerInvariant()
$retainReleases = Get-ConfigValue -Config $config -Key "DEPLOY_RETAIN_RELEASES" -Default "3"
$releaseAgentDir = Get-ConfigValue -Config $config -Key "RELEASE_AGENT_DIR" -Default "C:\projects\nexus-ai\ai-agents\release"
$releaseNotesPreviousBranch = Get-ConfigValue -Config $config -Key "RELEASE_NOTES_PREVIOUS_BRANCH" -Default "main"
$releaseAgentGroqKey = Get-ConfigValue -Config $config -Key "RELEASE_AGENT_GROQ_API_KEY"
$strictHostKeyChecking = Get-ConfigValue -Config $config -Key "SSH_STRICT_HOST_KEY_CHECKING" -Default "accept-new"
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
$localExtraPaths = Get-ConfigList -Config $config -Key "DEPLOY_LOCAL_EXTRA_PATHS" -Default @(
  "apps/backend/.env",
  "apps/backend/.env.production",
  "apps/frontend/.env.production"
)
$workingTreeExcludes = @(
  ".git",
  "node_modules",
  ".turbo",
  "apps/backend/node_modules",
  "apps/frontend/node_modules",
  "apps/backend/dist",
  "apps/frontend/dist",
  "apps/frontend/.next",
  "apps/backend/.env.local",
  "apps/frontend/.env.local",
  "apps/backend/.env.development.local",
  "apps/frontend/.env.development.local",
  "apps/backend/.env.test.local",
  "apps/frontend/.env.test.local",
  "apps/backend/.env.production.local",
  "apps/frontend/.env.production.local",
  "deployment/env.dev",
  "deployment/env.qa",
  "deployment/env.prod",
  "deployment/*.tar.gz",
  "nul"
)

if (-not (Test-Path -LiteralPath $localSourcePath)) {
  throw "Local source path not found: $localSourcePath"
}

[int]$parsedPort = 0
if (-not [int]::TryParse($remotePort, [ref]$parsedPort)) {
  throw "REMOTE_PORT must be a valid integer. Received: $remotePort"
}

[int]$releaseRetention = 0
if (-not [int]::TryParse($retainReleases, [ref]$releaseRetention)) {
  throw "DEPLOY_RETAIN_RELEASES must be a valid integer. Received: $retainReleases"
}

$gitCommand = (Get-Command git -ErrorAction Stop).Source
$sshCommand = (Get-Command ssh.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $sshCommand) {
  $sshCommand = (Get-Command ssh -ErrorAction Stop).Source
}
$scpCommand = (Get-Command scp.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $scpCommand) {
  $scpCommand = (Get-Command scp -ErrorAction Stop).Source
}
$tarCommand = (Get-Command tar.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $tarCommand) {
  $tarCommand = (Get-Command tar -ErrorAction Stop).Source
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$shortCommit = "workspace"
$artifactRoot = Join-Path $env:TEMP ("reflecto-ai-deploy-" + [System.Guid]::NewGuid().ToString("N"))
$stagingRoot = Join-Path $artifactRoot "staging"
New-DirectoryIfMissing -Path $artifactRoot
New-DirectoryIfMissing -Path $stagingRoot

if ($useGitArchive -eq "true") {
  $insideWorkTree = (& $gitCommand -C $localSourcePath rev-parse --is-inside-work-tree).Trim()
  if ($LASTEXITCODE -ne 0 -or $insideWorkTree -ne "true") {
    throw "DEPLOY_USE_GIT_ARCHIVE=true requires LOCAL_SOURCE_PATH to be a Git repository."
  }

  $shortCommit = (& $gitCommand -C $localSourcePath rev-parse --short $deployRef).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($shortCommit)) {
    throw "Unable to resolve DEPLOY_REF '$deployRef'."
  }
}

$releaseName = "$Environment-$timestamp-$shortCommit"
$archiveName = "reflecto-ai-$releaseName.tar.gz"
$archivePath = Join-Path $artifactRoot $archiveName
$payloadTarPath = Join-Path $artifactRoot "payload.tar"
$knownHostsPath = Join-Path $scriptDir ".known_hosts_$Environment"
$askPassPath = Join-Path $env:TEMP "reflecto-ssh-askpass-$PID.cmd"
$remoteArchivePath = "/tmp/$archiveName"

$currentBranch = "N/A"
if ($useGitArchive -eq "true") {
  $branchOut = (& $gitCommand -C $localSourcePath rev-parse --abbrev-ref HEAD 2>$null).Trim()
  if (-not [string]::IsNullOrEmpty($branchOut)) { $currentBranch = $branchOut }
}

$deploymentStart = Get-Date
$deploymentSuccess = $false

$logHeader = @"
============================================================
REFLECTO-AI DEPLOYMENT LOG
============================================================
Environment  : $Environment
Start Time   : $($deploymentStart.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
Remote Host  : ${remoteUser}@${remoteHost}:${remotePort}
Deploy Root  : $remoteDeployRoot
Releases Dir : $remoteDeployRoot/releases
Active Link  : $remoteDeployRoot/current
Deploy Ref   : $deployRef
Branch       : $currentBranch
Commit       : $shortCommit
Release Name : $releaseName
Compose File : $composeFile
Source Path  : $localSourcePath
Retain Rel.  : $releaseRetention
============================================================
"@
Add-Content -LiteralPath $script:logPath -Value $logHeader -Encoding UTF8

try {
  Write-Log "Preparing deployment for environment '$Environment'."

  if ($useGitArchive -eq "true") {
    $trackedIncludePaths = @()
    foreach ($path in $includePaths) {
      if (Test-GitPathExists -GitCommand $gitCommand -RepositoryPath $localSourcePath -Ref $deployRef -RelativePath $path) {
        $trackedIncludePaths += $path
      } else {
        Write-Log "Skipping non-tracked path from Git archive: $path" "WARN"
      }
    }

    if ($trackedIncludePaths.Count -eq 0) {
      throw "No tracked deployment paths were found for DEPLOY_INCLUDE_PATHS."
    }

    Write-Log "Creating allowlisted payload from Git ref '$deployRef'."
    Invoke-External -FilePath $gitCommand -Arguments (
      @(
        "-C",
        $localSourcePath,
        "archive",
        "--format=tar",
        "--output=$payloadTarPath",
        $deployRef,
        "--"
      ) + $trackedIncludePaths
    )
  } else {
    Write-Log "Creating allowlisted payload from working tree '$localSourcePath'."
    $existingIncludePaths = @()
    foreach ($path in $includePaths) {
      if (Test-Path -LiteralPath (Join-Path $localSourcePath $path)) {
        $existingIncludePaths += $path
      } else {
        Write-Log "Skipping missing path from working tree payload: $path" "WARN"
      }
    }

    if ($existingIncludePaths.Count -eq 0) {
      throw "No deployment paths were found in the working tree for DEPLOY_INCLUDE_PATHS."
    }

    $tarArgs = @()
    foreach ($excludePath in $workingTreeExcludes) {
      $tarArgs += "--exclude=$excludePath"
    }
    $tarArgs += @(
      "-cf",
      $payloadTarPath,
      "-C",
      $localSourcePath
    ) + $existingIncludePaths
    Invoke-External -FilePath $tarCommand -Arguments $tarArgs
  }

  Invoke-External -FilePath $tarCommand -Arguments @(
    "-xf",
    $payloadTarPath,
    "-C",
    $stagingRoot
  )

  foreach ($extraPath in $localExtraPaths) {
    if (Test-Path -LiteralPath (Join-Path $localSourcePath $extraPath)) {
      Write-Log "Overlaying local deployment file: $extraPath"
      Copy-PathToStaging -SourceRoot $localSourcePath -RelativePath $extraPath -DestinationRoot $stagingRoot
    }
  }

  Invoke-External -FilePath $tarCommand -Arguments @(
    "-czf",
    $archivePath,
    "-C",
    $stagingRoot,
    "."
  )

  if (-not (Test-Path -LiteralPath $archivePath)) {
    throw "Failed to create deployment archive: $archivePath"
  }

  $askPassScript = @"
@echo off
setlocal EnableDelayedExpansion
echo(!DEPLOY_SSH_PASSWORD!
"@
  [System.IO.File]::WriteAllText($askPassPath, $askPassScript, [System.Text.Encoding]::ASCII)

  $env:DEPLOY_SSH_PASSWORD = $remotePassword
  $env:SSH_ASKPASS = $askPassPath
  $env:SSH_ASKPASS_REQUIRE = "force"
  $env:DISPLAY = "reflecto"

  $sshBaseArgs = @(
    "-o", "StrictHostKeyChecking=$strictHostKeyChecking",
    "-o", "UserKnownHostsFile=$knownHostsPath",
    "-p", $remotePort
  )
  $scpBaseArgs = @(
    "-o", "StrictHostKeyChecking=$strictHostKeyChecking",
    "-o", "UserKnownHostsFile=$knownHostsPath",
    "-P", $remotePort
  )

  if ($PSCmdlet.ShouldProcess("$remoteUser@$remoteHost", "Upload release archive and execute remote deployment")) {
    Write-Log "Uploading archive to $remoteHost."
    Invoke-External -FilePath $scpCommand -Arguments (
      $scpBaseArgs + @(
        $archivePath,
        "${remoteUser}@${remoteHost}:$remoteArchivePath"
      )
    )

    $remoteScript = @'
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

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
    printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/%s %s stable\n' "$(dpkg --print-architecture)" "${ID}" "${VERSION_CODENAME}" | run_sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    run_sudo apt-get update
    run_sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    rm -f /tmp/docker.gpg.asc
  else
    fail "Unsupported Linux distribution for automatic Docker installation."
  fi

  run_sudo systemctl enable --now docker
}

cleanup_old_releases() {
  if [ "$RETAIN_RELEASES" -le 0 ] 2>/dev/null; then
    return 0
  fi

  mapfile -t old_releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk 'NR>'"$RETAIN_RELEASES"' {print $2}')
  for old_release in "${old_releases[@]}"; do
    [ -z "$old_release" ] && continue
    [ "$old_release" = "$RELEASE_DIR" ] && continue
    log "Removing old release $old_release"
    run_sudo rm -rf "$old_release"
  done
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

log "Ensuring deployment directories exist at $REMOTE_DEPLOY_ROOT"
run_sudo mkdir -p "$RELEASES_DIR"
run_sudo mkdir -p "$RELEASE_DIR"
run_sudo tar -xzf "$REMOTE_ARCHIVE_PATH" -C "$RELEASE_DIR"
run_sudo test -f "$RELEASE_DIR/$COMPOSE_FILE" || fail "Compose file not found at $RELEASE_DIR/$COMPOSE_FILE"
run_sudo chown -R "${REMOTE_USER_NAME}:${REMOTE_USER_NAME}" "$RELEASE_DIR" >/dev/null 2>&1 || true

ensure_docker

log "Validating docker compose configuration"
run_compose "config -q"

log "Stopping any existing containers for this compose project"
run_compose "down --remove-orphans" || true

log "Removing legacy fixed-name containers if they exist"
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

    $remoteScript = $remoteScript.Replace("__REMOTE_SUDO_PASSWORD__", [string](Escape-BashSingleQuoted -Value $remoteSudoPassword))
    $remoteScript = $remoteScript.Replace("__REMOTE_DEPLOY_ROOT__", [string](Escape-BashSingleQuoted -Value $remoteDeployRoot))
    $remoteScript = $remoteScript.Replace("__RELEASE_NAME__", [string](Escape-BashSingleQuoted -Value $releaseName))
    $remoteScript = $remoteScript.Replace("__REMOTE_ARCHIVE_PATH__", [string](Escape-BashSingleQuoted -Value $remoteArchivePath))
    $remoteScript = $remoteScript.Replace("__COMPOSE_FILE__", [string](Escape-BashSingleQuoted -Value $composeFile))
    $remoteScript = $remoteScript.Replace("__COMPOSE_PROJECT_NAME__", [string](Escape-BashSingleQuoted -Value $composeProjectName))
    $remoteScript = $remoteScript.Replace("__INSTALL_DOCKER_IF_MISSING__", [string](Escape-BashSingleQuoted -Value $installDockerIfMissing))
    $remoteScript = $remoteScript.Replace("__RETAIN_RELEASES__", [string]$releaseRetention)
    $remoteScript = $remoteScript.Replace("__REMOTE_USER_NAME__", [string](Escape-BashSingleQuoted -Value $remoteUser))

    $remoteScript | & $sshCommand @sshBaseArgs "${remoteUser}@${remoteHost}" "bash -s"
    if ($LASTEXITCODE -ne 0) {
      throw "Remote deployment failed."
    }

    $deploymentEnd = Get-Date
    $duration = $deploymentEnd - $deploymentStart
    $durationStr = "{0}h {1}m {2}s" -f [int]$duration.TotalHours, $duration.Minutes, $duration.Seconds

    # --- Release notes (optional) ---
    $releaseNotesLocalDir = Join-Path $scriptDir "release_notes\$releaseName"
    $releaseNotesRef = "skipped"
    $releaseAgentPython = Join-Path $releaseAgentDir ".venv\Scripts\python.exe"

    if (-not (Test-Path -LiteralPath $releaseAgentPython)) {
      Write-Log "Release agent venv not found at $releaseAgentPython — skipping release notes." "WARN"
    } elseif ([string]::IsNullOrWhiteSpace($releaseAgentGroqKey)) {
      Write-Log "RELEASE_AGENT_GROQ_API_KEY not configured — skipping release notes." "WARN"
    } elseif ($currentBranch -eq "N/A") {
      Write-Log "Branch name unavailable — skipping release notes." "WARN"
    } else {
      Write-Log "Generating release notes ($currentBranch vs $releaseNotesPreviousBranch)."
      New-DirectoryIfMissing -Path $releaseNotesLocalDir
      Push-Location $releaseAgentDir
      try {
        & $releaseAgentPython -m agent run `
          --current-release $currentBranch `
          --previous-release $releaseNotesPreviousBranch `
          --repos $localSourcePath `
          --no-approval `
          --output-dir $releaseNotesLocalDir `
          --groq-api-key $releaseAgentGroqKey
        if ($LASTEXITCODE -eq 0) {
          $releaseNotesRef = $releaseNotesLocalDir
          Write-Log "Release notes saved to $releaseNotesLocalDir"
        } else {
          Write-Log "Release notes generation exited with code $LASTEXITCODE — continuing." "WARN"
        }
      } catch {
        Write-Log "Release notes generation error: $_ — continuing." "WARN"
      } finally {
        Pop-Location
      }
    }

    $logSummary = @"

============================================================
DEPLOYMENT SUMMARY
Status        : SUCCESS
Start Time    : $($deploymentStart.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
End Time      : $($deploymentEnd.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
Duration      : $durationStr
Branch        : $currentBranch
Commit        : $shortCommit
Release       : $releaseName
------------------------------------------------------------
Remote Server : $remoteHost
Deploy Root   : $remoteDeployRoot
Release Dir   : $remoteDeployRoot/releases/$releaseName
Active Link   : $remoteDeployRoot/current  ->  releases/$releaseName
Release Notes : $releaseNotesRef
============================================================

POST-DEPLOYMENT VERIFICATION
------------------------------------------------------------
1. Open  : https://reflecto-ai.onreflections.com/
2. Action : Click "Sign in with Reflections SSO"
3. Credentials : Enter your Reflections SSO email and password
4. 2FA (if enabled) : Enter the verification code sent to your phone
5. Verify that the app loads correctly and key features work as expected
============================================================
"@
    Add-Content -LiteralPath $script:logPath -Value $logSummary -Encoding UTF8
    $deploymentSuccess = $true

    Write-Log "Copying deployment log to remote server."
    Invoke-External -FilePath $scpCommand -Arguments (
      $scpBaseArgs + @(
        $script:logPath,
        "${remoteUser}@${remoteHost}:$remoteDeployRoot/releases/$releaseName/deployment.log"
      )
    )

    if ($releaseNotesRef -ne "skipped" -and (Test-Path -LiteralPath $releaseNotesLocalDir)) {
      Write-Log "Uploading release notes to remote server."
      Invoke-External -FilePath $scpCommand -Arguments (
        @("-r") + $scpBaseArgs + @(
          $releaseNotesLocalDir,
          "${remoteUser}@${remoteHost}:$remoteDeployRoot/releases/$releaseName/release_notes"
        )
      )
    }
  }

  Write-Log "Deployment flow finished for '$Environment'."
}
finally {
  if (-not $deploymentSuccess -and $script:logPath -and (Test-Path -LiteralPath $script:logPath)) {
    $deploymentEnd = Get-Date
    $duration = $deploymentEnd - $deploymentStart
    $durationStr = "{0}h {1}m {2}s" -f [int]$duration.TotalHours, $duration.Minutes, $duration.Seconds
    $errorSummary = @"

============================================================
DEPLOYMENT SUMMARY
Status       : FAILED
Start Time   : $($deploymentStart.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
End Time     : $($deploymentEnd.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
Duration     : $durationStr
Branch       : $currentBranch
Commit       : $shortCommit
Release      : $releaseName
============================================================
"@
    Add-Content -LiteralPath $script:logPath -Value $errorSummary -Encoding UTF8
  }
  Remove-Item -LiteralPath $payloadTarPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $askPassPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $archivePath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $artifactRoot -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item Env:\DEPLOY_SSH_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:\SSH_ASKPASS -ErrorAction SilentlyContinue
  Remove-Item Env:\SSH_ASKPASS_REQUIRE -ErrorAction SilentlyContinue
  Remove-Item Env:\DISPLAY -ErrorAction SilentlyContinue
}
