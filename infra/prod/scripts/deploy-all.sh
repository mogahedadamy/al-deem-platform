#!/usr/bin/env bash
# Bootstrap and deploy Al Deem Platform v2 on a fresh Ubuntu server.
# Run as the deployment user (mojahed), not with sudo.
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP_USER="${APP_USER:-mojahed}"
GO_VERSION="${GO_VERSION:-1.25.13}"
APP_DIR="/opt/deem"
DOCKER_DIR="$REPO_ROOT/infra/docker"
PROD_ENV="$APP_DIR/env/docker.env"
CADDY_SOURCE="$REPO_ROOT/Caddyfile.al-deem-v2"
CADDY_SITE="/etc/caddy/Caddyfile.al-deem"
BACKUP_OFFSITE_URI="${DEEM_BACKUP_OFFSITE_URI:-}"

existing_env_value() {
  local file="$APP_DIR/env/$1.env" key="$2"
  [[ -r "$file" ]] || return 1
  sed -n "s/^${key}=//p" "$file" | head -n 1
}

log() { printf '\n==> %s\n' "$*"; }
fatal() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
need_cmd() { command -v "$1" >/dev/null 2>&1 || fatal "missing command: $1"; }

[[ "$(id -un)" == "$APP_USER" ]] || fatal "run as $APP_USER without sudo: bash infra/prod/scripts/deploy-all.sh"
git -C "$REPO_ROOT" diff --quiet && git -C "$REPO_ROOT" diff --cached --quiet || fatal "working tree is not clean"
git -C "$REPO_ROOT" diff --name-only --diff-filter=U | grep -q . && fatal "repository has unresolved merge conflicts" || true

log "Installing Ubuntu packages"
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl git jq openssl build-essential rsync wget gnupg \
  debian-keyring debian-archive-keyring apt-transport-https ufw rclone

log "Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$APP_USER" || true
need_cmd docker
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then DOCKER=(sudo docker); fi
"${DOCKER[@]}" compose version >/dev/null 2>&1 || fatal "Docker Compose plugin is unavailable; install docker compose v2"

log "Installing Go $GO_VERSION"
if ! /usr/local/go/bin/go version 2>/dev/null | grep -q "go$GO_VERSION"; then
  tmp_go="$(mktemp --suffix=.tar.gz)"
  curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o "$tmp_go"
  sudo rm -rf /usr/local/go
  sudo tar -C /usr/local -xzf "$tmp_go"
  rm -f "$tmp_go"
fi
sudo ln -sfn /usr/local/go/bin/go /usr/local/bin/go
sudo ln -sfn /usr/local/go/bin/gofmt /usr/local/bin/gofmt
export PATH="/usr/local/go/bin:$HOME/go/bin:/usr/local/bin:$PATH"
need_cmd go

log "Installing Node.js 24 and pnpm"
if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q '^v24\.'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi
sudo npm install --global pnpm@11.7.0
need_cmd node
need_cmd pnpm

log "Installing goose"
if ! command -v goose >/dev/null 2>&1; then
  GOBIN="$HOME/go/bin" go install github.com/pressly/goose/v3/cmd/goose@latest
fi
sudo ln -sfn "$HOME/go/bin/goose" /usr/local/bin/goose
need_cmd goose

log "Installing Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y caddy
fi
need_cmd caddy

log "Opening firewall ports"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
if ! sudo ufw status | grep -q '^Status: active'; then
  sudo ufw --force enable
fi

log "Preparing production secrets"
if [[ ! -s "$APP_DIR/env/docker.env" && -z "${DEEM_POSTGRES_PASSWORD:-}" ]]; then
  read -rsp "PostgreSQL production password to set in Docker and API env: " DEEM_POSTGRES_PASSWORD
  printf '\n'
  [[ -n "$DEEM_POSTGRES_PASSWORD" ]] || fatal "PostgreSQL password is required"
fi
if [[ ! -s "$APP_DIR/env/docker.env" && -z "${KC_BOOTSTRAP_ADMIN_PASSWORD:-}" ]]; then
  read -rsp "Keycloak bootstrap admin password: " KC_BOOTSTRAP_ADMIN_PASSWORD
  printf '\n'
  [[ -n "$KC_BOOTSTRAP_ADMIN_PASSWORD" ]] || fatal "Keycloak admin password is required"
