#!/usr/bin/env bash
# النسخ الاحتياطي اليومي لقاعدة بيانات deem (Blueprint 19: backups + restore drill).
# الاستخدام: ./backup.sh [directory]
# ملاحظة: pg_dump 17 داخل الحاوية deem-postgres (عميل 16 لا يصلح للسيرفر 17).

set -euo pipefail

BACKUP_DIR="${1:-/var/backups/deem}"
STAMP=$(date +%F-%H%M)
CONTAINER="${DEEM_PG_CONTAINER:-deem-postgres}"
KEEP_DAYS="${DEEM_BACKUP_KEEP_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/deem-$STAMP.sql.gz"

# النسخ (dump داخل الحاوية → gzip خارجها)
docker exec "$CONTAINER" pg_dump -U deem deem | gzip > "$OUT"
echo "✓ backup: $OUT ($(du -h "$OUT" | cut -f1))"

# فحص سلامة: أول سطر فيه PostgreSQL database dump (بلا SIGPIPE من head)
HEADER=$(zcat "$OUT" 2>/dev/null | sed -n '1,3p' || true)
if ! echo "$HEADER" | grep -q "PostgreSQL database dump"; then
  echo "✗ فحص السلامة فشل — النسخة تالفة!" >&2
  exit 1
fi
echo "✓ سلامة النسخة مؤكدة"

# تنظيف النسخ الأقدم من KEEP_DAYS
find "$BACKUP_DIR" -name "deem-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "✓ نسخ أقدم من $KEEP_DAYS يومًا نُظّفت"

# ---- Restore drill (أسبوعيًا: يوم الأحد) ----
if [ "$(date +%u)" = "7" ]; then
  docker exec "$CONTAINER" psql -U deem -d postgres -c "DROP DATABASE IF EXISTS deem_restore_drill;" >/dev/null
  docker exec "$CONTAINER" psql -U deem -d postgres -c "CREATE DATABASE deem_restore_drill OWNER deem;" >/dev/null
  if zcat "$OUT" | docker exec -i "$CONTAINER" psql -U deem -d deem_restore_drill -q 2>/dev/null; then
    COUNT=$(docker exec "$CONTAINER" psql -U deem -d deem_restore_drill -t -A -c "SELECT count(*) FROM profiles" 2>/dev/null || echo 0)
    SRC=$(docker exec "$CONTAINER" psql -U deem -d deem -t -A -c "SELECT count(*) FROM profiles")
    if [ "$COUNT" = "$SRC" ] && [ "$COUNT" != "0" ]; then
      echo "✓ restore drill ناجح: profiles $COUNT = $SRC"
    else
      echo "✗ restore drill mismatch: $COUNT ≠ $SRC" >&2
      exit 1
    fi
    docker exec "$CONTAINER" psql -U deem -d postgres -c "DROP DATABASE deem_restore_drill;" >/dev/null
  fi
fi
