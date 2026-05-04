# Wrapper for the nexus-ai release notes agent.
# Usage:
#   .\release-notes.ps1 run                    # CLI pipeline run
#   .\release-notes.ps1 run --no-approval      # Skip approval step
#   .\release-notes.ps1 run --clear-cache      # Clear cache then run
#   .\release-notes.ps1 server                 # Start web server on port 8000
#   .\release-notes.ps1 server --port 9000     # Custom port
#   .\release-notes.ps1 mcp                    # MCP stdio server

$agentDir = "C:\projects\nexus-ai\ai-agents\release"
$python   = Join-Path $agentDir ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $agentDir)) {
    Write-Host "Release agent directory not found: $agentDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $python)) {
    Write-Host "venv not found. Run setup first:" -ForegroundColor Yellow
    Write-Host "  cd $agentDir" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv" -ForegroundColor Yellow
    Write-Host "  .venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

$env:PYTHONIOENCODING = "utf-8"

Push-Location $agentDir
try {
    & $python -m agent @args
} finally {
    Pop-Location
}
