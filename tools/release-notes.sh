#!/bin/bash
# Wrapper for the nexus-ai release notes agent.
# Usage:
#   ./release-notes.sh run                    # CLI pipeline run
#   ./release-notes.sh run --no-approval      # Skip approval step
#   ./release-notes.sh run --clear-cache      # Clear cache then run
#   ./release-notes.sh server                 # Start web server on port 8000
#   ./release-notes.sh server --port 9000     # Custom port
#   ./release-notes.sh mcp                    # MCP stdio server

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../nexus-ai/ai-agents/release" 2>/dev/null && pwd)"

if [ ! -d "$AGENT_DIR" ]; then
    # Fallback to absolute path if relative resolution fails
    AGENT_DIR="/c/projects/nexus-ai/ai-agents/release"
fi

PYTHON="$AGENT_DIR/.venv/bin/python"

if [ ! -d "$AGENT_DIR" ]; then
    echo "Release agent directory not found: $AGENT_DIR" >&2
    exit 1
fi

if [ ! -f "$PYTHON" ]; then
    echo "venv not found. Run setup first:" >&2
    echo "  cd $AGENT_DIR" >&2
    echo "  python -m venv .venv" >&2
    echo "  .venv/bin/pip install -r requirements.txt" >&2
    exit 1
fi

cd "$AGENT_DIR" || exit 1
"$PYTHON" -m agent "$@"
