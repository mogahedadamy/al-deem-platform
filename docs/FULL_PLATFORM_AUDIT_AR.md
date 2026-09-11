# تقرير التدقيق الهندسي الشامل — منصة مركز العميد

**نوع التدقيق:** Product / Frontend / Backend / UX / QA / Security / DevOps  
**النطاق:** `apps/www` + `apps/learn` + `apps/erp` والبنية المشتركة التي تعتمد عليها  
**المنهج:** مراجعة الكود، بناء وتشغيل الاختبارات، فحص قاعدة البيانات، اختبارات متصفح فعلية، تسجيل دخول فعلي بحسابات الاختبار، طلبات HTTP مباشرة، وفحص حالة العمليات الحية.  
**قاعدة التقرير:** لا تُصنف أي وظيفة «تعمل» اعتماداً على وجود الكود فقط. ما لم يُختبر أو يتعذر اختباره مذكور باسم **NOT VERIFIED**.

---

# 1. الملخص التنفيذي

## الحكم النهائي

المنتج الحالي **ليس جاهزاً للإطلاق الإنتاجي الكامل** رغم أن الموقع العام `www` أصبح جيداً بصرياً ووظيفياً.

السبب الرئيسي ليس التصميم العام، بل وجود أعطال حرجة في منصة التعلم والنظام الإداري والبنية التشغيلية:

1. رموز الدخول الصادرة حالياً تحمل issuer عامّاً، بينما `core-api` الحي يتحقق من issuer داخلي مختلف؛ لذلك كل طلب مصادق عليه إلى API يرجع `401`.
2. بيانات دخول تطويرية معروفة ومكتوبة في وثائق المستودع ما زالت تعمل. حساب مدير النظام يصل فعلياً إلى شاشة إعداد MFA، ما يسمح لمن يعرف كلمة المرور بإمكانية تسجيل جهاز MFA أولاً.
3. Zoom webhook يقبل طلبات غير موقعة لأن `ZOOM_WEBHOOK_SECRET` غير مضبوط في العملية الحية. تم إثبات ذلك بطلب آمن أُدخل في جدول الأحداث ثم حُذف.
4. منطق الشهادة لا يشترط إكمال المحتوى؛ يكفي تسجيل active واجتياز الاختبار. كما أن المحاولات غير محدودة، ما يسمح باستنتاج الإجابات تدريجياً.
5. خدمات الإنتاج تعمل كعمليات `nohup/npm exec` وليست تحت systemd، والـworker غير شغّال، ومؤقت النسخ الاحتياطي غير شغّال.
6. 16 من 20 دورة منشورة بلا أي درس، و18 من 20 بلا اختبار.

## أكبر نقاط القوة

- الموقع العام `www` متماسك وحديث ومتجاوب، وروابطه العامة الـ35 التي تم جمعها اجتازت الفحص بلا 404.
- بناء التطبيقات الثلاثة ينجح إنتاجياً.
- Backend مبني كـmodular monolith واضح، مع repositories وdomain state machines وقيود قاعدة بيانات جيدة.
- اعتماد الدفع وتفعيل التسجيل يجريان في معاملة ذرية.
- SQL parameterized، أحجام bodies محدودة، CORS مقيد، وتوجد security headers ومحدد طلبات Redis.
- اختبارات domain في Go تمر، مع تغطية مرتفعة داخل بعض حزم domain.
- نموذج التواصل، كتالوج الدورات، البحث، الفلاتر، التحقق من الشهادة وsitemap اختُبرت فعلياً.

## نسب الاكتمال

| المكوّن | النسبة |
|---|---:|
| الموقع العام `www` | **81%** |
| منصة التعلم `learn` | **24%** |
| النظام الإداري `erp` | **20%** |
| **اكتمال المنتج الكلي** | **42%** |

**طريقة حساب الإجمالي:** المتوسط الحسابي للمكونات الثلاثة باعتبارها الوحدات الرئيسية المتساوية في التقييم: `(81 + 24 + 20) / 3 = 41.67%`، مقرباً إلى 42%.

## قرار الإطلاق

- **الموقع العام وحده:** صالح لإطلاق محدود بعد اعتماد المحتوى القانوني والتجاري.
- **منصة التعلم:** غير صالحة للإنتاج حالياً.
- **ERP:** غير صالح للتشغيل الفعلي حالياً.
- **المنظومة كمنتج متكامل:** **NO-GO** حتى إغلاق عناصر P0.

---

# 2. خريطة المعمارية والمكونات الثلاثة

```text
الزائر / الطالب / الموظف
          │
          ▼
       Caddy TLS
          │
 ┌────────┼───────────────────────────────┐
 │        │                               │
 ▼        ▼                               ▼
www      learn                           erp
:3011    :3012                           :3013
عام      طالب/مدرب                       إدارة داخلية
 │        │ Auth.js                       │ Auth.js + MFA
 │        └──────────────┬────────────────┘
 │                       ▼
 │              Keycloak :8091
 │                       │ access token
 └──────────────┬────────┘
                ▼
          core-api Go :4001
                │
       ┌────────┼───────────┐
       ▼        ▼           ▼
 PostgreSQL   Redis     Zoom webhooks
 :5435        :6391     + worker مخطط
```

## الاتصال الفعلي

- `www` يجلب الكتالوج والشهادات العامة، ويرسل الاستفسارات عبر BFF route.
- `learn` يستخدم Auth.js/Keycloak ثم يمرر access token إلى `core-api` عبر Server Components وAPI proxy routes.
- `erp` يستخدم الآلية نفسها للعمليات الإدارية.
- `core-api` يحتوي 47 مسار OpenAPI عبر identity/catalog/enrollment/assessment/live/leads.
- قاعدة البيانات الحالية تحتوي 23 جدولاً.
- Redis يستخدم لمحدد الطلبات.
- Zoom integration مخطط في قاعدة البيانات والwebhook، لكنه غير مكتمل تشغيلياً.

## خريطة المسؤوليات والتبعيات

| المكوّن | الجمهور والغرض | الصفحات | خدمات/API المستخدمة | قاعدة البيانات | المصادقة | التكاملات الخارجية | اعتماده على البقية |
|---|---|---|---|---|---|---|---|
| `www` | زائر/عميل محتمل؛ تسويق وكتالوج وثقة | `/`, `/courses`, `/courses/[slug]`, `/about`, `/contact`, `/verify`, `/privacy`, `/terms` | public catalog/categories/certificates/leads | courses/categories/certificates/leads عبر API | لا تتطلب صفحات عامة جلسة | صور محلية، رابط learn | يعتمد على API للكتالوج والتحقق والاستفسار، ويرسل المتعلم إلى learn |
| `learn` | طالب ومدرب؛ تسجيل ودفع وتعلم واختبار وشهادات | `/`, `/login`, `/dashboard`, `/courses/[slug]`, `/learn`, `/quiz`, `/certificates` | 9 BFF routes + me/enrollments/payments/lessons/quizzes/certs/live | profiles/enrollments/payments/lessons/views/quizzes/certs/live عبر API | Auth.js + Keycloak PKCE | Keycloak، فيديوهات URL، Zoom join URL | يعتمد كلياً على Keycloak وcore-api؛ يعود إلى www للكتالوج |
| `erp` | موظفون ومديرون؛ تشغيل ومراجعة ومالية | `/`, `/login`, `/review`, `/users`, `/finance`, `/reports`, `/papers`, `/leads` | 7 BFF routes + admin/review/finance/erp APIs | كل الوحدات التشغيلية عبر API | Auth.js + Keycloak + MFA مخطط | Keycloak؛ فتح روابط الإيصالات | يعتمد كلياً على core-api وDB، ويعالج مخرجات www/learn |