fi
if [[ -z "$BACKUP_OFFSITE_URI" ]]; then
  read -rp "Encrypted rclone backup destination (e.g. remote:alameedtraining-backups): " BACKUP_OFFSITE_URI
fi
[[ -n "$BACKUP_OFFSITE_URI" ]] || fatal "backup destination is required; configure rclone before deployment"
if [[ -s "$APP_DIR/env/docker.env" ]]; then
  # Reuse already-provisioned credentials on reruns; never silently rotate DB/Keycloak passwords.
  # shellcheck disable=SC1090
  source "$APP_DIR/env/docker.env"
  PG_PASSWORD="$DEEM_POSTGRES_PASSWORD"
  KC_PASSWORD="$KC_BOOTSTRAP_ADMIN_PASSWORD"
else
  PG_PASSWORD="${DEEM_POSTGRES_PASSWORD:-$(openssl rand -hex 24)}"
  KC_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD:-$(openssl rand -hex 24)}"
fi
AUTH_WWW="${AUTH_SECRET_WWW:-$(existing_env_value www AUTH_SECRET || true)}"
AUTH_LEARN="${AUTH_SECRET_LEARN:-$(existing_env_value learn AUTH_SECRET || true)}"
AUTH_ERP="${AUTH_SECRET_ERP:-$(existing_env_value erp AUTH_SECRET || true)}"
ZOOM_WEBHOOK_SECRET="${ZOOM_WEBHOOK_SECRET:-$(existing_env_value core-api ZOOM_WEBHOOK_SECRET || true)}"
AUTH_WWW="${AUTH_WWW:-$(openssl rand -base64 32)}"
AUTH_LEARN="${AUTH_LEARN:-$(openssl rand -base64 32)}"
AUTH_ERP="${AUTH_ERP:-$(openssl rand -base64 32)}"
ZOOM_WEBHOOK_SECRET="${ZOOM_WEBHOOK_SECRET:-$(openssl rand -hex 32)}"

sudo install -d -m 700 /etc/deem /var/lib/deem/private/receipts
sudo install -d -m 700 -o "$APP_USER" -g "$APP_USER" /var/backups/deem
if [[ ! -s /etc/deem/backup.key ]]; then
  openssl rand -base64 48 | sudo tee /etc/deem/backup.key >/dev/null
fi
sudo chown "$APP_USER:$APP_USER" /etc/deem/backup.key /var/backups/deem
sudo chmod 600 /etc/deem/backup.key
sudo chmod 700 /var/lib/deem/private /var/lib/deem/private/receipts

if [[ ! -s "$PROD_ENV" ]]; then
  cat > "$PROD_ENV" <<EOF
DEEM_POSTGRES_PASSWORD=$PG_PASSWORD
KC_BOOTSTRAP_ADMIN_PASSWORD=$KC_PASSWORD
KC_ENABLE_STUDENT_SELF_REGISTRATION=false
KC_ENABLE_EMAIL_VERIFICATION=false
KC_ENFORCE_GLOBAL_TOTP=false
PAYMENT_BANK_NAME=
PAYMENT_ACCOUNT_NAME=
PAYMENT_ACCOUNT_NUMBER=
PAYMENT_REFERENCE_HINT=
EOF
fi
chmod 600 "$PROD_ENV"
sudo chown "$APP_USER:$APP_USER" "$PROD_ENV"

