#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Stopping containers..."
docker compose down

echo "Rebuilding and starting (production)..."
docker compose up --build -d

echo "Done. Services:"
docker compose ps