### المكونات المشتركة

- `services/core-api`: Go modular monolith ومصدر قرارات الصلاحيات والأعمال.
- `cmd/worker`: polling لأحداث Zoom؛ غير شغال حالياً.
- PostgreSQL: مصدر البيانات والمعاملات.
- Redis: rate limiting فقط في التنفيذ الحالي.
- Keycloak: SSO وحسابات المستخدمين.
- `packages/api-client`: عقد مولد مستخدم جزئياً فقط؛ معظم التطبيقات تعيد تعريف الأنواع يدوياً.
- `packages/ui`: موجود لكنه غير مستخدم فعلياً من التطبيقات وlint الخاص به مكسور.

---

# 3. منهج وأدلة الاختبار

تم تنفيذ الآتي:

- `pnpm build`: نجح للتطبيقات الثلاثة.
- `pnpm lint`: فشل على مستوى monorepo.
- `pnpm --filter www lint`: نجح.
- `pnpm --filter erp lint`: نجح مع تحذير واحد.
- `pnpm --filter learn lint`: فشل بخطأ React Hooks و5 تحذيرات.
- `pnpm test`: خرج بنجاح شكلياً، لكن **0 tasks تم تنفيذها**.
- `make check` للـGo: build + vet + golangci-lint + tests كلها نجحت.
- `go test -cover ./...`: domain فقط مغطى؛ application/infrastructure/transport معظمها 0%.
- اختبار 9 مقاسات: 320، 375، 390، 430، 768، 1024، 1280، 1440، 1920.
- تسجيل دخول فعلي إلى learn وerp.
- تقديم استفسار فعلي من www والتحقق من وصوله لقاعدة البيانات ثم حذف سجل الاختبار.
- اختبار روابط www: 35 رابطاً، لا روابط HTTP مكسورة.
- اختبار API/CORS/security headers/redirects.
- فحص مباشر لحالة PostgreSQL وRedis وKeycloak والعمليات وsystemd والنسخ الاحتياطية.

### لقطات الأدلة

- `audit-assets/system-audit/learn-public-mobile.png`
- `audit-assets/system-audit/learn-public-desktop.png`
- `audit-assets/system-audit/learn-dashboard-desktop.png`
- `audit-assets/system-audit/erp-login-mobile.png`
- `audit-assets/system-audit/erp-login-desktop.png`
- `audit-assets/system-audit/erp-home-desktop.png`

---

# 4. نسب الاكتمال الموزونة

## Component 1 — الموقع العام `www`: 81%

| الفئة | الوزن | المحقق | الدليل |
|---|---:|---:|---|
| Core functionality | 30 | 23 | الكتالوج والتواصل والتحقق يعملون؛ 16/20 دورة بلا محتوى |
| UI/UX | 20 | 18 | تصميم حديث ومتسق، مع تفاوت جودة صور الدورات ووثائق تحتاج مراجعة |
| Navigation | 15 | 14 | فحص 35 رابطاً بلا فشل |
| Backend/API | 15 | 13 | catalog/contact/verify تعمل؛ `description` غائب من response خلاف العقد |
| Error/loading/empty | 5 | 4 | حالات جيدة، لكن لا `loading.tsx` |
| Responsive | 5 | 4 | لا overflow في 9 مقاسات؛ عدة chips/links أصغر من 44px |
| Testing | 5 | 1 | فحص يدوي فقط، لا اختبارات committed |
| Security/reliability | 5 | 4 | سطح عام محدود، لكن CSP وanti-spam غير موجودين |
| **المجموع** | **100** | **81** | |

## Component 2 — منصة التعلم `learn`: 24%

| الفئة | الوزن | المحقق | الدليل |
|---|---:|---:|---|
| Core functionality | 30 | 5 | SSO يفتح، لكن التسجيل والدفع والدروس والاختبارات والشهادات متوقفة عملياً بسبب 401 |
| UI/UX | 20 | 8 | صفحات أساسية موجودة، لكن التصميم أولي بلا shell أو navigation أو logout |
| Navigation | 15 | 4 | callback مكسور، رابط إنشاء دورة 404، روابط الكتالوج تعيد إلى splash |
| Backend/API | 15 | 1 | كل API authenticated فشل حياً بسبب issuer mismatch |
| Error/loading/empty | 5 | 2 | بعض الحالات موجودة؛ أخطاء 401 تُعرض كقوائم فارغة |
| Responsive | 5 | 3 | لا overflow في البيانات الفارغة؛ المحتوى الحقيقي غير قابل للتحقق |
| Testing | 5 | 0 | لا unit/integration/E2E، وlint يفشل |
| Security/reliability | 5 | 1 | PKCE موجود، لكن token مكشوف، لا refresh، ومنطق الشهادة ضعيف |
| **المجموع** | **100** | **24** | |

## Component 3 — النظام الإداري `erp`: 20%

| الفئة | الوزن | المحقق | الدليل |
|---|---:|---:|---|
| Core functionality | 30 | 4 | SSO وMFA يظهران، لكن كل العمليات تعتمد API يرفض token الحالي |
| UI/UX | 20 | 6 | واجهات بيانات أولية، بلا sidebar/header/logout؛ زر الدخول ضعيف التباين |
| Navigation | 15 | 3 | بطاقات تظهر لأدوار لا تملكها؛ بطاقة المراجعة معطلة بسبب غياب roles من session |
| Backend/API | 15 | 1 | العمليات موجودة في الكود لكنها غير قابلة للتنفيذ في runtime الحالي |
| Error/loading/empty | 5 | 1 | permission/API failures تُخلط مع empty states؛ لا `error.tsx` |
| Responsive | 5 | 2 | الصفحات الفارغة لا overflow؛ جدول المستخدمين بحالة بيانات فعلية NOT VERIFIED |
| Testing | 5 | 0 | لا frontend tests |
| Security/reliability | 5 | 3 | MFA موجود؛ لكن credentials معروفة وtoken مكشوف وAPI معطل |
| **المجموع** | **100** | **20** | |

---

# 5. Component 1 — الموقع العام `www`

## الغرض

واجهة المركز العامة: التسويق، المحتوى التعريفي، الكتالوج، صفحة الدورة، التواصل، والتحقق من الشهادات.

## الصفحات والمسارات

