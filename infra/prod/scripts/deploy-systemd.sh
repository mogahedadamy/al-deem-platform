#!/usr/bin/env bash
# إصدار ذري قابل للاسترجاع: يبني release immutable ثم يبدّل /opt/deem/current بعد health gate.
# يشغل من جذر المستودع platform/ ويتطلب: sudo, rsync, git, pnpm, Go.
set -euo pipefail

cd "$(dirname "$0")/../../.."
ROOT="$(pwd)"
APP_DIR=/opt/deem
RETAIN_RELEASES="${DEEM_RETAIN_RELEASES:-5}"
SERVICES=(deem-core-api deem-worker deem-www deem-learn deem-erp)

require() { command -v "$1" >/dev/null || { echo "✗ missing dependency: $1" >&2; exit 1; }; }
for dependency in git rsync pnpm go sudo; do require "$dependency"; done

# لا يجوز نشر شجرة غير قابلة لإعادة الإنتاج أو بلا commit موثق.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "✗ working tree is not clean; commit or stash every change before production release" >&2
  exit 1
fi
COMMIT=$(git rev-parse --verify HEAD)
SHORT_COMMIT=$(git rev-parse --short=12 HEAD)
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE_ID="$STAMP-$SHORT_COMMIT"
RELEASE="$APP_DIR/releases/$RELEASE_ID"

# الأسرار خارج الشجرة ولا تقبل القوالب/القيم الفارغة الحساسة.
sudo mkdir -p "$APP_DIR"/{env,releases} /var/lib/deem/private/receipts /var/backups/deem /etc/deem
for ENV in core-api www learn erp backup; do
  target="$APP_DIR/env/$ENV.env"
  if [[ ! -f "$target" ]]; then
    sudo install -m 600 "infra/prod/env.$ENV" "$target"
    echo "✗ created $target; populate production secrets and rerun" >&2
    exit 1
  fi
done
# learn/erp are public OIDC clients, therefore AUTH_KEYCLOAK_SECRET is
# intentionally empty. AUTH_SECRET and Zoom's webhook secret must not be.
if sudo grep -R -E -q 'CHANGE_ME|replace-with-random|^AUTH_SECRET=$|^ZOOM_WEBHOOK_SECRET=$' "$APP_DIR/env"; then
  echo "✗ production environment contains placeholder or blank critical secret" >&2
  exit 1
fi
if [[ ! -f /etc/deem/backup.key ]]; then
  echo "✗ create /etc/deem/backup.key (random, chmod 600, outside Git) before deployment" >&2
  exit 1
fi
sudo chown mojahed:mojahed /etc/deem/backup.key /var/backups/deem
sudo chmod 600 /etc/deem/backup.key
# /etc/deem is traversable by the backup service account, while the key itself
# remains 0600 and owned by that account; directory contents cannot be listed.
sudo chmod 700 /var/lib/deem/private /var/lib/deem/private/receipts
sudo chmod 711 /etc/deem

# Build before touching the current release.
echo "── Building release $RELEASE_ID from $COMMIT"
pnpm --filter www build
pnpm --filter learn build
pnpm --filter erp build
(
  cd services/core-api
  CGO_ENABLED=0 go build -o /tmp/deem-core-api ./cmd/api
  CGO_ENABLED=0 go build -o /tmp/deem-worker ./cmd/worker
)

# Populate an immutable, versioned source tree. node_modules is included so the
# running release never depends on a mutable checkout or package install.
sudo mkdir -p "$RELEASE"
sudo rsync -a --delete \
  --exclude=.git --exclude=.env --exclude=.env.local --exclude=test-results \
  "$ROOT/" "$RELEASE/"
# rsync --delete above deliberately mirrors the source tree, so create release
# binaries only afterwards; otherwise the empty bin directory is removed.
sudo mkdir -p "$RELEASE/bin"
sudo install -m 755 /tmp/deem-core-api "$RELEASE/bin/core-api"
sudo install -m 755 /tmp/deem-worker "$RELEASE/bin/worker"
printf '%s\n' "$COMMIT" | sudo tee "$RELEASE/REVISION" >/dev/null
sudo chmod -R a-w "$RELEASE"
sudo chmod a+rx "$RELEASE" "$RELEASE/bin" "$RELEASE/bin/core-api" "$RELEASE/bin/worker"

# Install reproducible unit definitions, then atomically select the release.
sudo install -m 644 infra/prod/systemd/deem-*.service infra/prod/systemd/deem-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
PREVIOUS=""
if [[ -L "$APP_DIR/current" ]]; then PREVIOUS=$(readlink -f "$APP_DIR/current"); fi
sudo ln -s "$RELEASE" "$APP_DIR/current.next"
sudo mv -Tf "$APP_DIR/current.next" "$APP_DIR/current"

rollback() {
  echo "✗ health gate failed; restoring previous release" >&2
  if [[ -n "$PREVIOUS" ]]; then
    sudo ln -s "$PREVIOUS" "$APP_DIR/current.next"
    sudo mv -Tf "$APP_DIR/current.next" "$APP_DIR/current"
    sudo systemctl restart "${SERVICES[@]}" || true
  fi
  exit 1
}

for service in "${SERVICES[@]}"; do
  sudo systemctl enable "$service"
  sudo systemctl restart "$service" || rollback
done
sudo systemctl enable --now deem-backup.timer deem-healthcheck.timer
sleep 3
sudo "$APP_DIR/current/infra/prod/scripts/healthcheck.sh" || rollback

# احتفظ بآخر الإصدارات فقط؛ لا تحذف current أو الإصدار السابق للاسترجاع السريع.
mapfile -t old_releases < <(sudo find "$APP_DIR/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +$((RETAIN_RELEASES + 1)) | cut -d' ' -f2-)
for old in "${old_releases[@]:-}"; do
  [[ "$old" == "$RELEASE" || "$old" == "$PREVIOUS" ]] && continue
  sudo rm -rf -- "$old"
done

echo "✓ deployed $RELEASE_ID ($COMMIT)"
echo "✓ current -> $(readlink -f "$APP_DIR/current")"
