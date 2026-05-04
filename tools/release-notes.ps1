# Wrapper for the release notes agent standalone binary.
# Usage:
#   .\release-notes.ps1 run                    # CLI pipeline run
#   .\release-notes.ps1 run --no-approval      # Skip approval step
#   .\release-notes.ps1 run --clear-cache      # Clear cache then run
#   .\release-notes.ps1 server                 # Start web server on port 8000
#   .\release-notes.ps1 server --port 9000     # Custom port
#   .\release-notes.ps1 mcp                    # MCP stdio server
#
# LLM API keys are read from environment variables set by the caller
# (GROQ_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY).

$cli = Join-Path $PSScriptRoot "release-notes.exe"

if (-not (Test-Path -LiteralPath $cli)) {
    Write-Host "release-notes.exe not found in $PSScriptRoot" -ForegroundColor Red
    Write-Host "Rebuild it from nexus-ai:" -ForegroundColor Yellow
    Write-Host "  cd C:\projects\nexus-ai\ai-agents\release" -ForegroundColor Yellow
    Write-Host "  .venv\Scripts\pyinstaller --onefile --name release-notes --distpath dist agent/__main__.py" -ForegroundColor Yellow
    Write-Host "  copy dist\release-notes.exe $PSScriptRoot\" -ForegroundColor Yellow
    exit 1
}

$env:PYTHONIOENCODING = "utf-8"
& $cli @args