| المسار | الحالة المثبتة | النواقص |
|---|---|---|
| `/` | يعمل، responsive، دورات ديناميكية | ادعاءات الأرقام تحتاج توثيق |
| `/courses` | البحث والفلاتر والترقيم تعمل | invalid category يرجع كل الدورات بدلاً من رفض/صفر |
| `/courses/[slug]` | يعمل، مع حالة منهج ناقص | API لا يعيد description، فيظهر summary فقط |
| `/about` | مكتمل بصرياً | صحة أسماء/خبرات الفريق والاعتمادات تحتاج اعتماداً |
| `/contact` | تم اختبار الإرسال حتى DB | لا CAPTCHA؛ الهاتف غير معتمد وغير معروض |
| `/verify` | تم اختبار شهادة صحيحة فعلياً | يعرض الاسم الكامل علناً؛ سياسة الخصوصية تحتاج اعتماداً |
| `/privacy` | موجود | النص يصرح أنه يحتاج مراجعة قانونية |
| `/terms` | موجود | سياسة الاسترداد والمالية غير نهائية |
| `404/error` | تعمل | لا مشكلة حرجة |

## مشكلات المحتوى والبيانات

- 20 دورة منشورة.
- 16 دورة منشورة بلا دروس.
- 18 دورة بلا اختبار.
- قاعدة البيانات الحية: 6 profiles، 4 enrollments، 4 payments approved، 3 certificates، 3 leads، 2 live sessions، 74 audit logs.
- `access_token.sub` للحسابات المفحوصة يطابق `profiles.id` في DB؛ البيانات لا تظهر حالياً بسبب رفض issuer، لا بسبب فقدان الربط.
- 3 دورات اختبارية بلا فئة، بينها slug هو `---` وslugان تقنيان `crs-*`.
- OpenAPI يعلن `Course.description` في `openapi.yaml:1150-1158`، لكن runtime response لا يحتوي الحقل بسبب `courseOut` في `catalog/transport/http.go:66-74`.
- صفحة www تمنع التسجيل إذا لا يوجد منهج، لكن learn لا تطبق هذا المنع.

## النتيجة المهنية

`www` هو الجزء الوحيد القريب من معيار منتج 2026. التصميم احترافي بوضوح، لكن جاهزية المحتوى أقل من جاهزية الواجهة.

---

# 6. Component 2 — منصة التعلم `learn`

## الصفحات

| المسار | الحالة |
|---|---|
| `/` | صفحة splash أولية تعرض `R0 Foundation` |
| `/login` | يحول إلى Keycloak ويقبل تسجيل الدخول |
| `/dashboard` | يفتح بعد الدخول لكن يعرض صفراً بسبب فشل API المخفي |
| `/courses/[slug]` | يعرض بيانات عامة؛ التسجيل يرجع 401 |
| `/courses/[slug]/learn` | الكود موجود؛ رحلة حقيقية حالياً BLOCKED |
| `/courses/[slug]/quiz` | الكود موجود؛ رحلة حقيقية حالياً BLOCKED |
| `/certificates` | يعرض empty بدلاً من بيانات المستخدم بسبب 401 |
| `/instructor/courses/new` | **404 مؤكد** رغم وجود زر إليه |

## ما يعمل فعلياً

- صفحة الدخول والانتقال إلى Keycloak.
- تسجيل الدخول للحساب.
- عرض البيانات العامة للدورة.
- حماية routes بوجود session cookie.
- 404 وerror UI.

## ما لا يعمل فعلياً

- dashboard data.
- التسجيل في دورة: تم الضغط فعلياً، وكانت النتيجة `401 missing or invalid credentials`.
- عرض التسجيلات والشهادات الحالية.
- الدفع والتقدم والاختبار والشهادة والحصص المباشرة؛ كلها تعتمد token يرفضه API.

## مشكلات منطق الأعمال

1. `GetLessonContent` يسجل الدرس viewed لحظة جلبه، لا بعد مشاهدة الفيديو (`enrollment/application/service.go:201-227`). التنقل بين الدروس يكفي للوصول إلى 100%.
2. `SubmitAttempt` لا يتحقق من `progressPct=100` (`assessment/application/service.go:127-170`).
3. المحاولات غير محدودة، والواجهة تصرح بذلك (`quiz-client.tsx:100-115`). يمكن استنتاج الإجابات عبر تكرار المحاولات.
4. Backend يسمح بالتسجيل في أي دورة منشورة حتى لو بلا دروس (`enrollment/application/service.go:35-66`).
5. الدورة المجانية تدخل `pending_payment` أيضاً؛ لا يوجد تفعيل مجاني منفصل.
6. يمكن إرسال عدة إيصالات بينما يوجد إيصال submitted؛ لا يوجد قيد أو check يمنع duplicate payment request.
7. الإيصال رابط URL يكتبه المستخدم وليس upload خاصاً (`client.tsx:45-118`).

## مشكلات UX والتنقل

- لا Header ولا تنقل عام ولا قائمة حساب ولا Logout.
- login بعد redirect محمي يتجاهل `callbackUrl`: الاختبار الفعلي بدأ من `/dashboard` وانتهى بعد الدخول في `/`.
- روابط «تصفح الكتالوج» داخل dashboard تشير إلى `/` في learn، وهي splash وليست كتالوج www (`dashboard/page.tsx:225-243`).
- زر `+ دورة جديدة` يشير لمسار غير موجود وثبت أنه 404 (`dashboard/page.tsx:142-147`).
- صفحة البداية تحمل رسالة تطوير `R0 Foundation` (`app/page.tsx:29-31`).
- الاسم التجاري لا يزال «الديم»، بينما الموقع العام «العميد».
- الأزرار الداكنة تستخدم `text-secondary-foreground` غير المعرفة في `globals.css`، وظهر النص داكناً فوق خلفية داكنة في اللقطات.
- لا route-level loading UI.
- فشل API non-2xx في dashboard لا يضبط `apiError`؛ يعرض 0 وempty state كأنها بيانات صحيحة (`dashboard/page.tsx:65-105`).
- Quiz fetch غير 404 وغير 200 يترك الصفحة على «جارٍ التحميل» بلا نهاية (`quiz-client.tsx:36-47`).

---

# 7. Component 3 — النظام الإداري `erp`

## الصفحات

| المسار | الغرض | الحالة الحالية |
|---|---|---|
| `/login` | SSO | يعمل، MFA ظهر لحساب الإدارة |
| `/` | لوحة روابط | تعمل شكلياً، role awareness معطل |
| `/review` | نشر/رفض الدورات | API 401 في runtime |
| `/users` | إدارة الأدوار | API 401 في runtime |
| `/finance` | اعتماد/رفض الدفع | API 401 في runtime |
| `/reports` | مؤشرات الإدارة | API 401 في runtime |
| `/papers` | دورة الشهادة الورقية | يخفي 401 ويعرض «لا طلبات» |
| `/leads` | إدارة الاستفسارات | API 401 في runtime |

## مشكلات مؤكدة