sudo install -d -m 700 -o "$APP_USER" -g "$APP_USER" "$APP_DIR/env"
cat > "$APP_DIR/env/core-api.env" <<EOF
API_ADDR=:4001
DATABASE_URL=postgres://deem:$PG_PASSWORD@localhost:5435/deem?sslmode=disable
REDIS_URL=redis://localhost:6391/0
KEYCLOAK_URL=http://localhost:8091
KEYCLOAK_ISSUER=https://auth.alameedtraining.com/realms/al-deem
KEYCLOAK_ALLOWED_CLIENTS=learn,erp,www,core-api
KEYCLOAK_REQUIRED_AUDIENCE=core-api
KEYCLOAK_REALM=al-deem
KEYCLOAK_CLIENT_ID=core-api
ZOOM_WEBHOOK_SECRET=$ZOOM_WEBHOOK_SECRET
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
PRIVATE_STORAGE_DIR=/var/lib/deem/private
EOF
cat > "$APP_DIR/env/www.env" <<EOF
AUTH_SECRET=$AUTH_WWW
AUTH_URL=https://alameedtraining.com
AUTH_KEYCLOAK_ID=www
AUTH_KEYCLOAK_SECRET=
AUTH_KEYCLOAK_ISSUER=https://auth.alameedtraining.com/realms/al-deem
NEXT_PUBLIC_API_URL=https://api.alameedtraining.com/v1
NODE_USE_SYSTEM_CA=1
EOF
cat > "$APP_DIR/env/learn.env" <<EOF
AUTH_SECRET=$AUTH_LEARN
AUTH_URL=https://learn.alameedtraining.com
AUTH_KEYCLOAK_ID=learn
AUTH_KEYCLOAK_SECRET=
AUTH_KEYCLOAK_ISSUER=https://auth.alameedtraining.com/realms/al-deem
NEXT_PUBLIC_API_URL=https://api.alameedtraining.com/v1
NODE_USE_SYSTEM_CA=1
EOF
cat > "$APP_DIR/env/erp.env" <<EOF
AUTH_SECRET=$AUTH_ERP
AUTH_URL=https://erp.alameedtraining.com
AUTH_KEYCLOAK_ID=erp
AUTH_KEYCLOAK_SECRET=
AUTH_KEYCLOAK_ISSUER=https://auth.alameedtraining.com/realms/al-deem
NEXT_PUBLIC_API_URL=https://api.alameedtraining.com/v1
NODE_USE_SYSTEM_CA=1
EOF
cat > "$APP_DIR/env/backup.env" <<EOF
DEEM_BACKUP_KEY_FILE=/etc/deem/backup.key
DEEM_BACKUP_OFFSITE_URI=$BACKUP_OFFSITE_URI
DEEM_BACKUP_KEEP_DAYS=30
DEEM_PG_CONTAINER=deem-postgres
EOF
sudo chown "$APP_USER:$APP_USER" "$APP_DIR"/env/*.env
sudo chmod 600 "$APP_DIR"/env/*.env

log "Starting PostgreSQL and Redis"
cd "$REPO_ROOT"
"${DOCKER[@]}" compose -f "$DOCKER_DIR/compose.yaml" -f "$DOCKER_DIR/compose.prod.yaml" \
  --env-file "$PROD_ENV" up -d postgres redis
if ! "${DOCKER[@]}" exec deem-postgres pg_isready -U deem -d deem >/dev/null 2>&1; then
  fatal "PostgreSQL container is not accepting connections; inspect docker compose logs"
fi
for attempt in $(seq 1 30); do
  if "${DOCKER[@]}" inspect --format '{{.State.Health.Status}}' deem-postgres 2>/dev/null | grep -q healthy; then break; fi
  [[ "$attempt" == 30 ]] && fatal "PostgreSQL did not become healthy"
  sleep 2
done

log "Creating Keycloak database if absent"
"${DOCKER[@]}" exec deem-postgres psql -U deem -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='keycloak'" | grep -q 1 \
  || "${DOCKER[@]}" exec deem-postgres psql -U deem -d postgres -c 'CREATE DATABASE keycloak OWNER deem;'

log "Starting Keycloak"
"${DOCKER[@]}" compose -f "$DOCKER_DIR/compose.yaml" -f "$DOCKER_DIR/compose.prod.yaml" \
  --env-file "$PROD_ENV" up -d keycloak
for attempt in $(seq 1 60); do
  if curl -fsS --max-time 3 http://127.0.0.1:8091/realms/master/.well-known/openid-configuration >/dev/null 2>&1; then break; fi
  [[ "$attempt" == 60 ]] && fatal "Keycloak did not become ready"
  sleep 3
done

log "Running database migrations"
DB_URL="postgres://deem:$PG_PASSWORD@localhost:5435/deem?sslmode=disable"
(cd "$REPO_ROOT/services/core-api" && goose -dir migrations postgres "$DB_URL" up)

log "Configuring Keycloak realm"
KC_ADMIN_USER=deem-admin KC_ADMIN_PASSWORD="$KC_PASSWORD" \
  KC_ENABLE_STUDENT_SELF_REGISTRATION=false KC_ENABLE_EMAIL_VERIFICATION=false \
  KC_OWNER_USERNAME="${KC_OWNER_USERNAME:-}" \
  "$REPO_ROOT/infra/prod/scripts/configure-keycloak.sh"
# Provision a random confidential-client secret through the Admin API and store
# it only in the protected service env file, never in the repository realm JSON.
if [[ -z "$(existing_env_value core-api KEYCLOAK_CLIENT_SECRET || true)" ]]; then
  CORE_API_CLIENT_SECRET="$(openssl rand -hex 32)"
else
  CORE_API_CLIENT_SECRET="$(existing_env_value core-api KEYCLOAK_CLIENT_SECRET)"
fi
if [[ -n "$CORE_API_CLIENT_SECRET" ]]; then
  admin_token="$(curl -fsS -d client_id=admin-cli -d grant_type=password \
    --data-urlencode "username=deem-admin" --data-urlencode "password=$KC_PASSWORD" \
    http://127.0.0.1:8091/realms/master/protocol/openid-connect/token | jq -er .access_token)"
  core_client_id="$(curl -fsS -H "Authorization: Bearer $admin_token" \
    'http://127.0.0.1:8091/admin/realms/al-deem/clients?clientId=core-api' | jq -er '.[0].id')"
  CORE_API_CLIENT_SECRET="$(curl -fsS -X POST -H "Authorization: Bearer $admin_token" \
    "http://127.0.0.1:8091/admin/realms/al-deem/clients/$core_client_id/client-secret" | jq -er .value)"
  if grep -q '^KEYCLOAK_CLIENT_SECRET=' "$APP_DIR/env/core-api.env"; then
    sudo sed -i "s/^KEYCLOAK_CLIENT_SECRET=.*/KEYCLOAK_CLIENT_SECRET=$CORE_API_CLIENT_SECRET/" "$APP_DIR/env/core-api.env"
  else
    printf '\nKEYCLOAK_CLIENT_SECRET=%s\n' "$CORE_API_CLIENT_SECRET" | sudo tee -a "$APP_DIR/env/core-api.env" >/dev/null
  fi
  sudo chown "$APP_USER:$APP_USER" "$APP_DIR/env/core-api.env"
  sudo chmod 600 "$APP_DIR/env/core-api.env"
