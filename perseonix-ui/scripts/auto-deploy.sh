#!/usr/bin/env bash
# ============================================================================
#  PERSEONIX AUTO-DEPLOY  —  Ubuntu SUNUCUDA çalışır (systemd servisi).
#  NESTED yapı: git reposu = REPO_DIR, Next.js uygulaması = REPO_DIR/APP_SUBDIR.
#
#  GitHub'ı belirli aralıkla yoklar; dalda yeni commit görürse otomatik:
#     (repo kökünde) git reset  →  (app klasöründe) npm ci/install → build → pm2
#
#  Ayarlar (systemd Environment ile geçilir):
#    REPO_DIR    git reposunun kökü      (vars: /root/perseonix)
#    APP_SUBDIR  uygulama alt klasörü    (vars: perseonix-ui)
#    BRANCH      izlenecek dal           (vars: main)
#    INTERVAL    kaç saniyede bir kontrol (vars: 60)
#    PM2_NAME    pm2 uygulama adı        (vars: perseonix)
# ============================================================================
set -uo pipefail

REPO_DIR="${REPO_DIR:-/root/perseonix}"
APP_SUBDIR="${APP_SUBDIR:-perseonix-ui}"
BRANCH="${BRANCH:-main}"
INTERVAL="${INTERVAL:-60}"
PM2_NAME="${PM2_NAME:-perseonix}"

export PATH="/usr/local/bin:/usr/bin:/bin:${HOME:-/root}/.npm-global/bin:$PATH"
APP_DIR="$REPO_DIR/$APP_SUBDIR"

log() { echo "[$(date '+%F %T')] $*"; }

cd "$REPO_DIR" 2>/dev/null || { log "HATA: REPO_DIR yok → $REPO_DIR"; exit 1; }

log "auto-deploy başladı — repo:$REPO_DIR  app:$APP_DIR  ($BRANCH), her ${INTERVAL}s"

while true; do
  if git fetch origin "$BRANCH" --quiet 2>/dev/null; then
    LOCAL="$(git rev-parse HEAD 2>/dev/null || echo none)"
    REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "$LOCAL")"

    if [ "$LOCAL" != "$REMOTE" ]; then
      log "yeni sürüm: ${LOCAL:0:7} → ${REMOTE:0:7} — deploy ediliyor…"

      # Repoyu remote'un tam kopyası yap (git dışı .env.local/.data korunur)
      git reset --hard "origin/$BRANCH"

      cd "$APP_DIR" 2>/dev/null || { log "HATA: APP_DIR yok → $APP_DIR"; cd "$REPO_DIR"; sleep "$INTERVAL"; continue; }

      # Bağımlılıklar değiştiyse kur (lockfile varsa ci, yoksa install)
      if ! git -C "$REPO_DIR" diff --quiet "$LOCAL" "$REMOTE" -- "$APP_SUBDIR/package.json" "$APP_SUBDIR/package-lock.json" 2>/dev/null; then
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

      cd "$REPO_DIR"
    fi
  else
    log "git fetch başarısız (ağ/erişim?) — sonraki turda tekrar denenecek"
  fi

  sleep "$INTERVAL"
done