- Auth.js session لا يحتوي roles، لكن الصفحة الرئيسية تقرأ `session.user.roles` (`erp/app/page.tsx:21-24`). النتيجة: مراجع المحتوى يرى البطاقة معطلة حتى لو كانت صلاحياته صحيحة.
- البطاقات الأخرى ظاهرة للجميع بغض النظر عن الدور، ثم تنتهي برسالة رفض.
- لا sidebar، لا top navigation، لا breadcrumb ثابت، لا logout، لا هوية متماسكة.
- لا يوجد `error.tsx` في ERP.
- صفحات الرفض لا تحتوي H1 أو رابط عودة؛ الاختبار سجل `h1=0`.
- `papers/page.tsx:52` يحول كل API error إلى قائمة فارغة، والمتغير `failed` في السطر 58 مستحيل عملياً وغير مستخدم. تم تأكيد أن حساب الاختبار رأى «لا طلبات» بينما API authentication معطل.
- جدول users لا يستخدم container قابل للتمرير أفقياً؛ الشاشة الصغيرة مع بيانات فعلية **NOT VERIFIED** بسبب تعطل API/MFA، والكود يشير إلى خطر clipping.
- fetch للأدوار ينفذ N+1: طلب users ثم طلب منفصل لكل مستخدم (`users/page.tsx:70-76`).
- لا pagination UI رغم حد 50 في API.
- قرارات approve/publish/advance لا تطلب confirmation واضحاً.
- لا رسائل نجاح؛ العنصر يختفي بعد refresh فقط.
- لا audit-log viewer رغم أن النظام يعتمد على التدقيق.

---

# 8. السبب الجذري الحرج للمصادقة

## P0 — issuer mismatch

العملية الحية لـ`core-api` تعمل بـ:

```text
KEYCLOAK_URL=http://localhost:8091
```

بينما token جديد صادر من Keycloak يحمل:

```text
iss=https://auth.alameedtraining.com/realms/al-deem
```

والتحقق يرفض أي issuer مختلف في `identity/infrastructure/auth/keycloak.go:143-149`.

### إثبات runtime

تم تسجيل الدخول فعلياً بثلاثة حسابات اختبار، ثم استدعاء:

- `/v1/me`
- `/v1/me/enrollments`
- `/v1/me/certificates`

النتيجة للحسابات الثلاثة: **401**.

## P2 — Auth.js session user id غير صحيح

التحقق الإضافي أثبت أن `access_token.sub` يطابق `profiles.id` في PostgreSQL، وبالتالي لا توجد مشكلة ترحيل هوية في البيانات الحالية. لكن `session.user.id` الذي تعرضه Auth.js لا يطابق provider subject لأن callback يستخدم `token.sub` الداخلي لـAuth.js بدلاً من subject الخاص بمزود Keycloak (`apps/learn/auth.ts:29-34` و`apps/erp/auth.ts:28-33`).

لا يؤثر ذلك على الطلبات الحالية لأنها تستخدم access token، لكنه سيؤدي إلى أخطاء ملكية إذا اعتمد أي Client Component مستقبلاً على `session.user.id`.

---

# 9. الرحلات الوظيفية الكاملة

## رحلة الزائر: استكشاف دورة

**النتيجة: PASS**

1. فتح www.
2. الانتقال للكتالوج.
3. البحث/التصفية/الصفحة الثانية.
4. فتح تفاصيل دورة.

تم التحقق من HTTP، navigation، responsive، وعرض البيانات.

## رحلة التواصل

**النتيجة: PASS**

1. فتح `/contact`.
2. تعبئة النموذج.
3. إرسال الطلب.
4. ظهور رسالة نجاح.
5. التحقق من وجود السجل في PostgreSQL.
6. حذف سجل QA بعد التحقق.

## التحقق من الشهادة

**النتيجة: PASS**

تم إدخال serial موجود، وظهرت «شهادة صحيحة ومسجلة» مع البيانات.

## تسجيل الدخول إلى learn

**النتيجة: PARTIAL**

- Keycloak login: PASS.
- العودة إلى الوجهة المطلوبة: FAIL؛ يعود إلى `/` دائماً.
- session: موجود.
- API token: FAIL 401.

## التسجيل والدفع

**النتيجة: FAIL / BLOCKED**

- زر التسجيل ظاهر.
- الضغط عليه أرجع `401 missing or invalid credentials`.
- الدفع غير قابل للوصول في الوضع الحالي.
- رفع ملف إيصال غير منفذ؛ يوجد URL input فقط.

## التعلم والتقدم

**النتيجة: FAIL / BLOCKED**

API auth يمنع الوصول للبيانات. بالإضافة إلى ذلك، منطق الكود يسجل المشاهدة عند تحميل الدرس وليس عند تحقيق مشاهدة فعلية.

## الاختبار والشهادة

**النتيجة: FAIL حالياً + خلل سلامة أعمال**

- محجوب بسبب auth الحالي.
- بعد إصلاح auth يمكن أداء الاختبار دون إكمال الدروس.
- لا حد للمحاولات.

## المدرب: إنشاء دورة

**النتيجة: BROKEN / NOT IMPLEMENTED**

زر `+ دورة جديدة` يؤدي إلى 404 مؤكد. لا توجد واجهة authoring أو quiz/live scheduling رغم وجود APIs.

## ERP: مراجعة/مالية/مستخدمون/تقارير/Leads

**النتيجة: FAIL / BLOCKED**

تسجيل الدخول يعمل، لكن API token يرفض. لم تُنفذ أي mutation حفاظاً على البيانات. لذلك publish/approve/reject/roles/advance حالياً **NOT VERIFIED runtime**.

## Zoom live

**النتيجة: NOT IMPLEMENTED END-TO-END**

- لا Zoom S2S credentials في العملية الحية.
- لا كود HTTP ينشئ Zoom meeting.
- worker غير شغال.
- webhook يعمل بلا توقيع عندما secret فارغ.

## النسخ الاحتياطي والاستعادة

**النتيجة: NOT ACTIVE**

السكريبت موجود، لكن systemd timer غير نشط ولا cron خاص بقاعدة البيانات.

---

# 10. Critical Bugs — P0/P1

## P0 — حرج

| المشكلة | الأثر | الدليل |
|---|---|---|
| issuer mismatch | يعطل كل API authenticated في learn/erp | Runtime tokens 401 + env + `keycloak.go:143-149` |
| credentials تطويرية موثقة وما زالت تعمل | takeover محتمل؛ admin يصل لإعداد MFA | `docs/LAUNCH_STATUS.md:69-76` + login فعلي |
| Zoom webhook يقبل unsigned requests | حقن أحداث مزيفة وتغيير حالات جلسات | request بلا signature رجع 200 وسُجل ثم حُذف؛ `http.go:136-149` |
| الشهادة لا تشترط اكتمال الدروس | شهادة بلا إكمال تعليمي | `assessment/application/service.go:127-170` |
| محاولات quiz غير محدودة | اكتشاف الإجابات تدريجياً ثم شهادة | `quiz-client.tsx:100-115` ولا policy خادمية |
| لا supervision ولا backup نشط | تعطل دائم أو فقد بيانات بعد reboot/failure | كل وحدات `deem-*` وtimer = inactive؛ العمليات manual |

## P1 — مرتفع

