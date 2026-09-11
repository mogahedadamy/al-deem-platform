# إعداد الإنتاج — Al Deem Platform v2

## البنية (alameedtraining.com عبر Caddy)
| النطاق | الخدمة | المنفذ المحلي |
|---|---|---|
| alameedtraining.com | www (Next.js) | 3011 |
| learn.alameedtraining.com | learn (Next.js) | 3012 |
| erp.alameedtraining.com | erp (Next.js) | 3013 |
| api.alameedtraining.com | core-api (Go) | 4001 |

ملف Caddy: `/etc/caddy/Caddyfile.al-deem` (نسخة v2 في `platform/Caddyfile.al-deem-v2`).

## نقاط حرجة (تم اكتشافها وإصلاحها)
1. **AUTH_URL إلزامي خلف الـproxy**: Auth.js v5 يبني `redirect_uri` من
   `request.url.origin` وليس `x-forwarded-host` (رغم أن Caddy يمرره صحيحًا).
   بدون `AUTH_URL=https://learn...` يرسل `localhost:3012` ويقفز الـSSO.
2. **Keycloak hostname**: يجب ضبط `KC_HOSTNAME=https://auth.alameedtraining.com`
   في الإنتاج وإلا رفض issuer mismatch في JWT verification.
3. **redirectUris في Keycloak** لكل client تشمل نطاقات الإنتاج (مضبوطة ✓).

## خطوات الإطلاق
1. توليد الأسرار: `openssl rand -base64 32` لكل AUTH_SECRET (ملفات env.*).
2. أنشئ `infra/docker/.env.production` من `.env.production.example` وضع كلمات مرور PostgreSQL وKeycloak حقيقية خارج Git.
3. شغّل البنية الإنتاجية فقط بالـoverride المقيد بالإصدار:
   ```bash
   docker compose -f infra/docker/compose.yaml -f infra/docker/compose.prod.yaml \
     --env-file infra/docker/.env.production up -d
   ```
4. اجعل سجلات Cloudflare للنطاقات الرئيسية والفرعية Proxied واضبط SSL/TLS إلى **Full (strict)**.
5. طبّق scope `core-api-audience` وMFA في Keycloak الحي، ثم تحقق أن access token يحتوي `aud=core-api`.
6. نفّذ الإصدار الذري عبر `infra/prod/scripts/deploy-systemd.sh`؛ لا تستخدم PM2 أو `nohup`.

راجع `RELEASE_RUNBOOK_AR.md` لمتطلبات النسخ الاحتياطي والاسترجاع والتحقق بعد الإطلاق.
