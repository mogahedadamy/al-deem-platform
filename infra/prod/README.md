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
1. توليد الأسرار: `openssl rand -base64 32` لكل AUTH_SECRET (ملفات env.*)
2. تحديث compose: KC_HOSTNAME + أسرار DB
3. إعادة DNS: A records للنطاقات → هذا السيرفر، أو Cloudflare proxy مع SSL Full
4. بناء: `pnpm build` في كل app مع env الإنتاج + `go build` مع env.core-api
5. تشغيل تحت systemd/pm2 + `caddy reload`