- 16/20 دورة منشورة بلا دروس، و18/20 بلا اختبار.
- learn يسمح بمحاولة التسجيل في دورة بلا منهج؛ backend يفحص published فقط.
- دورة مجانية تتطلب مسار دفع لأن enrollment دائماً `pending_payment`.
- duplicate payment submissions ممكنة أثناء وجود طلب submitted.
- receipt upload غير موجود؛ URL حر وغير مُتحقق من scheme/domain.
- access token ظاهر في `/api/auth/session` للمتصفح، خلاف تعليق «يبقى server-side».
- لا token refresh؛ access token عمره 300 ثانية بينما session المعروضة 30 يوماً.
- profile `suspended/deactivated` لا يُرفض في ActorResolver.
- instructor authoring UI غير موجود والمسار 404.
- dashboard يخفي 401 ويعرض أصفاراً مضللة.
- ERP papers يخفي الخطأ كـempty state.
- لا logout في learn أو ERP.
- Zoom S2S creation غير منفذ، secrets غير موجودة، worker غير شغال.
- API قائمة الحصص يعيد `joinUrl` متى كان مخزناً، قبل التحقق من نافذة الانضمام؛ الواجهة لا تعرضه لكن الـnetwork payload يكشفه (`livesessions/transport/http.go:200-215`).
- `isFreePreview` يظهر كشارة فقط؛ لا يوجد مسار عام لمشاهدة محتوى المعاينة، وكل صفحات learn/course محمية بالجلسة.
- SMTP الفعلي هو Mailpit محلي؛ استعادة كلمة المرور/البريد الإنتاجي **NOT VERIFIED**.
- global API rate limit 120/min حسب IP؛ طلبات BFF من خادم Next قد تشترك في IP واحد لكل المستخدمين.
- audit logs ليست ضمن نفس transaction مع القرار المالي؛ `request_id` و`ip` لا يتم ملؤهما.
- monorepo lint يفشل، learn lint يفشل.
- لا frontend tests أو E2E committed.
- النسخة المنشورة لا تقابل release commit موثق؛ تغييرات www الحالية ما زالت uncommitted.
- نشر `.next`/البناء في المكان مع حذف assets ليس atomic؛ لوحظ 404 لملف CSS قديم بعد rebuild سابق.

## P2 — متوسط

- لا `loading.tsx` في أي تطبيق.
- لا CSP أو Permissions-Policy في Caddy.
- invalid category يعيد الكتالوج كاملاً بدلاً من نتيجة فارغة/400.
- 3 دورات اختبارية منشورة بلا فئة وبـslugs غير احترافية.
- صور بعض الدورات والمدربين منخفضة الدقة ومتفاوتة الهوية.
- `www` يعرض أرقاماً وادعاءات تجارية لم يتوفر مصدر مستقل للتحقق منها.
- نصا privacy وterms يصرحان بأن المراجعة القانونية لم تتم.
- Keycloak الحي: `registration=true`, `verify_email=false`, `bruteForceProtected=false`, و`sslRequired=NONE` (المنفذ نفسه محلي خلف Caddy).
- `session.user.id` في Auth.js لا يطابق provider subject رغم أن `access_token.sub` يطابق DB.
- Direct Access Grants مفعلة لعملاء المتصفح دون حاجة واضحة.
- public contact لا يملك CAPTCHA أو honeypot أو spam scoring، ولا consent صريح لسياسة الخصوصية.
- Next BFF routes تنفذ `req.json()` دون حد body صريح قبل تمرير الطلب إلى API المحدود.
- 35 رابطاً سليماً في www، لكن عدداً من الروابط والفلاتر النصية أصغر من هدف لمس 44px.
- ERP users ينفذ N+1 لجلب الأدوار ولا يملك pagination UI.
- reports بلا تصفية زمنية أو تصدير.
- `@al-deem/ui` غير مستخدم من التطبيقات فعلياً، وتصاميم التطبيقات منفصلة.
- health check لا يختبر DB/Redis/Keycloak.
- logs لا تسجل status code أو actor، وحقلا request_id/ip في audit table غير مملوءين.

## P3 — منخفض

- تعليقات R0/R2 القديمة داخل ملفات اكتمل بعضها أو تغيرت حالته.
- imports ومتغيرات غير مستخدمة في learn/erp.
- `href` عادي بدلاً من `Link` في مواضع داخلية قليلة.
- تنسيقات الأسعار في learn لا تستخدم `Intl.NumberFormat` بصورة موحدة.
- بعض metadata ديناميكية عامة باسم «دورة»/«اختبار الدورة» بدلاً من اسم المحتوى.
- لا active-state واضح للتنقل لأن learn/erp لا يملكان shell أساساً.

---

# 11. Broken Buttons & Navigation

| العنصر | الحالة |
|---|---|
| Learn: `+ دورة جديدة` | **BROKEN** — 404 فعلي |
| Learn: login callback | **BROKEN** — `/dashboard` يعود بعد login إلى `/` |
| Learn: «تصفح الكتالوج» في dashboard | يذهب إلى splash داخل learn، لا كتالوج www |
| Learn: «تصفح الدورات» في empty state | المشكلة نفسها |
| Learn: زر التسجيل | **BROKEN runtime** — 401 |
| Learn: دفع/درس/اختبار/شهادات | BLOCKED بسبب 401 |
| Learn: logout | **NOT IMPLEMENTED** |
| ERP: بطاقة review لمراجع | معطلة لأن roles غير موجودة في session |
| ERP: users/finance/reports/leads | تظهر لغير المصرح ثم تنتهي برسالة منع |
| ERP: كل mutations | BLOCKED حالياً؛ runtime verification غير ممكن بسبب 401 |
| ERP: logout | **NOT IMPLEMENTED** |
| ERP: papers empty state | مضلل؛ يعرض empty عند 401 |
| Live: join button | `canJoin` محسوب ولا يُستخدم؛ scheduled داخل النافذة قد لا يظهر له الزر |

---

# 12. Backend وAPI

## حالة التكاملات الخارجية

| التكامل | الحالة المثبتة |
|---|---|
| Keycloak browser login | PASS للطالب وحساب ERP التجريبي |
| Keycloak → core-api token validation | FAIL بسبب issuer mismatch |
| MFA | شاشة الإعداد ظهرت فعلياً لحساب admin؛ اكتمال enrollment للمستخدم الشرعي NOT VERIFIED |
| PostgreSQL | healthy وحية، 23 جدولاً |
| Redis | healthy وrate limiter مفعّل في العملية |
| SMTP | Mailpit محلي فقط؛ بريد إنتاجي NOT VERIFIED |
| Zoom S2S OAuth | NOT IMPLEMENTED / لا credentials في runtime |
| Zoom webhook | يعمل تقنياً لكنه يقبل unsigned حالياً — P0 |
| Worker | NOT RUNNING |
| Object storage للإيصالات | NOT IMPLEMENTED |
| Video signing/CDN entitlement | الرابط يعاد بعد entitlement، لكنه غير signed ومشاركته ممكنة |

## مجموعات API ومتطلبات الوصول

