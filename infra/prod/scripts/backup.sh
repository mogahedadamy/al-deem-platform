#!/usr/bin/env bash
# نسخة يومية مشفرة لقاعدتي المنصة والهوية والإيصالات الخاصة، مع نسخ خارج
# الخادم واختبار استعادة أسبوعي. لا تكتب بيانات SQL أو إيصالات غير مشفرة في
# BACKUP_DIR؛ الاستثناء الوحيد مجلد مؤقت معزول أثناء restore drill.
# الاستخدام: ./backup.sh [directory]

set -euo pipefail
umask 077

BACKUP_DIR="${1:-/var/backups/deem}"
STAMP="$(date +%F-%H%M%S)"
RUN_ID="deem-$STAMP"
RUN_DIR="$BACKUP_DIR/$RUN_ID"
CONTAINER="${DEEM_PG_CONTAINER:-deem-postgres}"
PG_USER="${DEEM_POSTGRES_USER:-deem}"
APP_DB="${DEEM_APP_DATABASE:-deem}"
IDENTITY_DB="${DEEM_IDENTITY_DATABASE:-zitadel}"
RECEIPTS_DIR="${DEEM_PRIVATE_RECEIPTS_DIR:-/var/lib/deem/private/receipts}"
KEEP_DAYS="${DEEM_BACKUP_KEEP_DAYS:-30}"
KEY_FILE="${DEEM_BACKUP_KEY_FILE:?DEEM_BACKUP_KEY_FILE is required}"
OFFSITE_URI="${DEEM_BACKUP_OFFSITE_URI:?DEEM_BACKUP_OFFSITE_URI is required}"
APP_DRILL_DB="${DEEM_APP_RESTORE_DRILL_DB:-deem_restore_drill}"
IDENTITY_DRILL_DB="${DEEM_IDENTITY_RESTORE_DRILL_DB:-zitadel_restore_drill}"
FORCE_DRILL="${DEEM_BACKUP_FORCE_RESTORE_DRILL:-0}"

APP_OUT="$RUN_DIR/$APP_DB.sql.gz.enc"
IDENTITY_OUT="$RUN_DIR/$IDENTITY_DB.sql.gz.enc"
RECEIPTS_OUT="$RUN_DIR/receipts.tar.gz.enc"
CHECKSUMS_OUT="$RUN_DIR/SHA256SUMS"
REMOTE_RUN="${OFFSITE_URI%/}/$RUN_ID"
RESTORE_DIR=""
DRILL_STARTED=0
RUN_COMPLETE=0
REMOTE_MARKER_PUBLISHED=0

