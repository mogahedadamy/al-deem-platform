#!/usr/bin/env bash
# نسخة PostgreSQL يومية مشفّرة مع نسخ خارج الخادم واختبار استعادة أسبوعي.
# المتطلبات: docker, openssl, rclone، وملف مفتاح AES-256 محمي (0600).
# الاستخدام: ./backup.sh [directory]

set -euo pipefail
umask 077

BACKUP_DIR="${1:-/var/backups/deem}"
STAMP=$(date +%F-%H%M)
CONTAINER="${DEEM_PG_CONTAINER:-deem-postgres}"
KEEP_DAYS="${DEEM_BACKUP_KEEP_DAYS:-30}"
KEY_FILE="${DEEM_BACKUP_KEY_FILE:?DEEM_BACKUP_KEY_FILE is required}"
OFFSITE_URI="${DEEM_BACKUP_OFFSITE_URI:?DEEM_BACKUP_OFFSITE_URI is required}"

if [[ ! -r "$KEY_FILE" ]]; then
  echo "✗ backup encryption key is not readable: $KEY_FILE" >&2
  exit 1
fi
for dependency in docker openssl rclone; do
  command -v "$dependency" >/dev/null || { echo "✗ missing backup dependency: $dependency" >&2; exit 1; }
done

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/deem-$STAMP.sql.gz.enc"
CRYPT=(openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$KEY_FILE")
DECRYPT=(openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$KEY_FILE")

# لا تُكتب نسخة SQL غير مشفّرة على القرص المحلي.
docker exec "$CONTAINER" pg_dump -U deem deem | gzip -c | "${CRYPT[@]}" > "$OUT"
echo "✓ encrypted backup: $OUT ($(du -h "$OUT" | cut -f1))"

# تحقق من إمكانية فك التشفير وصحة dump قبل نسخه خارج الخادم.
HEADER=$("${DECRYPT[@]}" -in "$OUT" | zcat 2>/dev/null | sed -n '1,3p' || true)
if ! grep -q "PostgreSQL database dump" <<<"$HEADER"; then
  rm -f "$OUT"
  echo "✗ encrypted backup integrity check failed" >&2
  exit 1
fi
echo "✓ encrypted backup integrity confirmed"

# نسخة خارج الخادم إلزامية؛ يضبط المسار بصيغة rclone مثل remote:deem-backups.
rclone copy "$OUT" "${OFFSITE_URI%/}/"
echo "✓ off-host copy completed: $OFFSITE_URI"

# الاحتفاظ المحلي المحدود، مع بقاء سياسة احتفاظ مستقلة على remote.
find "$BACKUP_DIR" -name "deem-*.sql.gz.enc" -mtime +"$KEEP_DAYS" -delete
echo "✓ backups older than $KEEP_DAYS days removed locally"

# Restore drill أسبوعيًا في قاعدة منفصلة؛ أي failure ينظف الهدف ويخرج non-zero.
if [[ "$(date +%u)" == "7" ]]; then
  drill_db="deem_restore_drill"
  cleanup_drill() {
    docker exec "$CONTAINER" psql -U deem -d postgres -c "DROP DATABASE IF EXISTS $drill_db;" >/dev/null 2>&1 || true
  }
  cleanup_drill
  docker exec "$CONTAINER" psql -U deem -d postgres -c "CREATE DATABASE $drill_db OWNER deem;" >/dev/null
  if ! "${DECRYPT[@]}" -in "$OUT" | zcat | docker exec -i "$CONTAINER" psql -U deem -d "$drill_db" -q >/dev/null; then
    cleanup_drill
    echo "✗ restore drill failed" >&2
    exit 1
  fi
  COUNT=$(docker exec "$CONTAINER" psql -U deem -d "$drill_db" -t -A -c "SELECT count(*) FROM profiles")
  SRC=$(docker exec "$CONTAINER" psql -U deem -d deem -t -A -c "SELECT count(*) FROM profiles")
  cleanup_drill
  if [[ "$COUNT" != "$SRC" || "$COUNT" == "0" ]]; then
    echo "✗ restore drill mismatch: $COUNT != $SRC" >&2
    exit 1
  fi
  echo "✓ restore drill successful: profiles $COUNT = $SRC"
fi