| الوحدة | المسارات الرئيسية | الوصول |
|---|---|---|
| Health | `/health` | عام |
| Identity | `/me`, `/me/profile` | مستخدم؛ `/admin/users*` مدير نظام |
| Catalog | `/public/courses*`, `/public/categories` | عام؛ authoring للمدرب؛ review للمراجع |
| Enrollment/Payment | `/enrollments`, `/me/enrollments`, `/me/payments` | طالب؛ `/finance/payments*` مالي |
| Learning | `/me/enrollments/{id}/lessons*` | مالك تسجيل active/completed |
| Assessment | `/quizzes*`, `/me/certificates` | طالب/مدرب حسب العملية |
| Certificate verification | `/public/certificates/{serial}` | عام |
| Paper certificates | `/me/paper-requests`, `/erp/paper-requests*` | طالب / ERP staff-manager-admin |
| Live | `/live-sessions*`, `/courses/{id}/live-sessions` | مدرب/طالب حسب العملية |
| Zoom webhook | `/webhooks/zoom` | عام مع HMAC مفترض، لكنه معطل فعلياً عند غياب secret |
| Leads | `/public/leads` | عام؛ `/erp/leads*` system_admin |
| Reporting | `/erp/stats` | أدوار ERP |

## نقاط القوة

- 47 path موثقاً في OpenAPI.
- وحدات domain واضحة.
- state machines وقيود CHECK/FK.
- أحجام request bodies محددة.
- SQL parameterized.
- IDOR checks للدفع والدروس والشهادات الورقية.
- payment approval + enrollment activation ذريان.
- certificate issuance idempotent لكل enrollment.
- CORS allowlist يعمل واختبر فعلياً.
- Auth.js CSRF/callback cookies تحمل `HttpOnly; Secure; SameSite=Lax` في الفحص الحي.
- rate limiter موجود ويعمل مع Redis.
- `pnpm audit --prod` لم يجد ثغرات dependencies معروفة وقت الفحص.
- graceful shutdown وHTTP timeouts.

## جودة الكود والمعمارية

### ما يدعم التوسع

- فصل domain/application/ports/infrastructure/transport داخل وحدات Go.
- PostgreSQL repository interfaces تسمح باختبار domain وعزل التخزين.
- Next Server Components مستخدمة للقراءة، وClient Components محصورة غالباً في التفاعل.
- OpenAPI وعقد TypeScript مولد موجودان.
- state transitions المالية والتعليمية موجودة في الخادم وليست مجرد حالة client.

### الدين التقني

- `apps/learn/app/dashboard/page.tsx` بطول 323 سطراً ويجمع auth و3 API fetches وrole detection وواجهتي طالب/مدرب.
- أنواع API مكررة يدوياً في الصفحات؛ `@al-deem/api-client` يستخدم في موضع واحد فقط.
- `@al-deem/ui` غير مستخدم؛ لكل تطبيق CSS ونمط مكونات مستقل.
- Auth.js config مكرر بين learn وerp، وكذلك BFF proxy boilerplate وauth wrappers في Go transports.
- لا طبقة موحدة لتمييز 401/403/404/5xx؛ عدة صفحات تحول كل non-OK إلى null/empty.
- عمليات متعددة تنفذ audit بعد commit وبطريقة best-effort، فلا توجد وحدة transaction تشمل القرار وسجل التدقيق.
- `main.go` يجمع wiring لكل الوحدات يدوياً؛ مقبول الآن لكنه سيزداد صعوبة مع التوسع.
- لا generated client فعلي في مسارات fetch الرئيسية، ما سمح بانحراف `Course.description` عن OpenAPI.
- ملفات lock/workspace مكررة داخل التطبيقات رغم وجود workspace جذري.

## النواقص

- runtime auth مكسور بالكامل.
- `Course.description` موجود في العقد وغير موجود في response.
- health endpoint يرجع `ok` حتى لو فشل DB وبدأ التطبيق بلا modules (`cmd/api/main.go:45-60`).
- لا readiness check لقاعدة البيانات/Redis/Keycloak.
- لا audience validation للJWT، و`exp`/`iss` لا يُشترطان عند غيابهما (`keycloak.go:143-149`).
- profile status لا يدخل قرار authorization.
- authorization wrappers مكررة في كل transport.
- معظم audit writes best-effort وخارج المعاملة.
- لا object storage أو signed receipt URLs.
- لا signed/expiring video URLs؛ رابط الفيديو يرجع مباشرة للمستخدم المصرح ويمكن مشاركته.
- لا notification/email module تشغيلي.
- لا Zoom meeting provisioning.
- N+1 في users roles وoutline sections.
- invalid category يعيد كل الدورات؛ تم اختباره وأعاد total=20.

---

# 13. Security Findings

| الأولوية | finding |
|---|---|
| P0 | حسابات تطويرية وكلمات مرورها في ملفات موثقة وتعمل فعلياً |
| P0 | admin لم يثبت MFA بعد؛ كلمة المرور المعروفة تصل إلى شاشة تسجيل جهاز TOTP |
| P0 | webhook غير موقع مقبول عند غياب secret |
| P0 | تعطيل حساب profile لا يمنع ActorResolver من السماح له |
| P0 | سلامة الشهادات: لا شرط completion + unlimited attempts |
| P1 | access token مكشوف في client session |
| P1 | لا refresh token lifecycle؛ session أطول كثيراً من access token |
| P1 | لا audience check للJWT |
| P1 | receipt URL حر يفتح داخل ERP |
| P1 | `joinUrl` للحصة قد يظهر في API list قبل نافذة الانضمام |
| P1 | email verification معطل و`bruteForceProtected=false` في realm الحي |
| P1 | Keycloak direct access grants مفعلة لكل clients |
| P2 | لا CSP ولا Permissions-Policy |
| P2 | public contact بلا CAPTCHA/abuse controls خاصة؛ يعتمد على limiter عام |
| P2 | certificate page تعرض الاسم الكامل لمن يعرف serial؛ يلزم اعتماد سياسة الخصوصية |

`pnpm audit --prod` لم يجد ثغرات dependencies معروفة، لكنه لا يغطي عيوب المنطق أعلاه.

---

# 14. Responsive وUI/UX

## www

- لا horizontal overflow في جميع المقاسات التسعة.
- Hero وnavigation يتكيفان جيداً.
- بعض chips والروابط النصية أقل من 44px: بين 8 و33 عنصراً حسب الصفحة/العرض؛ ليست كلها أزراراً أساسية، لكن فلاتر الكتالوج تحتاج تكبير touch area.
- صور دورات قديمة ومتفاوتة الجودة تقلل polish.
- الصفحة طويلة، لكنها منظمة وليس مجرد تمدد للنسخة المكتبية.

## learn

- لا overflow في الصفحات التي أمكن عرضها.
- لا توجد mobile navigation أصلاً؛ لأن shell نفسه غير موجود.
- شاشة البداية تبدو prototype وليست منتجاً 2026.
- dashboard سطح واسع فارغ، بلا sidebar أو actions ثابتة.
- النص على الأزرار الداكنة منخفض التباين بسبب token غير معرف.
- حالات البيانات الكاملة على الهاتف **NOT VERIFIED** بسبب auth runtime.

## ERP

