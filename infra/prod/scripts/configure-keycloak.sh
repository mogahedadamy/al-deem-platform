#!/usr/bin/env bash
# Idempotently apply the production Keycloak controls required by core-api.
# Run only from a trusted admin shell; credentials are read from environment,
# never written to disk or echoed.
set -euo pipefail

: "${KC_ADMIN_USER:?set KC_ADMIN_USER}"
: "${KC_ADMIN_PASSWORD:?set KC_ADMIN_PASSWORD}"
KC_ADMIN_URL="${KC_ADMIN_URL:-http://127.0.0.1:8091}"
KC_REALM="${KC_REALM:-al-deem}"
# المسار العام للطلاب يحتاج تفعيل البريد؛ جهّز SMTP الإنتاجي قبل التشغيل.
KC_ENABLE_EMAIL_VERIFICATION="${KC_ENABLE_EMAIL_VERIFICATION:-true}"
# التسجيل الذاتي مفعّل افتراضياً للطلاب فقط. آلية المجموعة الافتراضية في
# Keycloak تطبق أيضاً على الحسابات التي ينشئها المدير؛ أزل /students من حساب
# الموظف قبل منحه دوراً إدارياً.
KC_ENABLE_STUDENT_SELF_REGISTRATION="${KC_ENABLE_STUDENT_SELF_REGISTRATION:-true}"
# Optional existing al-deem username that receives Keycloak realm-admin so the
# centre owner can create staff users and reset identities in Admin Console.
KC_OWNER_USERNAME="${KC_OWNER_USERNAME:-}"

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

# The core-api service account creates invited staff identities and sends Keycloak
# required-action emails. It receives only manage-users; it never receives
# realm-admin and browser clients never hold this credential.
core_clients=$(api GET 'clients?clientId=core-api')
core_client_id=$(jq -er '.[0].id' <<<"$core_clients")
service_user=$(api GET "clients/$core_client_id/service-account-user")
service_user_id=$(jq -er '.id' <<<"$service_user")
realm_management=$(api GET 'clients?clientId=realm-management')
realm_management_id=$(jq -er '.[0].id' <<<"$realm_management")
manage_users=$(api GET "clients/$realm_management_id/roles/manage-users")
jq -ce '[.]' <<<"$manage_users" | api POST "users/$service_user_id/role-mappings/clients/$realm_management_id" --data-binary @- -o /dev/null
echo "granted core-api service account the Keycloak manage-users role"

# Send only mutable realm fields. Sending a full GET representation makes
# recent Keycloak versions reject read-only fields with HTTP 400.
registration_allowed=false
if [[ "$KC_ENABLE_STUDENT_SELF_REGISTRATION" == "true" ]]; then
  registration_allowed=true
elif [[ "$KC_ENABLE_STUDENT_SELF_REGISTRATION" != "false" ]]; then
  echo "KC_ENABLE_STUDENT_SELF_REGISTRATION must be true or false" >&2
  exit 1
fi
if [[ "$KC_ENABLE_EMAIL_VERIFICATION" != "true" && "$KC_ENABLE_EMAIL_VERIFICATION" != "false" ]]; then
  echo "KC_ENABLE_EMAIL_VERIFICATION must be true or false" >&2
  exit 1
fi
if [[ "$registration_allowed" == "true" && "$KC_ENABLE_EMAIL_VERIFICATION" != "true" ]]; then
  echo "Student self-registration requires KC_ENABLE_EMAIL_VERIFICATION=true and a working SMTP configuration" >&2
  exit 1
fi

realm_update=$(jq -nc \
  --argjson registrationAllowed "$registration_allowed" \
  '{
    registrationAllowed: $registrationAllowed,
    registrationEmailAsUsername: true,
    rememberMe: true,
    editUsernameAllowed: false,
    sslRequired: "external",
    internationalizationEnabled: true,
    supportedLocales: ["ar", "en"],
    defaultLocale: "ar",
    loginTheme: "alameed",
    emailTheme: "alameed"
  }')
