# دليل التشغيل — منصة العميد

> تعتمد الإنتاجية على `systemd` وإصدارات immutable تحت `/opt/deem/releases`؛ لا تستخدم `nohup` أو `/tmp` أو أوامر `kill` لتشغيل المنصة.

## الخدمات والمنافذ

| الخدمة | المنفذ | وحدة systemd |
|---|---:|---|
| core-api | 4001 | `deem-core-api.service` |
| worker | — | `deem-worker.service` |
| www | 3011 | `deem-www.service` |
| learn | 3012 | `deem-learn.service` |
| erp | 3013 | `deem-erp.service` |
| النسخ الاحتياطي | — | `deem-backup.timer` |
| فحص الصحة | — | `deem-healthcheck.timer` |

## فحص الصحة والسجلات

```bash
systemctl is-active deem-core-api deem-worker deem-www deem-learn deem-erp deem-backup.timer
auth_token='...' # access token حديث صادر من Keycloak
curl -fsS http://127.0.0.1:4001/v1/ready
curl -fsS -H "Authorization: Bearer $auth_token" http://127.0.0.1:4001/v1/me
journalctl -u deem-core-api -u deem-worker -n 100 --no-pager
systemctl list-timers 'deem-*' --all --no-pager
```

`/v1/ready` يفحص قاعدة البيانات؛ يجب متابعة Redis وKeycloak وworker ونسخة النسخ الاحتياطي عبر مراقبة خارجية أيضاً.

## معالجة الحوادث

- **خدمة لا تستجيب:** افحص `journalctl -u deem-<service>` ثم استخدم `sudo systemctl restart deem-<service>` فقط بعد تحديد السبب.
- **SSO أو API يعيدان 401:** تحقق أن token يضم `iss` العام الصحيح، و`azp` من العملاء المسموحين، و`aud=core-api`؛ ثم راجع `KEYCLOAK_ISSUER` وscope `core-api-audience` في Keycloak الحي.
- **Worker متوقف:** الأحداث تبقى معلقة في `zoom_webhook_events` وتلتقطها الوحدة عند عودتها؛ افحص backlog وقم بإعادة تشغيل `deem-worker`.
- **Webhook Zoom:** لا تقبل الخدمة أي request إن غاب `ZOOM_WEBHOOK_SECRET`، وتتحقق من HMAC وtimestamp. لا تعطل هذه الحماية للتجربة.

## النسخ الاحتياطي والاستعادة

تعمل `deem-backup.timer` يومياً 03:00. السكربت ينتج نسخة `sql.gz.enc` فقط، ويفشل إن غاب مفتاح التشفير أو النسخ خارج الخادم عبر rclone. ينفذ restore drill كل أحد على `deem_restore_drill` ويخرج non-zero عند الفشل.

```bash
journalctl -u deem-backup.service -n 100 --no-pager
sudo systemctl start deem-backup.service  # فقط في نافذة تغيير مصرح بها
```

لا تستعد إلى قاعدة الإنتاج مباشرة. استخدم drill/هدف منفصل واحتفظ بمفتاح `/etc/deem/backup.key` خارج Git وفي مخزن أسرار معتمد.

## MFA والأسرار

- TOTP مطلوب في realm configuration؛ تحقّق من إكمال إعداد الحسابات الإدارية ومسار الاستعادة قبل الإطلاق.
- لا توجد كلمات مرور أو tokens في المستودع. دوّر أي حساب/سر ظهر في logs أو وثائق قديمة.
- قوالب `infra/prod/env.*` ليست ملفات تشغيل؛ القيم الحية تحفظ في `/opt/deem/env` بصلاحية 0600.

## النشر والاسترجاع

اتبع فقط [`infra/prod/RELEASE_RUNBOOK_AR.md`](../infra/prod/RELEASE_RUNBOOK_AR.md). السكربت يرفض الشجرة غير النظيفة ويبدّل `/opt/deem/current` ذرياً، مع rollback تلقائي عند فشل health gate.

## قاعدة «لا تلمس»

ticketty، deepseek-harness، `remote.suda-technologies.com` (Caddy الرئيسي يخدمه)، PM2، PostgreSQL القديم (5432/5433/5434)، منافذ 8081/8026/:3000.
