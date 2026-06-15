#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

npm run build

while true; do
    echo "[start.sh] starting at $(date)"
    node dist/index.js || true
    echo "[start.sh] exited, restarting in 3s"
    sleep 3
done
