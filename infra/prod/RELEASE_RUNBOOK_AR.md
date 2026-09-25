# دليل إصدار الإنتاج والاسترجاع

> هذا الدليل هو شرط تشغيل، وليس دليلاً على أن إصداراً بعينه نُشر بالفعل.

## بوابات قبل النشر

1. أنشئ commit/release tag نظيفاً؛ سكربت النشر يرفض أي `git status --porcelain` غير فارغ.
2. أكمل القيم الحقيقية خارج Git في `/opt/deem/env/{core-api,www,learn,erp,backup}.env`:
   - `KEYCLOAK_ISSUER` يطابق حرفياً claim `iss` العام.
   - `KEYCLOAK_REQUIRED_AUDIENCE=core-api`.
   - أسرار Auth.js وZoom وKeycloak ليست فارغة ولا قوالب `CHANGE_ME`.
   - معرفات Zoom S2S الثلاثة وضبط webhook secret في Zoom.
    - بيانات التحويل المنشورة للطالب: `PAYMENT_BANK_NAME` و`PAYMENT_ACCOUNT_NAME` و`PAYMENT_ACCOUNT_NUMBER` و`PAYMENT_REFERENCE_HINT`.
3. أنشئ مفتاح النسخة الاحتياطية خارج Git:
   ```bash
   sudo install -d -m 700 /etc/deem
   openssl rand -base64 48 | sudo tee /etc/deem/backup.key >/dev/null
   sudo chown mojahed:mojahed /etc/deem/backup.key
   sudo chmod 600 /etc/deem/backup.key
   ```
   واضبط `DEEM_BACKUP_OFFSITE_URI` إلى وجهة `rclone` مشفّرة/مقيدة الوصول.
4. طبّق إعداد Keycloak في الـrealm الحي من shell إداري موثوق (لا تمرر كلمة المرور في المحادثة):
   ```bash
   KC_ADMIN_USER='...' KC_ADMIN_PASSWORD='...' ./infra/prod/scripts/configure-keycloak.sh
   ```
   ينشئ السكربت scope `core-api-audience` ويربطه بعملاء `learn` و`erp` و`www`، ويضبط واجهة الحساب العربية والتسجيل الذاتي للطالب مع التحقق من البريد. جهّز SMTP إنتاجياً قبل هذه الخطوة؛ السكربت يرفض الجمع بين التسجيل الذاتي والتحقق المعطّل. لا تفعّل MFA عالمياً للطلاب؛ عيّنه للحسابات الإدارية والمالية عند دعوتها. بعدها تحقق من access token أن `aud` يحوي `core-api` ومن نجاح التسجيل واستعادة كلمة المرور.
5. نفّذ `pnpm lint && pnpm test && pnpm build && (cd services/core-api && go test ./...)`.

## النشر الذري

```bash
cd /path/to/platform
./infra/prod/scripts/deploy-systemd.sh
```

السكريبت يبني أولاً، وينسخ الشجرة والبناء إلى `/opt/deem/releases/<timestamp>-<commit>`، ويبدّل symlink `/opt/deem/current` ذرياً، ويعيد تشغيل الخدمات، ثم يشغّل health gate. إذا فشل الـhealth gate يعيد symlink السابق ويعيد تشغيل الخدمات. يحتفظ بآخر 5 إصدارات (قابل للتعديل عبر `DEEM_RETAIN_RELEASES`).

## الفحص بعد النشر

```bash
systemctl is-active deem-core-api deem-worker deem-www deem-learn deem-erp deem-backup.timer
auth_token='...' # token صادر حديثاً من learn/erp
curl -fsS http://127.0.0.1:4001/v1/ready
curl -fsS -H "Authorization: Bearer $auth_token" http://127.0.0.1:4001/v1/me
journalctl -u deem-backup.service -n 100 --no-pager
```

اختبر عملياً: SSO callback إلى وجهته المطلوبة، enrollment، اعتماد مالي، إكمال الدروس، quiz، certificate، verify، ثم إنشاء Zoom/webhook موقّع. لا تستخدم بيانات اعتماد تطويرية أو تسجّل جهاز MFA باسم مستخدم آخر.

## الاسترجاع

إذا فشل إصدار بعد اجتياز health gate، اختر إصداراً سابقاً فقط أثناء نافذة تغيير مصرح بها:

```bash
sudo ln -s /opt/deem/releases/<previous-release> /opt/deem/current.next
sudo mv -Tf /opt/deem/current.next /opt/deem/current
sudo systemctl restart deem-core-api deem-worker deem-www deem-learn deem-erp
sudo /opt/deem/current/infra/prod/scripts/healthcheck.sh
```

## النسخ الاحتياطي

`deem-backup.timer` يعمل يومياً 03:00. لا ينجح السكربت إن غاب مفتاح التشفير أو rclone أو النسخ خارج الخادم. كل أحد ينفذ restore drill في قاعدة `deem_restore_drill` ثم يحذفها؛ failure يخرج non-zero حتى يظهر في systemd/journal/monitoring.
