# دليل التشغيل — Al Deem Platform v2

> Runbook للحوادث اليومية. البنية الكاملة في `infra/prod/README.md`.

## الخدمات ومنافذها
| الخدمة | المنفذ | العملية |
|---|---|---|
| core-api (Go) | 4001 | `/tmp/core-api` + env (DATABASE_URL, KEYCLOAK_URL, REDIS_URL) |
| worker (Go) | — | `/tmp/worker` + env (DATABASE_URL) |
| www (Next.js) | 3011 | `next start` |
| learn (Next.js) | 3012 | `next start` + AUTH_SECRET + AUTH_URL |
| erp (Next.js) | 3013 | `next start` + AUTH_SECRET + AUTH_URL |
| PostgreSQL | 5435 | deem/deem — DB: deem |
| Redis | 6391 | rate limiting |
| Keycloak | 8091 | realm al-deem |
| Caddy | 443 | النطاقات الأربعة + security headers |

## فحص الصحة السريع
```bash
curl -k --resolve api.alameedtraining.com:443:127.0.0.1 https://api.alameedtraining.com/v1/health
ss -lntp | grep -E ":(4001|3011|3012|3013) "   # 4 خدمات
pgrep -f worker | wc -l                          # worker يعمل
```

## حوادث شائعة

### 1. سيرفر لا يستجيب
```bash
# السجلات:
tail -20 /tmp/{coreapi,learn,erp,www,worker}.log
# إعادة تشغيل core-api (انظر infra/prod/env.core-api):
kill $(ss -lntp | grep :4001 | grep -oE 'pid=[0-9]+' | cut -d= -f2)
DATABASE_URL=... KEYCLOAK_URL=... REDIS_URL=... nohup /tmp/core-api > /tmp/coreapi.log 2>&1 &
```

### 2. سلسلة SSO مقطوعة
- تحقق من AUTH_URL في env التطبيق (إلزامي خلف proxy — انظر infra/prod/README)
- دوران مفاتيح Keycloak بعد إعادة تشغيله: سجل `jwks cache miss` طبيعي — الجلسات القديمة تنتهي، المستخدم يعيد الدخول

### 3. rate limit يمنع زائرًا حقيقيًا
- Redis key: `deem:rl:<ip>` مع TTL — ينتهي تلقائيًا خلال الدقيقة
- رفع الحد: `middleware/ratelimit.go` (120/دقيقة) ثم rebuild

### 4. worker توقف
- لا خسارة بيانات: أحداث zoom تبقى في `zoom_webhook_events` بلا processed_at
- إعادة التشغيل تلتقط كل المعلّق (poll كل 10 ثوانٍ)

### 5. DB backup/restore
```bash
# backup:
pg_dump -h 127.0.0.1 -p 5435 -U deem deem | gzip > deem-$(date +%F).sql.gz
# restore (تدريب — على DB اختبارية فقط):
gunzip -c deem-XXXX.sql.gz | psql -h 127.0.0.1 -p 5435 -U deem deem_test
```
> Drill الشهري: restore على DB اختبارية + فحص counts.

## MFA لموظفي ERP
- CONFIGURE_TOTP مفروض في Keycloak على admin@ وfinance@
- أول دخول: إعداد تطبيق مصادقة (Microsoft/Google/FreeOTP) إلزامي قبل الوصول

## قاعدة "لا تلمس"
ticketty، deepseek-harness، remote.suda-technologies.com (Caddy الرئيسي يخدمه)، PM2، PostgreSQL القديم (5432/5433/5434)، منافذ 8081/8026/:3000.