if [[ "$KC_ENABLE_EMAIL_VERIFICATION" == "true" ]]; then
  realm_update=$(jq '. + {verifyEmail: true, resetPasswordAllowed: true}' <<<"$realm_update")
else
  echo "email verification/reset left unchanged; set KC_ENABLE_EMAIL_VERIFICATION=true after SMTP production setup"
fi
printf '%s' "$realm_update" | api PUT '' --data-binary @- -o /dev/null

# A registrant cannot select a role. Every newly created account enters the
# /students default group, whose only realm role is the non-privileged student
# role. Staff roles remain admin-managed. See docs/keycloak-self-registration.md.
groups=$(api GET 'groups?search=students&exact=true')
student_group_id=$(jq -r '.[] | select(.name == "students") | .id' <<<"$groups" | head -1)
if [[ -z "$student_group_id" ]]; then
  printf '%s' '{"name":"students"}' | api POST 'groups' --data-binary @- -o /dev/null
  groups=$(api GET 'groups?search=students&exact=true')
  student_group_id=$(jq -er '.[] | select(.name == "students") | .id' <<<"$groups" | head -1)
  echo "created students group"
fi
student_role=$(api GET 'roles/student')
jq -ce '[.]' <<<"$student_role" | api POST "groups/$student_group_id/role-mappings/realm" --data-binary @- -o /dev/null

if [[ "$registration_allowed" == "true" ]]; then
  api PUT "default-groups/$student_group_id" -o /dev/null
  echo "enabled student self-registration and /students default group"
else
  api DELETE "default-groups/$student_group_id" -o /dev/null || true
  echo "disabled self-registration and removed /students as a default group"
fi

# Students must not be blocked by a global MFA setup. TOTP stays available but
# is assigned to privileged staff accounts through the invitation/provisioning
# flow (or explicitly by an administrator) rather than becoming a default action.
# Set KC_ENFORCE_GLOBAL_TOTP=true only for an organisation that explicitly wants
# MFA on every account.
KC_ENFORCE_GLOBAL_TOTP="${KC_ENFORCE_GLOBAL_TOTP:-false}"
if [[ "$KC_ENFORCE_GLOBAL_TOTP" != "true" && "$KC_ENFORCE_GLOBAL_TOTP" != "false" ]]; then
  echo "KC_ENFORCE_GLOBAL_TOTP must be true or false" >&2
  exit 1
fi
actions=$(api GET 'authentication/required-actions')
totp=$(jq -ce '.[] | select(.alias == "CONFIGURE_TOTP")' <<<"$actions")
totp_update=$(jq --argjson global "$([[ "$KC_ENFORCE_GLOBAL_TOTP" == "true" ]] && echo true || echo false)" '.enabled = true | .defaultAction = $global' <<<"$totp")
if ! printf '%s' "$totp_update" | api PUT 'authentication/required-actions/CONFIGURE_TOTP' --data-binary @- -o /dev/null; then
  echo "WARNING: TOTP required-action update was rejected; configure MFA in Keycloak Admin Console" >&2
else
  echo "TOTP is available; global enforcement: $KC_ENFORCE_GLOBAL_TOTP"
fi

if [[ -n "$KC_OWNER_USERNAME" ]]; then
  owner=$(api GET "users?username=$KC_OWNER_USERNAME&exact=true")
  owner_id=$(jq -er '.[0].id' <<<"$owner")
  realm_management=$(api GET 'clients?clientId=realm-management')
  realm_management_id=$(jq -er '.[0].id' <<<"$realm_management")
  realm_admin=$(api GET "clients/$realm_management_id/roles/realm-admin")
  jq -ce '[.]' <<<"$realm_admin" | api POST "users/$owner_id/role-mappings/clients/$realm_management_id" --data-binary @- -o /dev/null
  echo "granted Keycloak realm-admin to $KC_OWNER_USERNAME"
fi

echo "✓ Keycloak production audience, realm security, and TOTP policy applied"
