#!/usr/bin/env bash
# ============================================================================
#  SUNUCUYA KOPYALA (sadece kopyalar)  —  Mac'inde çalışır:  npm run push
#  (Desktop'taki deploy.command ile aynı işi yapar.)
#
#  YALNIZCA değişen dosyaları sunucuna kopyalar. Kurmaz/build etmez/başlatmaz.
#  Başlatma/log işini sunucuda (Termius) elle yaparsın: pm2 start/restart/logs.
#
#  Ayar: .env.deploy içinde DEPLOY_HOST ve DEPLOY_PATH.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.deploy ] && source .env.deploy
: "${DEPLOY_HOST:?.env.deploy içinde DEPLOY_HOST tanımla}"
: "${DEPLOY_PATH:?.env.deploy içinde DEPLOY_PATH tanımla}"

SSH="ssh -o ControlMaster=auto -o ControlPath=/tmp/px-deploy-%C -o ControlPersist=180"

echo "→ Sunucuda klasör hazırlanıyor… ($DEPLOY_HOST)"
$SSH "$DEPLOY_HOST" "mkdir -p '$DEPLOY_PATH'"

echo "→ Dosyalar kopyalanıyor (yalnızca değişenler)…"
rsync -az --delete -e "$SSH" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.data' \
  --exclude '.env.local' \
  --exclude '.env.deploy' \
  ./ "$DEPLOY_HOST:$DEPLOY_PATH/"

echo "✅ Kopyalandı. Sunucuda: pm2 restart perseonix  (ilk kez: npm install + pm2 start)"
