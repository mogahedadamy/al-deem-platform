#!/usr/bin/env bash
# النشر الكامل: بناء → /opt/deem (بلا مسافات) → systemd
# يحتاج sudo. يشغل من جذر المستودع platform/.
set -euo pipefail
cd "$(dirname "$0")/../.."
ROOT="$(pwd)"
APP_DIR=/opt/deem

echo "── 1. بناء Go (core-api + worker):"
(cd services/core-api && CGO_ENABLED=0 go build -o /tmp/deem-core-api ./cmd/api && CGO_ENABLED=0 go build -o /tmp/deem-worker ./cmd/worker)

echo "── 2. بناء Next.js (www + learn + erp):"
for APP in www learn erp; do
  (cd apps/$APP && npx next build) | tail -1
done

echo "── 3. التثبيت إلى $APP_DIR:"
sudo mkdir -p $APP_DIR/{env,apps,scripts}
sudo install -m 755 /tmp/deem-core-api $APP_DIR/core-api
sudo install -m 755 /tmp/deem-worker $APP_DIR/worker
sudo install -m 755 infra/prod/scripts/backup.sh $APP_DIR/scripts/backup.sh

for APP in www learn erp; do
  sudo mkdir -p $APP_DIR/apps/$APP
  sudo rsync -a --delete apps/$APP/.next $APP_DIR/apps/$APP/
  sudo rsync -a apps/$APP/{package.json,next.config.ts,node_modules,public} $APP_DIR/apps/$APP/ 2>/dev/null || sudo rsync -a apps/$APP/package.json apps/$APP/next.config.ts apps/$APP/node_modules apps/$APP/public $APP_DIR/apps/$APP/
  echo "  ✓ $APP"
done

echo "── 4. ملفات env (600 — عدّل الأسرار قبل التفعيل!):"
for S in core-api www learn erp; do
  DST="$APP_DIR/env/$S.env"
  if [ ! -f "$DST" ]; then
    sudo install -m 600 "infra/prod/env.$S" "$DST"
    echo "  ✓ $DST (نسخة أولية)"
  else
    echo "  · $DST موجود (لم يُمسّ)"
  fi
done

echo "── 5. وحدات systemd:"
sudo install -m 644 infra/prod/systemd/deem-*.service infra/prod/systemd/deem-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
for S in deem-core-api deem-worker deem-www deem-learn deem-erp; do
  sudo systemctl enable --now "$S"
  echo "  ✓ $S: $(systemctl is-active $S)"
done
sudo systemctl enable --now deem-backup.timer
echo "  ✓ deem-backup.timer: $(systemctl is-active deem-backup.timer)"

echo ""
echo "═══ الحالة:"
systemctl list-units 'deem-*' --no-pager --plain