CRYPT=(openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$KEY_FILE")
DECRYPT=(openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$KEY_FILE")

fail() {
  echo "✗ $*" >&2
  exit 1
}

validate_identifier() {
  local value="$1"
  local label="$2"
  [[ "$value" =~ ^[a-z][a-z0-9_]*$ ]] || fail "$label contains an unsafe PostgreSQL identifier"
}

drop_drill_database() {
  local database="$1"
  [[ "$database" =~ _restore_drill$ ]] || fail "refusing to drop non-drill database: $database"
  docker exec "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS \"$database\" WITH (FORCE);" >/dev/null
}

cleanup() {
  local status=$?
  if [[ "$DRILL_STARTED" == "1" ]]; then
    drop_drill_database "$APP_DRILL_DB" >/dev/null 2>&1 || true
    drop_drill_database "$IDENTITY_DRILL_DB" >/dev/null 2>&1 || true
  fi
  if [[ -n "$RESTORE_DIR" && -d "$RESTORE_DIR" ]]; then
    rm -rf -- "$RESTORE_DIR"
  fi
  if [[ "$RUN_COMPLETE" != "1" && -d "$RUN_DIR" ]]; then
    rm -rf -- "$RUN_DIR"
  fi
  # SHA256SUMS is the remote completion marker. Never leave it published for
  # a set whose final remote comparison failed.
  if [[ "$RUN_COMPLETE" != "1" && "$REMOTE_MARKER_PUBLISHED" == "1" ]]; then
    rclone deletefile "$REMOTE_RUN/SHA256SUMS" >/dev/null 2>&1 || true
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

for dependency in docker openssl rclone gzip tar sha256sum find sort xargs; do
  command -v "$dependency" >/dev/null || fail "missing backup dependency: $dependency"
done
[[ -r "$KEY_FILE" ]] || fail "backup encryption key is not readable: $KEY_FILE"
[[ -d "$RECEIPTS_DIR" && -r "$RECEIPTS_DIR" ]] || fail "private receipts directory is not readable: $RECEIPTS_DIR"
[[ "$APP_DB" != "$IDENTITY_DB" ]] || fail "application and identity databases must be different"
[[ "$KEEP_DAYS" =~ ^[0-9]+$ ]] || fail "DEEM_BACKUP_KEEP_DAYS must be a non-negative integer"
validate_identifier "$APP_DB" "DEEM_APP_DATABASE"
validate_identifier "$IDENTITY_DB" "DEEM_IDENTITY_DATABASE"
validate_identifier "$APP_DRILL_DB" "DEEM_APP_RESTORE_DRILL_DB"
validate_identifier "$IDENTITY_DRILL_DB" "DEEM_IDENTITY_RESTORE_DRILL_DB"
[[ "$APP_DRILL_DB" != "$APP_DB" && "$APP_DRILL_DB" != "$IDENTITY_DB" ]] || fail "application drill database overlaps a source database"
[[ "$IDENTITY_DRILL_DB" != "$APP_DB" && "$IDENTITY_DRILL_DB" != "$IDENTITY_DB" ]] || fail "identity drill database overlaps a source database"
[[ "$APP_DRILL_DB" != "$IDENTITY_DRILL_DB" ]] || fail "restore drill databases must be different"
[[ "$APP_DRILL_DB" =~ _restore_drill$ && "$IDENTITY_DRILL_DB" =~ _restore_drill$ ]] || fail "restore drill databases must end with _restore_drill"

mkdir -p "$BACKUP_DIR"
[[ ! -e "$RUN_DIR" ]] || fail "backup run directory already exists: $RUN_DIR"
mkdir -m 0700 "$RUN_DIR"

backup_database() {
  local database="$1"
  local output="$2"
  docker exec "$CONTAINER" pg_dump -U "$PG_USER" --no-owner --no-privileges "$database" \
    | gzip -c \
    | "${CRYPT[@]}" > "$output"
  [[ -s "$output" ]] || fail "database backup is empty: $database"
  echo "✓ encrypted database backup: $database ($(du -h "$output" | cut -f1))"
}

verify_database_backup() {
  local database="$1"
  local input="$2"
  local header
  "${DECRYPT[@]}" -in "$input" | gzip -t
  header=$("${DECRYPT[@]}" -in "$input" | gzip -dc | sed -n '1,8p')
  grep -q "PostgreSQL database dump" <<<"$header" || fail "database backup integrity check failed: $database"
  echo "✓ database backup integrity confirmed: $database"
}

backup_database "$APP_DB" "$APP_OUT"
backup_database "$IDENTITY_DB" "$IDENTITY_OUT"

tar -C "$RECEIPTS_DIR" -cf - . | gzip -c | "${CRYPT[@]}" > "$RECEIPTS_OUT"
[[ -s "$RECEIPTS_OUT" ]] || fail "receipts backup is empty"
echo "✓ encrypted private receipts backup ($(du -h "$RECEIPTS_OUT" | cut -f1))"

verify_database_backup "$APP_DB" "$APP_OUT"
verify_database_backup "$IDENTITY_DB" "$IDENTITY_OUT"
"${DECRYPT[@]}" -in "$RECEIPTS_OUT" | gzip -dc | tar -tf - >/dev/null
echo "✓ private receipts archive integrity confirmed"

(
  cd "$RUN_DIR"
  sha256sum "$(basename "$APP_OUT")" "$(basename "$IDENTITY_OUT")" "$(basename "$RECEIPTS_OUT")" > "$(basename "$CHECKSUMS_OUT")"
  sha256sum -c "$(basename "$CHECKSUMS_OUT")" >/dev/null
)
echo "✓ encrypted artifact checksums confirmed"

tree_digest() {
  local directory="$1"
  (
    cd "$directory"
    find . -type f -print0 | sort -z | xargs -0 -r sha256sum
  ) | sha256sum | cut -d' ' -f1
}

database_table_count() {
  local database="$1"
  docker exec "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$database" -t -A \
    -c "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type='BASE TABLE';"
}

restore_database() {
  local input="$1"
  local target="$2"
  drop_drill_database "$target"
  docker exec "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d postgres \
    -c "CREATE DATABASE \"$target\" OWNER \"$PG_USER\";" >/dev/null
  "${DECRYPT[@]}" -in "$input" | gzip -dc \
    | docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$target" -q >/dev/null
}

# الأحد افتراضيًا، أو في أي يوم عند DEEM_BACKUP_FORCE_RESTORE_DRILL=1.
if [[ "$(date +%u)" == "7" || "$FORCE_DRILL" == "1" ]]; then
  DRILL_STARTED=1
  restore_database "$APP_OUT" "$APP_DRILL_DB"
  restore_database "$IDENTITY_OUT" "$IDENTITY_DRILL_DB"

  for pair in "$APP_DB:$APP_DRILL_DB" "$IDENTITY_DB:$IDENTITY_DRILL_DB"; do
    source_db="${pair%%:*}"
    restored_db="${pair##*:}"
    source_tables="$(database_table_count "$source_db")"
    restored_tables="$(database_table_count "$restored_db")"
    [[ "$source_tables" -gt 0 && "$source_tables" == "$restored_tables" ]] \
      || fail "restore drill schema mismatch: $source_db=$source_tables, $restored_db=$restored_tables"
  done

  RESTORE_DIR="$(mktemp -d /tmp/alameed-backup-drill.XXXXXX)"
  "${DECRYPT[@]}" -in "$RECEIPTS_OUT" | gzip -dc \
    | tar --no-same-owner --no-same-permissions -xf - -C "$RESTORE_DIR"
  [[ "$(tree_digest "$RECEIPTS_DIR")" == "$(tree_digest "$RESTORE_DIR")" ]] \
    || fail "private receipts restore drill content mismatch"

  drop_drill_database "$APP_DRILL_DB"
  drop_drill_database "$IDENTITY_DRILL_DB"
  DRILL_STARTED=0
  rm -rf -- "$RESTORE_DIR"
  RESTORE_DIR=""
  echo "✓ restore drill successful: $APP_DB, $IDENTITY_DB, and private receipts"
fi

# ننسخ القطع أولاً ونقارنها بالنسخة الخارجية، ثم ننشر SHA256SUMS كعلامة
# اكتمال. بذلك لا تظهر مجموعة جاهزة للاستعادة إذا انقطع النقل منتصفه.
rclone copy "$RUN_DIR" "$REMOTE_RUN/" --exclude SHA256SUMS
rclone check "$RUN_DIR" "$REMOTE_RUN/" --one-way --exclude SHA256SUMS
rclone copyto "$CHECKSUMS_OUT" "$REMOTE_RUN/SHA256SUMS"
REMOTE_MARKER_PUBLISHED=1
rclone check "$RUN_DIR" "$REMOTE_RUN/" --one-way
echo "✓ off-host backup set copied and verified: $REMOTE_RUN/"

RUN_COMPLETE=1

# احتفاظ محلي محدود. النسخ الخارجية لها سياسة احتفاظ مستقلة لدى المزود.
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'deem-*' -mtime "+$KEEP_DAYS" -exec rm -rf -- {} +
# تنظيف صيغة النسخ القديمة بعد انتهاء فترة الاحتفاظ، من دون حذفها فور الترقية.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'deem-*.sql.gz.enc' -mtime "+$KEEP_DAYS" -delete
echo "✓ local backup sets older than $KEEP_DAYS days removed"
