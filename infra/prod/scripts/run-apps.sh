#!/usr/bin/env bash
# تشغيل التطبيقات الثلاثة + worker ببيئة الإنتاج (الإصدار العام عبر Cloudflare).
# الاستخدام: ./infra/prod/scripts/run-apps.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
ROOT="$(pwd)"
AUTH_SECRET="${AUTH_SECRET:?ضع AUTH_SECRET أولًا (openssl rand -base64 32)}"
ISSUER="https://auth.alameedtraining.com/realms/al-deem"

# ملاحظات مهمة:
# - NODE_USE_SYSTEM_CA=1: التطبيقات تجلب OIDC discovery من auth.alameedtraining.com
#   بشهادة Caddy الداخلية — يتطلب تثبيت شهادة Caddy في مخزن النظام مرة واحدة:
#   sudo cp /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt \
#     /usr/local/share/ca-certificates/caddy-internal.crt && sudo update-ca-certificates
# - /etc/hosts: 127.0.0.1 لكل النطاقات (حتى يجهز DNS العام) — راجع infra/prod/README.md

pkill -f "next start -p 3011" 2>/dev/null || true
pkill -f "next start -p 3012" 2>/dev/null || true
pkill -f "next start -p 3013" 2>/dev/null || true
sleep 2

(cd apps/www && NODE_USE_SYSTEM_CA=1 nohup npx next start -p 3011 > /tmp/www.log 2>&1 &)
(cd apps/learn && NODE_USE_SYSTEM_CA=1 AUTH_SECRET="$AUTH_SECRET" AUTH_URL="https://learn.alameedtraining.com" \
  AUTH_KEYCLOAK_ISSUER="$ISSUER" nohup npx next start -p 3012 > /tmp/learn.log 2>&1 &)
(cd apps/erp && NODE_USE_SYSTEM_CA=1 AUTH_SECRET="$AUTH_SECRET" AUTH_URL="https://erp.alameedtraining.com" \
  AUTH_KEYCLOAK_ISSUER="$ISSUER" nohup npx next start -p 3013 > /tmp/erp.log 2>&1 &)

sleep 4
echo "─── الحالة:"
for P in 3011 3012 3013; do
  if ss -lnt | grep -q ":$P "; then echo "  ✓ :$P"; else echo "  ✗ :$P — راجع /tmp/*.log"; fi
done
