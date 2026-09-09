#!/usr/bin/env bash
# Propperly — Source Discovery Service
# Usage: ./run-discovery.sh [port] [workspace-path]

PORT="${1:-3001}"
PROPPERLY_CWD="${2:-$(pwd)}"

export PORT
export PROPPERLY_CWD

echo "Starting Propperly Discovery Service"
echo "  Port      : $PORT"
echo "  Workspace : $PROPPERLY_CWD"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
npx tsx services/src/index.ts
