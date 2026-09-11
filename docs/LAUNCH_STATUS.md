# حالة الإطلاق — Al Deem Platform v2

> ملخص تنفيذي للمالك: ما جاهز، ما يحتاج قرارك، وكيف تُطلق المنصة.

## ✅ جاهز بالكامل (مثبت بالاختبار الحي)

### المنصة (platform/)
| المكوّن | الحالة | الأدلة |
|---|---|---|
| core-api (Go 1.25) | ✅ كامل | 47 endpoints، 23 جدولًا، 29 unit test، lint صفر |
| www | ✅ كامل | صفحات 6 + SEO (robots/sitemap/OG) + نموذج استفسار حي |
| learn | ✅ كامل | رحلة الطالب/المدرب كاملة + مشغل دروس + اختبارات + شهادات + حصص مباشرة |
| erp | ✅ كامل | users/review/finance/papers/reports/leads + MFA |
| worker | ✅ يعمل | أحداث Zoom (تسجيلات + حالات) كل 10 ثوانٍ |
| Keycloak SSO | ✅ عبر النطاقات | realm al-deem + 3 clients + MFA لموظفي ERP |
| PostgreSQL 17 | ✅ | 6 migrations + backup آلي + drill أسبوعي |
| Redis | ✅ | rate limiting 120/دقيقة (fail-open) |
| Caddy | ✅ | 4 نطاقات + security headers + gzip |

### رحلات E2E مثبتة عبر النطاقات الإنتاجية
1. **خالد إبراهيم (طالب جديد)**: تسجيل → دفع → اعتماد المالي → تعلم (100%) → اختبار (100%) → **شهادة ALD-2026-729936c8 فورية** → تحقق عام عبر apex → **نسخة ورقية: اعتماد → طباعة → تسليم**
2. **سارة محمد**: دورة كاملة + شهادة + لوحة طالب حقيقية (بطاقات + progress)
3. **المدرب**: جدولة حصص (Zoom) + نوافذ انضمام خادمية + webhook موقّع HMAC
4. **المالي**: مراجعة + اعتماد/رفض ذري (enrollment يُفعّل مع الدفعة)
5. **الإدارة**: تقارير MVP الخمسة + leads + أدوار + audit

### الأمان (مثبت بالاختبار)
- MFA إلزامي لموظفي ERP (admin@ + finance@) — فرض فعلي عند الدخول
- IDOR matrix: 8 محاولات تسلل كلها 403
- ثغرتا منطق أغلقتا: دفع على non-pending (409)، طلبات ورقية مكررة (409)
- CORS whitelist + security headers + rate limit 429

## 🔴 يحتاج قرارك (خارج هذا السيرفر)

### 1. DNS (قبل أي شيء)
اختر واحدًا:
- **A records مباشرة**: `alameedtraining.com` و `*.alameedtraining.com` (أو 4 سجلات: apex/learn/erp/api) → IP هذا السيرفر
- **Cloudflare proxy** (orange cloud): نفس السجلات + SSL mode = **Full** (متوافق مع `tls internal` الحالي)

### 2. أسرار الإنتاج الفعلية
```bash
# توليد لكل تطبيق (3):
openssl rand -base64 32   # → AUTH_SECRET في infra/prod/env.{www,learn,erp}
# KC_HOSTNAME=https://auth.alameedtraining.com في compose
# كلمة مرور bootstrap admin لـKeycloak يجب تغييرها فورًا
```

### 3. systemd — **جاهزة الآن**
وحدات مكتوبة في `infra/prod/systemd/` (core-api/worker/www/learn/erp + backup timer يومي).
التثبيت بأمر واحد:
```bash
./infra/prod/scripts/deploy-systemd.sh   # يحتاج sudo
```
يرمّز: binaries إلى /opt/deem + env من القوالب (عدّل الأسرار قبلها!) + تفعيل تلقائي.

### 4. بعد الإطلاق
- Sentry (أخطاء) + uptime monitoring
- cron backup يعمل فعلًا: `0 3 * * * .../infra/prod/scripts/backup.sh`
- شهادات الطالب في sitemap؟ لا — خاصة

## 🚀 خطوات الإطلاق (بعد DNS)
1. DNS → السيرفر + تحقق `curl https://alameedtraining.com`
2. أسرار حقيقية في `infra/prod/env.*` + rebuild + restart (الأوامر في `infra/prod/README.md`)
3. Keycloak: `KC_HOSTNAME` + تغيير كلمة admin + فحص redirectUris
4. `caddy reload` (جاهز — النطاقات محدثة بالفعل)
5. فحص دخاني: كل نطاق 200 + SSO + دفعة تجريبية + شهادة + تحقق عام
6. تشغيل cron backup + systemd

## 📞 بيانات الدخول الحالية (بيئة التطوير)
| الحساب | كلمة المرور | الدور |
|---|---|---|
| admin@alameedtraining.com | تم التدوير — راجع مخزن الأسرار المحلي | system_admin (MFA مفروض) |
| finance@alameedtraining.com | تم التدوير — راجع مخزن الأسرار المحلي | finance_officer (MFA مفروض) |
| sara.student@example.com | تم التدوير — راجع مخزن الأسرار المحلي | student |
| khalid.student@example.com | تم التدوير — راجع مخزن الأسرار المحلي | student |
| test.student@example.com | تم التدوير — راجع مخزن الأسرار المحلي | student+instructor+reviewer |

> **غير هذه الكلمات في الإنتاج** — هذه للتطوير والاختبار فقط.

---

## تحديث تدقيق الإطلاق — 2026-09-12

لا تكفي الادعاءات التاريخية أعلاه كدليل إطلاق للإصدار الحالي. تم تحويل التشغيل إلى مسار إصدار ذري قابل للاسترجاع، وأصبح التحقق من JWT يفرض issuer و`azp` و`aud=core-api`، كما أصبحت webhook Zoom تفشل مغلقاً عند غياب السر. لكن لا يزال الإطلاق الفعلي مشروطاً بتوفير أسرار Zoom/Keycloak ووجهة نسخ احتياطي مشفرة خارج الخادم، وتطبيق scope الجمهور وMFA على Keycloak الحي، وإثبات رحلة authenticated كاملة بعد النشر. راجع `infra/prod/RELEASE_RUNBOOK_AR.md` قبل أي تشغيل إنتاجي.
