#!/usr/bin/env bash
# Runs LOCALLY (your Mac). One command: commit → push → deploy on the server.
# Usage:  npm run ship "what I changed"
# Config: create .env.deploy (git-ignored) with:
#   DEPLOY_HOST=user@your-server-ip
#   DEPLOY_PATH=/opt/perseonix-ui
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.deploy ] && source .env.deploy
: "${DEPLOY_HOST:?Set DEPLOY_HOST in .env.deploy (e.g. root@203.0.113.10)}"
: "${DEPLOY_PATH:?Set DEPLOY_PATH in .env.deploy (e.g. /opt/perseonix-ui)}"

MSG="${1:-"deploy $(date '+%Y-%m-%d %H:%M')"}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "▶ Commit local changes…"
git add -A
git commit -m "$MSG" || echo "  (nothing new to commit — shipping current HEAD)"

echo "▶ Push to GitHub ($BRANCH)…"
git push origin "$BRANCH"

echo "▶ Deploy on server: $DEPLOY_HOST ($DEPLOY_PATH)…"
ssh "$DEPLOY_HOST" "cd '$DEPLOY_PATH' && bash scripts/deploy.sh"

echo "✅ Shipped. Live on your server."
