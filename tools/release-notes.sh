#!/bin/bash
# Wrapper for the release notes agent standalone binary.
# Usage:
#   ./release-notes.sh run                    # CLI pipeline run
#   ./release-notes.sh run --no-approval      # Skip approval step
#   ./release-notes.sh run --clear-cache      # Clear cache then run
#   ./release-notes.sh server                 # Start web server on port 8000
#   ./release-notes.sh server --port 9000     # Custom port
#   ./release-notes.sh mcp                    # MCP stdio server
#
# LLM API keys are read from environment variables set by the caller
# (GROQ_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY).
#
# NOTE: release-notes (Linux binary) must be built separately on Linux/macOS:
#   cd /path/to/nexus-ai/ai-agents/release
#   .venv/bin/pip install pyinstaller
#   .venv/bin/pyinstaller --onefile --name release-notes --distpath dist agent/__main__.py
#   cp dist/release-notes /path/to/reflecto-ai/tools/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="$SCRIPT_DIR/release-notes"

if [ ! -f "$CLI" ]; then
    echo "release-notes binary not found at: $CLI" >&2
    echo "Build it from nexus-ai and copy to this directory:" >&2
    echo "  cd /path/to/nexus-ai/ai-agents/release" >&2
    echo "  .venv/bin/pyinstaller --onefile --name release-notes --distpath dist agent/__main__.py" >&2
    echo "  cp dist/release-notes $SCRIPT_DIR/" >&2
    exit 1
fi

PYTHONIOENCODING=utf-8 "$CLI" "$@"
