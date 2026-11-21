# هوية مركز العميد للتدريب عبر Zitadel

تعتمد المنصة Zitadel كمزود OIDC للحسابات والجلسات والتحقق من البريد وعوامل
المصادقة. تبقى ملفات المستخدمين وأدوار المركز والصلاحيات وسجلات التدقيق في
PostgreSQL الخاص بالمنصة.

## التطبيقات المطلوبة

أنشئ مشروعًا باسم `Alameed Training Center` في Zitadel، ثم أنشئ ثلاثة تطبيقات
Web/OIDC منفصلة باسم `www` و`learn` و`erp`. استخدم Authorization Code مع PKCE، وفعّل
refresh tokens، وسجل مسارات العودة التالية:

- `https://alameedtraining.com/api/auth/callback/zitadel`
- `https://learn.alameedtraining.com/api/auth/callback/zitadel`
- `https://erp.alameedtraining.com/api/auth/callback/zitadel`
- `http://localhost:3001/api/auth/callback/zitadel`
- `http://localhost:3002/api/auth/callback/zitadel`
- `http://localhost:3003/api/auth/callback/zitadel`

ضع معرف وسر كل تطبيق في `AUTH_ZITADEL_ID` و`AUTH_ZITADEL_SECRET` لبيئته.
يجب أن تتضمن access tokens جمهور `core-api`. اضبط `OIDC_ALLOWED_CLIENTS` على
معرّفات العملاء الفعلية التي أصدرها Zitadel للتطبيقات الثلاثة، وليس على
أسمائها الوصفية. يولّد سكربت النشر هذه القائمة من
`ZITADEL_WWW_CLIENT_ID` و`ZITADEL_LEARN_CLIENT_ID` و`ZITADEL_ERP_CLIENT_ID`.

تستخدم التطبيقات الثلاثة المؤسسة والمُصدر نفسيهما لتحقيق SSO، لكن لكل تطبيق
`client_id` وسر وملف cookies مستقل لمنع التداخل بين النطاقات. اطلب النطاقات
`openid email profile offline_access`. مدة جلسة التطبيق 30 يومًا وتُجدد عبر
refresh token؛ ويمكن سحبها مركزيًا من Zitadel. يجب أن تكون cookies في الإنتاج
`HttpOnly` و`Secure` و`SameSite=Lax` (وهي إعدادات Auth.js الافتراضية عبر HTTPS)،
ولا يجوز مشاركة cookie واحدة بين النطاقات الفرعية.

التسجيل العام ينشئ حساب طالب فقط. حسابات `erp` للموظفين لا تُنشأ ذاتيًا؛ بل
تبدأ بدعوة إدارية موثقة وتفعيل MFA قبل منح أي صلاحية. هذا الفصل متعمد لحماية
بيانات الطلاب والعمليات المالية.

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
