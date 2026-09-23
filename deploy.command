#!/usr/bin/env bash
# ============================================================================
#  PERSEONIX  —  SUNUCUYA KOPYALA (sadece kopyalar!)
#  ----------------------------------------------------------------------------
#  BU DOSYAYA FINDER'DA ÇİFT TIKLA.
#
#  NE YAPAR:  Mac'teki projenin DEĞİŞEN dosyalarını sunucuna kopyalar. HEPSİ BU.
#  NE YAPMAZ: kurmaz (npm install), build etmez, başlatmaz.
#             → Başlatma/durdurma/log işini sen sunucuda (Termius) elle yaparsın.
#
#  Sunucudaki gizli anahtarların (.env.local), veritabanın (.data) ve
#  node_modules KORUNUR — bunlara dokunmaz.
# ============================================================================
set -euo pipefail

# --- Projenin Mac'teki yeri ---
PROJECT_DIR="$HOME/Desktop/Perseonix/perseonix-ui"
cd "$PROJECT_DIR"

# --- Sunucu bilgisi (.env.deploy dosyasından) ---
#     DEPLOY_HOST=perseonix@172.22.1.3
#     DEPLOY_PATH=/home/perseonix/perseonix-ui
source .env.deploy

echo "════════════════════════════════════════════════════"
echo "  PERSEONIX → $DEPLOY_HOST:$DEPLOY_PATH"
echo "  (yalnızca dosya kopyalama)"
echo "════════════════════════════════════════════════════"

# Tek SSH bağlantısı → şifre yalnızca 1 kez sorulur
SSH="ssh -o ControlMaster=auto -o ControlPath=/tmp/px-deploy-%C -o ControlPersist=180"

echo "→ Sunucuda klasör hazırlanıyor (şifre burada sorulur)…"
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

echo ""
echo "✅ KOPYALANDI."
echo ""
echo "Şimdi sunucuda (Termius) ne yapacağın:"
echo "  cd $DEPLOY_PATH"
echo "  • İlk kez:        npm install"
echo "  •                 sudo npm install -g pm2   (pm2 yoksa, tek sefer)"
echo "  •                 pm2 start npx --name perseonix -- next dev -H 0.0.0.0 -p 3000 && pm2 save"
echo "  • Kod değişince:  pm2 restart perseonix"
echo "  • Log/hata:       pm2 logs perseonix"
echo "  (Bu pencereyi kapatabilirsin.)"