- login والصفحة الرئيسية لا overflow.
- تجربة desktop لا تستفيد من المساحة كسياق SaaS؛ بطاقات فقط بلا sidebar/topbar.
- users table على الهاتف **NOT VERIFIED** runtime، والكود لا يوفر `overflow-x-auto`.
- صفحات permission denied بلا H1 أو navigation.
- لا confirmation dialogs للقرارات المالية والنشر.

## هل يبدو كمنتج احترافي في 2026؟

- **www: نعم إلى حد كبير.**
- **learn: لا.** واجهة prototype، shell ناقص، وظائفها الأساسية مكسورة.
- **erp: لا.** واجهة تشغيل أولية وليست لوحة SaaS مكتملة.
- **المنتج الكلي: لا** لأن الجودة البصرية للموقع العام لا تعوض تعطل العمليات الأساسية.

---

# 15. Testing Status

## المتاح

- 7 ملفات Go tests تقريباً تركز على domain وmiddleware جزئياً.
- build TypeScript للتطبيقات الثلاثة ناجح.
- lint منفصل لـwww وerp ينجح.
- browser QA يدوي نُفذ خلال هذا التدقيق.

## النتائج

- `pnpm build`: PASS.
- `make check`: PASS، وgolangci-lint = 0 issues.
- `pnpm lint`: FAIL بسبب `@al-deem/ui` لا يملك eslint dependency.
- learn lint: FAIL بخطأ `set-state-in-effect` و5 warnings.
- erp lint: PASS مع warning لمتغير `failed` غير مستخدم.
- `pnpm test`: 0 tasks؛ النجاح لا يعني وجود اختبارات.

## التغطية

- domain: جيدة، تقريباً 77.8%–100% حسب الحزمة.
- application: 0%.
- infrastructure/PostgreSQL: 0%.
- HTTP transports: 0% تقريباً، باستثناء live transport 7.3%.
- Auth/JWT: 0%.
- Frontend unit/integration/E2E: 0 committed tests.

## الاختبارات الحرجة المفقودة

- login → callback → API authenticated.
- issuer/JWKS/audience/token refresh.
- enrollment/payment approval end-to-end.
- free course enrollment.
- duplicate payment prevention.
- progress completion policy.
- quiz eligibility/attempt limits/certificate issuance.
- role matrix لكل ERP route/action.
- webhook unsigned/replay tests.
- responsive tables and populated dashboards.
- backup/restore automation in CI/ops.

---

# 16. عناصر NOT VERIFIED

تعذر إثبات العناصر التالية في الحالة الحية، ولا يجوز اعتبارها عاملة:

- اعتماد/رفض دفعة من ERP حتى تفعيل التسجيل فعلياً؛ auth الحالي يمنع العملية.
- إنشاء/تعديل/إرسال دورة من واجهة المدرب؛ الواجهة غير موجودة.
- نشر/رفض دورة من ERP؛ auth يمنعها ولا توجد بيانات pending حالياً.
- مشاهدة فيديو كامل وتحديث التقدم الصحيح؛ auth الحالي يمنع الوصول إلى الرحلة.
- اجتياز اختبار ثم إصدار شهادة عبر واجهة المستخدم الحالية.
- إدارة الأدوار من صفحة users بحساب admin؛ توقف الاختبار عند شاشة إعداد MFA دون تسجيل جهاز جديد.
- تصميم users table مع بيانات فعلية على 320–430px.
- إنشاء اجتماع Zoom حقيقي أو استلام recording؛ credentials والكود التشغيلي غير متوفرين.
- إرسال بريد reset/notification إلى صندوق خارجي؛ SMTP الحالي Mailpit.
- صلاحية TLS من شبكة عامة خارج الخادم عند استخدام DNS مباشر؛ Caddy مضبوط `tls internal`.
- استعادة backup حديث؛ لا backup مجدول أو ملف backup حالي.
- تحمل الحمل الفعلي؛ أرقام TTFB الواردة عينة واحدة وليست load test.
- تدقيق WCAG كامل بقارئ شاشة؛ الفحص شمل البنية والتباين المرئي والأبعاد فقط.
- صحة ادعاءات 26 ألف متدرب و120 برنامجاً وأسماء/اعتمادات الفريق من مصدر أعمال مستقل.

# 17. الملاحظات التشغيلية

- PostgreSQL وRedis وKeycloak وMailpit تعمل في Docker.
- Next apps وcore-api تعمل كعمليات يدوية.
- `deem-core-api`, `deem-worker`, `deem-www`, `deem-learn`, `deem-erp`, `deem-backup.timer` كلها inactive.
- worker غير موجود كعملية حية.
- لا DB backup cron؛ cron الموجود خاص بنسخ Downloads فقط.
- سكربت backup المخطط ينتج `.sql.gz` غير مشفر؛ تشفير النسخ ومكان تخزين خارج الخادم غير منفذين.
- `/opt/deem` غير مثبت في الحالة الحالية.
- لا CI workflows في المستودع.
- نسخة www المنشورة الحالية تعتمد على تعديلات كثيرة غير committed في working tree؛ لا يوجد release commit مطابق لما يعمل الآن.
- لا Sentry أو OpenTelemetry أو Prometheus.
- health لا يثبت جاهزية dependencies.
- TLS الحالي يستخدم `tls internal` في Caddy. الثقة العامة خارج هذا الجهاز/Cloudflare **NOT VERIFIED**.
- response times المحلية جيدة: www ~0.05s، courses ~0.20s، API catalog ~0.008s في عينة واحدة؛ ليست load test.

---

# 18. خارطة طريق الإكمال

## Phase 1 — Critical Fixes

| المهمة | المكوّن | الأولوية | السبب | التبعيات | التعقيد | Definition of Done |
|---|---|---|---|---|---|---|
| توحيد issuer/JWKS config | Backend/Auth | P0 | كل API authenticated = 401 | Keycloak/Caddy | M | `/me` = 200 لتوكن learn وerp، اختبارات issuer/aud |
| تدوير كل حسابات وأسرار التطوير | Security | P0 | credentials معروفة وتعمل | إدارة المركز | M | حذف الحسابات التجريبية أو تدويرها، لا secret في docs |
| فرض MFA مسبقاً للإدارة | Keycloak | P0 | attacker يستطيع تسجيل TOTP أولاً | تدوير الحسابات | M | admin/finance يملكان MFA موثقاً؛ recovery مضبوط |
| رفض webhook عند غياب secret | Live/API | P0 | unsigned event injection | Zoom secret | S | startup fails أو endpoint 503؛ unsigned=401 دائماً |
| تشغيل الخدمات تحت systemd | DevOps | P0 | restart/reboot غير مضمون | env production | M | كل الوحدات active/enabled وrestart test ناجح |
| تفعيل backup timer واختبار restore | DevOps/DB | P0 | خطر فقد البيانات | storage آمن | M | backup يومي مشفر + restore drill موثق |
| اشتراط completion للشهادة | Assessment | P0 | شهادة دون إكمال | progress policy | M | attempt/issue يرفض progress<100، اختبارات integration |
| attempt policy | Assessment | P0 | brute-force الإجابات | قرار أعمال | M | حد محاولات/cooldown/question randomization + audit |