fi

log "Installing Caddy configuration"
sudo install -d -m 755 /etc/caddy
sudo install -m 644 "$CADDY_SOURCE" "$CADDY_SITE"
# A fresh Caddy install ships a placeholder :80 site; replace it entirely so it
# cannot shadow the ACME challenges and domain blocks we serve.
if sudo grep -q 'localhost' /etc/caddy/Caddyfile 2>/dev/null && ! sudo grep -Fqx 'import Caddyfile.al-deem' /etc/caddy/Caddyfile 2>/dev/null; then
  sudo cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.pre-deem-$(date +%Y%m%d-%H%M%S)"
  sudo tee /etc/caddy/Caddyfile >/dev/null <<'CADDY_MAIN'
{
	admin off
}
import Caddyfile.al-deem
CADDY_MAIN
elif ! sudo grep -Fqx 'import Caddyfile.al-deem' /etc/caddy/Caddyfile 2>/dev/null; then
  printf '\nimport Caddyfile.al-deem\n' | sudo tee -a /etc/caddy/Caddyfile >/dev/null
fi
sudo caddy fmt --overwrite "$CADDY_SITE" >/dev/null 2>&1 || true
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable caddy
sudo systemctl reload caddy || sudo systemctl restart caddy

log "Installing workspace dependencies"
cd "$REPO_ROOT"
pnpm install --frozen-lockfile

log "Deploying atomic release"
export PATH="/usr/local/go/bin:$HOME/go/bin:/usr/local/bin:$PATH"
"$REPO_ROOT/infra/prod/scripts/deploy-systemd.sh"

log "Final local health checks"
systemctl is-active deem-core-api deem-worker deem-www deem-learn deem-erp deem-backup.timer deem-healthcheck.timer
curl -fsS http://127.0.0.1:4001/v1/ready
curl -fsS http://127.0.0.1:3011/
curl -fsS http://127.0.0.1:3012/
curl -fsS http://127.0.0.1:3013/login

cat <<EOF

Deployment completed locally.

Remaining production actions:
1. Point @, www, learn, erp, api, and auth DNS A records to the new server IP.
2. Keep DNS as DNS only until Let's Encrypt certificates are issued.
3. Configure real SMTP before enabling student self-registration/email verification.
4. Replace the local backup target ($BACKUP_OFFSITE_URI) with an encrypted off-host rclone remote.
5. Add real PAYMENT_* values in /opt/deem/env/www.env and /opt/deem/env/learn.env if required by the UI.
6. Add Zoom credentials in /opt/deem/env/core-api.env before enabling live sessions.
EOF
