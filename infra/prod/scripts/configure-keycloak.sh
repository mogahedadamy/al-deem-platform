#!/usr/bin/env bash
# Idempotently apply the production Keycloak controls required by core-api.
# Run only from a trusted admin shell; credentials are read from environment,
# never written to disk or echoed.
set -euo pipefail

: "${KC_ADMIN_USER:?set KC_ADMIN_USER}"
: "${KC_ADMIN_PASSWORD:?set KC_ADMIN_PASSWORD}"
KC_ADMIN_URL="${KC_ADMIN_URL:-http://127.0.0.1:8091}"
KC_REALM="${KC_REALM:-al-deem}"

for dependency in curl jq; do
  command -v "$dependency" >/dev/null || { echo "missing dependency: $dependency" >&2; exit 1; }
done

admin_token=$(
  curl -fsS --retry 2 --connect-timeout 5 \
    -d 'client_id=admin-cli' \
    -d 'grant_type=password' \
    --data-urlencode "username=$KC_ADMIN_USER" \
    --data-urlencode "password=$KC_ADMIN_PASSWORD" \
    "$KC_ADMIN_URL/realms/master/protocol/openid-connect/token" | jq -er '.access_token'
)

api() {
  local method="$1" path="$2"
  shift 2
  curl -fsS --retry 2 --connect-timeout 5 \
    -X "$method" \
    -H "Authorization: Bearer $admin_token" \
    -H 'Content-Type: application/json' \
    "$@" \
    "$KC_ADMIN_URL/admin/realms/$KC_REALM/$path"
}

scope_json=$(mktemp)
trap 'rm -f "$scope_json"' EXIT
cat >"$scope_json" <<'JSON'
{
  "name": "core-api-audience",
  "description": "Adds core-api as the access-token audience for server-side API verification.",
  "protocol": "openid-connect",
  "attributes": {
    "include.in.token.scope": "true",
    "display.on.consent.screen": "false"
  },
  "protocolMappers": [
    {
      "name": "core-api audience",
      "protocol": "openid-connect",
      "protocolMapper": "oidc-audience-mapper",
      "consentRequired": false,
      "config": {
        "included.client.audience": "core-api",
        "access.token.claim": "true",
        "id.token.claim": "false",
        "introspection.token.claim": "true"
      }
    }
  ]
}
JSON

scopes=$(api GET 'client-scopes')
scope_id=$(jq -r '.[] | select(.name == "core-api-audience") | .id' <<<"$scopes" | head -1)
if [[ -z "$scope_id" ]]; then
  api POST 'client-scopes' --data-binary "@$scope_json" >/dev/null
  scopes=$(api GET 'client-scopes')
  scope_id=$(jq -er '.[] | select(.name == "core-api-audience") | .id' <<<"$scopes" | head -1)
  echo "created client scope core-api-audience"
else
  echo "client scope core-api-audience already exists"
fi

for client_name in www learn erp; do
  clients=$(api GET "clients?clientId=$client_name")
  client_id=$(jq -er '.[0].id' <<<"$clients")
  # Keycloak's Admin API makes this relation idempotent (204 if already present).
  api PUT "clients/$client_id/default-client-scopes/$scope_id" -o /dev/null
  echo "attached core-api-audience to $client_name"
done

# Realm fields are updated from the live representation to preserve every
# unrelated setting. TOTP is default-required; staff account recovery must be
# documented by the operator before rolling this to production.
realm=$(api GET '')
realm_update=$(jq '.registrationAllowed = false | .verifyEmail = true | .resetPasswordAllowed = true | .sslRequired = "external"' <<<"$realm")
printf '%s' "$realm_update" | api PUT '' --data-binary @- -o /dev/null

totp=$(api GET 'authentication/required-actions/CONFIGURE_TOTP')
totp_update=$(jq '.enabled = true | .defaultAction = true' <<<"$totp")
printf '%s' "$totp_update" | api PUT 'authentication/required-actions/CONFIGURE_TOTP' --data-binary @- -o /dev/null

echo "✓ Keycloak production audience, realm security, and TOTP policy applied"
