#!/usr/bin/env bash
# Runs ON THE SERVER. Pulls the latest code, rebuilds, and restarts the app.
# DB migrations run automatically at boot (src/db/index.ts), so no separate step.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Pull latest from GitHub…"
git pull --ff-only

echo "▶ Install dependencies…"
npm ci

echo "▶ Build production bundle…"
npm run build

echo "▶ (Re)start under PM2…"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "✅ Deployed. New migrations apply automatically on this restart."