## Phase 2 — Feature Completion

| المهمة | المكوّن | الأولوية | السبب | التبعيات | التعقيد | Definition of Done |
|---|---|---|---|---|---|---|
| إكمال 16 منهجاً و18 اختباراً أو إلغاء نشرها | Catalog | P1 | محتوى منشور غير قابل للتعلم | اعتماد المحتوى | XL | لا دورة published بلا minimum curriculum |
| بناء Course Authoring UI | learn | P1 | رابط 404 وAPIs بلا واجهة | auth fixed | XL | create/edit/sections/lessons/submit/quiz/live E2E |
| Upload إيصال خاص | learn/API | P1 | URL حر وغير آمن | object storage | L | upload signed، MIME/size/hash، private access |
| منع duplicate payment | Backend | P1 | طلبات مالية مكررة | migration/state rule | M | قيد DB + 409 + اختبار concurrency |
| تفعيل الدورات المجانية فوراً | Backend | P1 | المجاني يطلب دفعاً | policy | M | free enrollment = active ذرياً |
| Zoom S2S provisioning | Live | P1 | التكامل الحالي غير مكتمل | Zoom credentials | L | schedule ينشئ meeting ويخزن join URL؛ webhook signed |
| Notification/email production | Shared | P1 | reset/alerts غير مضمونة | SMTP provider | M | email verified + reset/payment/course notifications |
| عرض `description` في API | Catalog | P1 | contract/runtime drift | API tests | S | response يطابق OpenAPI/generated schema |

## Phase 3 — UX/UI Upgrade

| المهمة | المكوّن | الأولوية | السبب | التبعيات | التعقيد | Definition of Done |
|---|---|---|---|---|---|---|
| Design shell موحد لـlearn | learn | P1 | لا nav/logout/هوية | auth fixed | L | header/sidebar/mobile nav/profile/logout |
| SaaS shell لـERP | erp | P1 | لا navigation أو role context | roles API | L | role-aware sidebar، breadcrumbs، account menu |
| إصلاح tokens والتباين | learn/erp | P1 | نص داكن على زر داكن | shared UI | S | WCAG AA للأزرار والنصوص |
| حالات feedback موحدة | learn/erp | P2 | أخطاء/نجاح ضمنية | component library | M | toast/modal/skeleton/error/empty patterns |
| Confirmation للقرارات الحساسة | ERP | P1 | نشر واعتماد بلا تأكيد | modal | S | confirmation يعرض الأثر والهدف |
| توحيد الاسم إلى «العميد» | learn/erp/Keycloak | P2 | هوية متضاربة | قرار المالك | S | metadata/UI/email متسقة |

## Phase 4 — Responsive Optimization

| المهمة | المكوّن | الأولوية | السبب | التبعيات | التعقيد | Definition of Done |
|---|---|---|---|---|---|---|
| Responsive populated tables | ERP | P1 | حالة البيانات الفعلية غير مختبرة | auth fixed/fixtures | M | 320–1920 بلا clipping؛ card/table strategy |
| Mobile lesson player | learn | P1 | المحتوى الحقيقي NOT VERIFIED | auth/content | M | player/sidebar/touch controls tested |
| 44px touch targets | www/learn/erp | P2 | عشرات العناصر أصغر | design tokens | S | controls الأساسية ≥44px |
| Density rules tablet/desktop | ERP | P2 | مساحات واسعة غير مستغلة | shell | M | tables/filters/summary panels متوازنة |

## Phase 5 — QA & Testing

| المهمة | المكوّن | الأولوية | السبب | التبعيات | التعقيد | Definition of Done |
|---|---|---|---|---|---|---|
| إصلاح lint pipeline | Monorepo | P1 | `pnpm lint` يفشل | package deps | S | root lint = 0 errors |
| E2E critical journeys | All | P1 | لا اختبارات frontend | stable fixtures | L | CI يغطي login/enroll/pay/approve/learn/quiz/cert |
| API integration tests | Backend | P1 | application/transport 0% | test DB/Keycloak | L | role/IDOR/transactions/error contracts covered |
| Visual responsive suite | All | P2 | regression محتمل | Playwright | M | 9 viewports + populated states in CI |
| Contract tests OpenAPI | Shared | P1 | description drift | generated client | M | responses validated against schema |

## Phase 6 — Production Hardening

| المهمة | المكوّن | الأولوية | السبب | التبعيات | التعقيد | Definition of Done |
|---|---|---|---|---|---|---|
| Token lifecycle + server-only token | Auth | P1 | token exposed وينتهي بعد 5 دقائق | Auth.js strategy | L | refresh rotation، session endpoint بلا access token |
| تصحيح `session.user.id` | Auth.js | P2 | id في session لا يساوي provider subject | auth callback | S | session id يطابق access-token sub مع اختبار |
| JWT audience/status enforcement | API | P1 | قبول token غير مخصص/حساب موقوف | auth tests | M | aud/azp/exp/iss mandatory + status active |
| Readiness/metrics/alerts | Ops | P1 | health كاذب ولا monitoring | observability stack | M | readiness dependencies + alerts + dashboards |
| Atomic release deployment | Ops | P1 | stale hashed assets | release dirs/symlink | M | zero-downtime deploy + rollback + retained assets |
| CSP/Permissions-Policy | Web edge | P2 | hardening ناقص | asset inventory | S | headers تختبر آلياً دون كسر التطبيقات |
| مراجعة قانونية ومحتوى | www | P1 | privacy/terms/claims غير معتمدة | المالك/محامٍ | M | نصوص وهواتف وأرقام واعتمادات معتمدة |

---

# 19. تعريف الجاهزية للإطلاق

لا يصبح المنتج Production Ready إلا بعد:

- إغلاق كل P0.
- نجاح رحلة فعلية كاملة: login → enrollment → payment → finance approval → learning → completion → quiz → certificate → verify.
- نجاح رحلة instructor authoring/review/publish.
- نجاح role matrix لكل صفحات ERP.
- تشغيل worker والنسخ الاحتياطي والمراقبة.
- وجود E2E في CI، وليس اختباراً يدوياً فقط.
- عدم وجود دورة منشورة قابلة للدفع بلا محتوى معتمد.
- اعتماد المحتوى القانوني وبيانات المركز.

---

# 20. الخلاصة

المشروع **ليس مجرد واجهة فارغة**؛ الـbackend يحتوي أساساً جيداً من state machines، صلاحيات، معاملات وقيود. لكن الوثائق السابقة التي تصفه بأنه مكتمل لا تعكس حالة runtime الحالية. الموقع العام ناضج نسبياً، بينما learn وerp متوقفان عند حاجز مصادقة مشترك وتحيط بهما فجوات منتج وأمن وتشغيل.

القرار الصحيح هو عدم إعادة الكتابة من الصفر. يجب أولاً إصلاح P0 في الهوية والتشغيل وسلامة الشهادة، ثم استكمال واجهات learn/erp وربطها باختبارات E2E حقيقية، وبعدها فقط يمكن وصف المنظومة بأنها جاهزة للإنتاج.
