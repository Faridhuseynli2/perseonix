#!/usr/bin/env bash
# ============================================================================
#  PERSEONIX AUTO-DEPLOY  —  Ubuntu SUNUCUDA çalışır (systemd servisi olarak).
#  GitHub'ı belirli aralıkla yoklar; dalda yeni commit görürse otomatik:
#     pull → (gerekiyorsa) npm ci → npm run build → pm2 reload
#  Yani sen Mac'ten push edince, sunucu birkaç dakikada kendini günceller.
#
#  Ayarlar (systemd Environment ile de geçilebilir):
#    REPO_DIR  sunucudaki repo klasörü      (vars: /home/perseonix/perseonix-ui)
#    BRANCH    izlenecek dal                (vars: main)
#    INTERVAL  kaç saniyede bir kontrol      (vars: 60)
#    PM2_NAME  pm2 uygulama adı             (vars: perseonix)
# ============================================================================
set -uo pipefail

REPO_DIR="${REPO_DIR:-/home/perseonix/perseonix-ui}"
BRANCH="${BRANCH:-main}"
INTERVAL="${INTERVAL:-60}"
PM2_NAME="${PM2_NAME:-perseonix}"

# cron/systemd dar PATH ile gelir — node/npm/pm2 bulunsun diye genişlet.
export PATH="/usr/local/bin:/usr/bin:/bin:${HOME:-/home/perseonix}/.npm-global/bin:$PATH"

log() { echo "[$(date '+%F %T')] $*"; }

cd "$REPO_DIR" 2>/dev/null || { log "HATA: REPO_DIR yok → $REPO_DIR"; exit 1; }

log "auto-deploy başladı — $REPO_DIR ($BRANCH), her ${INTERVAL}s'de bir kontrol"

while true; do
  if git fetch origin "$BRANCH" --quiet 2>/dev/null; then
    LOCAL="$(git rev-parse HEAD 2>/dev/null || echo none)"
    REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "$LOCAL")"

    if [ "$LOCAL" != "$REMOTE" ]; then
      log "yeni sürüm bulundu: ${LOCAL:0:7} → ${REMOTE:0:7} — deploy ediliyor…"

      # Sunucuyu remote'un tam kopyası yap (yerel .env.local/.data gitignore'lu, korunur)
      git reset --hard "origin/$BRANCH"

      # Bağımlılıklar değiştiyse kur (lockfile varsa ci, yoksa install)
      if ! git diff --quiet "$LOCAL" "$REMOTE" -- package.json package-lock.json 2>/dev/null; then
        if [ -f package-lock.json ]; then
          log "bağımlılıklar değişmiş → npm ci"; npm ci
        else
          log "bağımlılıklar değişmiş (lockfile yok) → npm install"; npm install
        fi
      fi

      if npm run build && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save; then
        log "✅ DEPLOY TAMAM → ${REMOTE:0:7} (canlı)"
      else
        log "✖ DEPLOY HATASI — yukarıdaki çıktıya bak"
      fi
    fi
  else
    log "git fetch başarısız (ağ ya da erişim sorunu?) — sonraki turda tekrar denenecek"
  fi

  sleep "$INTERVAL"
done
