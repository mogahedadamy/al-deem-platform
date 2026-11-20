# هوية مركز العميد للتدريب عبر Zitadel

تعتمد المنصة Zitadel كمزود OIDC للحسابات والجلسات والتحقق من البريد وعوامل
المصادقة. تبقى ملفات المستخدمين وأدوار المركز والصلاحيات وسجلات التدقيق في
PostgreSQL الخاص بالمنصة.

## التطبيقات المطلوبة

أنشئ مشروعًا باسم `Alameed Training Center` في Zitadel، ثم أنشئ تطبيقين من
نوع Web/OIDC باسم `learn` و`erp`. استخدم Authorization Code مع PKCE، وفعّل
refresh tokens، وسجل مسارات العودة التالية:

- `https://learn.alameedtraining.com/api/auth/callback/zitadel`
- `https://erp.alameedtraining.com/api/auth/callback/zitadel`
- `http://localhost:3002/api/auth/callback/zitadel`
- `http://localhost:3003/api/auth/callback/zitadel`

ضع معرف وسر كل تطبيق في `AUTH_ZITADEL_ID` و`AUTH_ZITADEL_SECRET` لبيئته.
يجب أن تتضمن access tokens جمهور `core-api`، وأن تكون قيم العملاء المسموحة
في `OIDC_ALLOWED_CLIENTS`.

لدعوات الموظفين، أنشئ حساب خدمة بأقل صلاحية تسمح بإنشاء المستخدم وإرسال
الدعوة داخل مؤسسة المركز، ثم ضع معرف المؤسسة في `ZITADEL_ORG_ID` ورمز وصول
الحساب في `ZITADEL_ADMIN_TOKEN` داخل مخزن أسرار core-api. عند فشل إرسال
الدعوة يحذف التكامل الحساب الجزئي كي تكون إعادة المحاولة آمنة.

## انتقال الحسابات

يحفظ جدول `external_identities` الربط بين `issuer + subject` وبين UUID
الداخلي الثابت. يجب استيراد مستخدمي Zitadel وربطهم بملفاتهم الحالية قبل تحويل
النطاق الإنتاجي. يمنع الربط التلقائي بالبريد لتفادي الاستيلاء على حساب عند
اختلاف التحقق بين المزودين.

قبل إيقاف مزود الهوية السابق:

1. صدّر المستخدمين وحالات تحقق البريد من المصدر القديم.
2. استوردهم إلى Zitadel عبر أداة الترحيل الرسمية، مع طلب تعيين كلمة مرور آمنة
   أو مفتاح مرور عند أول دخول.
3. أدخل روابط `issuer/subject/profile_id` في `external_identities`.
4. اختبر طالبًا وموظفًا ومسؤولًا، واسترداد الحساب، وتعليق مستخدم، وسحب دور من
   جلسة قائمة.
5. حوّل `auth.alameedtraining.com` إلى Zitadel ثم أبطل الجلسات القديمة.

تظل PostgreSQL مصدر الحقيقة الوحيد للأدوار. لا تستورد المنصة دورًا مرتفعًا من
رمز OIDC.
