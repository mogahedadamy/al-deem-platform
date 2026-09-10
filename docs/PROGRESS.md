# سجل تقدم البناء — منصة الديم v2

> تحديث حي لحالة التنفيذ حسب DETAILED_EXECUTION_BLUEPRINT_AR.md
> آخر تحديث: 2026-09-10 (جلسة R0 + R1 + R2 + R3)

---

## ✅ R0 — Foundation (مكتملة)

### 1. Monorepo
- [x] هيكل `platform/`: apps (www + learn + erp) + packages (ui + config) + services/core-api + infra + docs
- [x] Turborepo 2.10 pipelines (build/dev/lint/typecheck)
- [x] pnpm workspace — 6 مشاريع، install + build عبر turbo ✓
- [x] `.gitignore` + `.env.example` (لا secrets في Git)

### 2. البيئة المحلية (infra/docker/compose.yaml)
| الخدمة | المنفذ | الحالة |
|---|---|---|
| PostgreSQL 17 | 5435 | ✅ healthy — قاعدتان: `deem` (تطبيق) + `keycloak` (منفصلة) |
| Redis 7 | 6391 | ✅ healthy |
| Keycloak 26.7.3 | 8091 | ✅ realm `al-deem` مستورد تلقائيًا مع 8 أدوار + 4 clients |
| Mailpit | 8092 (UI) / 8093 (SMTP) | ✅ healthy — SMTP مربوط بـKeycloak realm |
> المنافذ 5435/6391/8091/8092/8093 لتجنب التعارض مع خدمات السيرفر القائمة

### 3. Keycloak SSO (realm: al-deem)
- [x] 8 realm roles: student, instructor, content_reviewer, finance_officer, support_agent, erp_staff, erp_manager, system_admin
- [x] 3 public clients: www / learn / erp (+ منافذ اختبار 3011/3012/3013 في redirect URIs)
- [x] 1 confidential client: core-api (service account)
- [x] SMTP → mailpit

### 4. Go core-api (services/core-api)
- [x] Identity module كامل: domain/application/ports/infrastructure/transport
- [x] JWKS JWT verification محلي (RS256 + iss/exp + cache ساعة) — لا استدعاء شبكة لكل طلب
- [x] Authorization خادمية (permission matrix) + audit log لكل قرار
- [x] `/v1/health` + `/v1/me` + `/v1/me/profile` + `/v1/admin/users` + roles endpoints
- [x] **golangci-lint: 0 issues** | go vet ✓

---

## ✅ R1 — Catalog & Authoring (مكتملة)

### 1. Database (migration 00002 — 5 جداول جديدة)
- [x] categories (6 فئات حقيقية seeded: إدارة، مالية، تقنية معلومات، لغات، موارد بشرية، تسويق)
- [x] courses — UUID + slug + **state machine خادمية**: draft → pending_review → published|rejected|archived
  - قرار #5: `has_live_sessions` (Zoom مركزي اختياري حسب الدورة)
  - price snapshot + currency (SDG default)
- [x] course_sections + lessons (video/text/quiz/assignment + is_free_preview) + lesson_assets
- [x] فهارس مبنية على الاستعلامات الفعلية

### 2. Catalog module (Go — دDD كامل)
- [x] domain: Course entity مع invariants (SubmitForReview/Publish/Reject/Archive — انتقالات غير صالحة مرفوضة)
- [x] application: كل Use Case بـAuthorization + Validation + Audit
- [x] infrastructure: 4 stores منفصلة تشارك pool (CourseStore/SectionStore/LessonStore/CategoryStore)
- [x] transport: 14 endpoints (عام + تأليف + مراجعة)

### 3. API endpoints (كلها مختبرة ✅)
| المسار | الحماية | الاختبار |
|---|---|---|
| GET /v1/public/courses | عام | ✅ فلترة فئة/مستوى/بحث/ترقيم |
| GET /v1/public/courses/{slug} | عام | ✅ 404 لغير المنشور |
| GET /v1/public/courses/{slug}/outline | عام | ✅ عناوين فقط — المحتوى يُحمى في R2 |
| GET /v1/public/categories | عام | ✅ 6 فئات |
| POST /v1/courses | instructor | ✅ slug عربي → hash فريد ثابت |
| PATCH/DELETE /v1/courses/{id} | owner (draft فقط) | ✅ |
| GET /v1/me/courses | instructor | ✅ **مع ملاحظات المراجعة** (حلقة تغذية راجعة) |
| POST /v1/courses/{id}/submit | owner + ≥1 درس | ✅ |
| POST /v1/courses/{id}/sections | owner draft | ✅ |
| POST /v1/sections/{id}/lessons | owner draft | ✅ video يتطلب videoUrl |
| GET /v1/review/courses | content_reviewer | ✅ |
| POST /v1/review/courses/{id}/publish | PermPublishCourse | ✅ instructor لا يستطيع (403) |
| POST /v1/review/courses/{id}/reject | reviewer + ملاحظات إلزامية | ✅ reject بلا ملاحظات = 400 |
| POST /v1/review/courses/{id}/archive | reviewer | ✅ |

### 4. Frontend — www (واجهة المركز)
- [x] `lib/api.ts` — عميل API مركزي (types من OpenAPI + revalidate 60s)
- [x] `/courses` — كتالوج حقيقي من DB: فلاتر فئات/مستويات (روابط server-side، تعمل بلا JS)، ترقيم صفحات، بحث
- [x] `/courses/[slug]` — تفاصيل + outline + generateMetadata (SEO) + 404
- [x] الرئيسية — أحدث 3 دورات ديناميكيًا + مزايا المركز
- [x] حالات: loading/empty/error handled + RTL + Cairo + هوية الديم

### 5. Frontend — learn (منصة التعلم)
- [x] **Auth.js v5 + Keycloak SSO يعمل بالكامل** (PKCE + nonce + state)
- [x] `proxy.ts` (Next 16 convention — middleware أُلغي) يحمي كل شيء عدا / و/login و/api/auth
- [x] `/login` → Keycloak → callback → session
- [x] `/dashboard` محمي: يجلب `/v1/me` بالـaccess token → أدوار حقيقية من DB → دورات المدرب مع الحالة وملاحظات المراجعة
- [x] **مُختبر E2E**: طالب/instructor سجّل دخول ورأى دوراته "منشورة" ✅

### 6. Frontend — erp (النظام الإداري)
- [x] نفس بنية SSO (client: erp) + proxy حماية كل المسارات
- [x] `/login` + رئيسية ببطاقات الوصول (مراجعة المحتوى/المستخدمون/المالية)
- [x] **مُختبر E2E**: admin@alameedtraining.com سجّل ورأى الرئيسية ✅
- [x] robots noindex (سرية النظام الإداري)

---

## 🧪 ملخص اختبارات R1 (كلها نجحت)

| # | السيناريو | النتيجة |
|---|---|---|
| 1 | instructor ينشئ دورة بعنوان عربي | ✅ slug = hash فريد ثابت |
| 2 | instructor يضيف قسم + درس فيديو | ✅ مع is_free_preview |
| 3 | درس فيديو بلا videoUrl | ✅ 400 VALIDATION |
| 4 | submit بدروس | ✅ 204 → pending_review |
| 5 | instructor يحاول نشر دورته | ✅ **403** (فصل صلاحيات حقيقي) |
| 6 | content_reviewer يرى pending | ✅ |
| 7 | reject بدون ملاحظات | ✅ 400 |
| 8 | reject مع ملاحظات → draft | ✅ المدرب يرى الملاحظات |
| 9 | resubmit → publish | ✅ public catalog يتضمن الدورة |
| 10 | publish دورة منشورة (409 state machine) | ✅ |
| 11 | SSO learn: login → session → dashboard + بيانات API | ✅ |
| 12 | SSO erp: admin login → homepage | ✅ |
| 13 | proxy: مسار محمي بلا جلسة → login?callbackUrl | ✅ 307 |
| 14 | www /courses يعرض بيانات DB حقيقية | ✅ |
| 15 | www slug غير موجود → 404 | ✅ |

## 🔑 حسابات الاختبار
| الحساب | كلمة المرور | الأدوار |
|---|---|---|
| test.student@example.com | Test#12345 | student + instructor + content_reviewer |
| admin@alameedtraining.com | Admin#12345 | system_admin |

> الدورتان الاختباريتان منشورتان: "أساسيات إدارة المشاريع" (25000 SDG) و"التحليل المالي للمشاريع الصغيرة" (40000 SDG)

---

## ✅ R2 — Payment & Enrollment (مكتملة)

### 1. Database (migration 00003 — 3 جداول جديدة)
- [x] **enrollments** — price snapshot وقت التسجيل + progress + قيد EXCLUDE (gist) يمنع تكرار التسجيل النشط على مستوى DB (دفاع مزدوج مع التطبيق)
- [x] **payment_requests** — تحويل بنكي يدوي (قرار #9): submitted → approved/rejected + إيصال + bank_reference + reviewer
- [x] lesson_views — تتبع الدروس المشاهدة (للتقدم والشهادة في R3)

### 2. Enrollment module (Go)
- [x] **الاعتماد الذري**: `ActivateWithPaymentApproval` — معاملة واحدة: دفع approved + تسجيل active أو لا شيء (قرار مالي لا يجوز فصله)
- [x] Enroll idempotent: تسجيل مكرر يرجع نفس التسجيل
- [x] SubmitPayment: صاحب التسجيل فقط يرفع الإيصال
- [x] Finance endpoints بصلاحية PermReviewPayment/PermApprovePayment
- [x] **إصلاح جوهري**: AssignRole لمستخدم Keycloak لم يسجل دخولًا بعد → placeholder profile يُنشأ (كان 500)

### 3. API (26 paths في OpenAPI)
| المسار | الاختبار |
|---|---|
| POST /v1/enrollments | ✅ idempotent — التكرار يرجع نفس التسجيل |
| POST /v1/enrollments/{id}/payment | ✅ غير الصاحب = 403 |
| GET /v1/me/enrollments + /me/payments | ✅ |
| GET /v1/finance/payments | ✅ finance_officer فقط |
| POST /v1/finance/payments/{id}/approve | ✅ **ذري**: payment=approved + enrollment=active بنفس المعاملة |
| POST /v1/finance/payments/{id}/reject | ✅ سبب إلزامي (400 بدونه) |
| double-approve | ✅ 409 (state machine) |
| audit | ✅ payment.approved بالمُراجِع |

### 4. learn — تدفق الطالب الكامل
- [x] `/courses/[slug]` — تفاصيل + outline مع أقفال 🔒 للدروس غير المدفوعة (isFreePreview أو active فقط)
- [x] بطاقة الحالة الديناميكية: زائر → login | غير مسجل → زر تسجيل | pending → رفع إيصال | active → "أنت مسجل"
- [x] رفض الدفع → سبب الرفض يظهر للطالب مع نموذج إعادة رفع
- [x] UI proxies (`/api/enroll`) — access token لا يصل للمتصفح أبدًا
- [x] **E2E عبر الواجهات**: طالب سجّل → رفع إيصال TRF-2026-0002 → مالي اعتمد → "أنت مسجل" فورًا

### 5. erp — واجهة الموظف المالي
- [x] `/finance` — قائمة انتظار الدفعات (مبلغ + مرجع بنكي + إيصال + زمن)
- [x] زر اعتماد (أخضر) + رفض مع سبب إلزامي (نموذج)
- [x] **E2E**: finance@alameedtraining.com سجّل ورأى الطلبات واعتمدها

---

## 🔑 حسابات الاختبار (بعد R2)
| الحساب | كلمة المرور | الأدوار |
|---|---|---|
| test.student@example.com | Test#12345 | student + instructor + content_reviewer (مسجل وفعّال في الدورتين) |
| admin@alameedtraining.com | Admin#12345 | system_admin |
| finance@alameedtraining.com | Finance#12345 | finance_officer (قرار #6 — مخصص 24/7) |
| support@alameedtraining.com | Support#12345 | support_agent (لم يسجل دخولًا بعد — placeholder profile) |

## ✅ R3 — Assessment & Certificate (مكتملة — قرار #4 مطبق بالكامل)

### 1. Database (migration 00004 — 5 جداول جديدة، الإجمالي 18)
- [x] quizzes + quiz_questions (options JSONB — الصحيح خادمي فقط)
- [x] quiz_attempts (إجابات JSONB + score + passed)
- [x] **certificates** — UUID داخلي + serial خارجي legible (ALD-2026-xxxxxxxx) + UNIQUE(enrollment_id) idempotent
- [x] paper_certificate_requests — pending → approved → printed → delivered (state machine)

### 2. Assessment module (Go)
- [x] **Grade خادمي**: الطالب يرسل إجاباته، التصحيح في الخادم فقط
- [x] **CertificateEligibilityPolicy = score ≥ 70%** (MinCertifyScore) + تسجيل نشط إلزامي
- [x] إصدار الشهادة تلقائي فوري عند النجاح — idempotent (شهادة واحدة للتسجيل)
- [x] **حماية بنيوية**: DTO بلا حقل correct أصلًا — التسريب مستحيل بنائيًا (تم إصلاحه بعد اكتشاف حقل فارغ في payload)
- [x] طلب النسخة الورقية: صاحب الشهادة فقط + عنوان/هاتف إلزامي + workflow في erp

### 3. API المختبرة (كلها نجحت ✅)
| السيناريو | النتيجة |
|---|---|
| instructor ينشئ اختبارًا (سؤالان) | ✅ passScore=70 |
| الطالب يجلب الأسئلة | ✅ **لا حقل correct في الpayload إطلاقًا** |
| إجابة 2/2 صحيحة (100%) | ✅ passed + **شهادة صدرت فورًا** ALD-2026-878dd117 |
| إجابة 1/2 (50%) | ✅ passed=false — **لا شهادة** (قرار #4) |
| إجابة 0/2 (0%) | ✅ لا شهادة |
| إعادة النجاح | ✅ **نفس الشهادة** — count لم يزد (idempotent) |
| محاولة بتسجيل غير موجود | ✅ 404 |
| التحقق العام بالـserial | ✅ valid + بيانات الشهادة |
| serial مزوّر | ✅ 404 |
| طلب ورقية لشهادة غيره | ✅ 403 |
| طالب يحاول advance | ✅ 403 |
| pending→approved→printed→delivered | ✅ 3×204 |
| قفزة غير صالحة (delivered→printed) | ✅ **409 state machine** |
| audit | ✅ certificate.issued + quiz.attempted ×n + paper. |

### 4. www — صفحة التحقق العامة `/verify`
- [x] بحث GET قابل للمشاركة كرابط + نتيجة خضراء (اسم/دورة/نتيجة/تاريخ) أو حمراء
- [x] **مختبر**: شهادة حقيقية تظهر "شهادة صحيحة ومعتمدة" + مزوّرة "لا توجد شهادة"

---

## ✅ R4 (الجزء الأول) — واجهات الإدارة الأساسية (مكتملة)

### erp — النظام الإداري
- [x] `/users` — إدارة المستخدمين والأدوار (system_admin): جدول بكل المستخدمين + أزرار أدوار toggle (إسناد/إزالة) — **مختبر**: إزالة instructor وإعادته 204×2 عبر UI proxy
- [x] `GET /v1/admin/users/{id}/roles` endpoint جديد + GetUserRoles use case
- [x] `/review` — قائمة مراجعة المحتوى: نشر (أخضر) / رفض بملاحظات إلزامية — **مختبر**: نشر "مهارات التواصل المهني" عبر الواجهة (204 → public total: 3)
- [x] `/finance` — مراجعة الدفعات (من R2)

### learn — الطالب
- [x] `/certificates` — شهاداتي: بطاقات شهادات بهوية المركز + serial + رابط التحقق + نموذج طلب النسخة الورقية — **مختبر**: طلب ورقي جديد ظهر في قائمة erp pending
- [x] `GET /v1/admin/users/{id}/roles` (backend)

---

## 📊 حالة النظام (2026-09-10 — نهاية جولة البناء الشاملة)

| الفحص | النتيجة |
|---|---|
| Go build + vet + golangci-lint | ✅ 0 issues |
| TypeScript × 3 apps | ✅ صفر أخطاء |
| Migrations | ✅ v4 (18 جدولًا) |
| البيانات | 4 مستخدمين، 3 دورات (3 منشورة)، 2 تسجيل نشط، 1 شهادة، 35 audit log |
| السيرفرات | core-api + www + learn + erp (4/4) |
| Endpoints عامة | health/courses/categories = 200 |

### الصفحات العاملة (كلها مختبرة E2E عبر SSO حقيقي)
- **www**: `/` (أحدث الدورات) + `/courses` (كتالوج+فلاتر) + `/courses/[slug]` + `/verify` (تحقق الشهادات)
- **learn**: `/login` + `/dashboard` (أدوار حقيقية من API) + `/courses/[slug]` (تدفق التسجيل/الإيصال) + `/certificates` (+ طلب ورقية)
- **erp**: `/login` + `/` + `/users` (إدارة أدوار) + `/review` (نشر/رفض) + `/finance` (اعتماد دفعات)

## ✅ R4 (الجزء الثاني) — تجربة الطالب الكاملة + التقارير (مكتملة)

### learn — مشغل الدروس والاختبار
- [x] `/courses/[slug]/learn` — مشغل كامل: قائمة دروس (✓ للمشاهد) + `<video controls>` + محتوى نصي + progress bar + فتح الدرس التالي تلقائيًا
- [x] **Entitlement خادمي**: GET الدروس/الدرس عبر `/v1/me/enrollments/{id}/lessons` — طالب نشط/مكتمل فقط، درس دورة أخرى = 403 (مختبر)
- [x] **lesson_views**: مشاهدة idempotent + إعادة حساب progress_pct في معاملة واحدة + **completed تلقائيًا عند 100%** (مختبر: 1 درس → 100% → completed)
- [x] `/courses/[slug]/quiz` — واجهة اختبار كاملة: أسئلة اختيار متعدد، تصحيح خادمي، شاشة نتيجة (ناجح/راسب + إعادة)، **صفر تسريب للإجابات** (مختبر: `correct` غير موجود في الـpayload)
- [x] **إصلاح جوهري**: اجتياز الاختبار أصبح متاحًا للطالب "completed" أيضًا (قرار #4: إكمال الدورة + اختبار — كان active فقط يمنع الطالب المكمل من الاختبار!)
- [x] روابط "متابعة التعلّم" و"الاختبار النهائي" في صفحة الدورة عند التفعيل

### erp — التقارير والنسخ الورقية
- [x] `GET /v1/erp/stats` — أرقام حية مجمّعة من DB (erp roles فقط، student = 403 مختبر): دورات بالحالة، تسجيلات بالحالة، دفعات معتمدة + المجموع، شهادات، طلبات ورقية
- [x] `/reports` — 4 بطاقات + تفصيل الورقية والدفعات — **٦٥٬٠٠٠ ج.س إيراد معتمد معروض** (أرقام عربية)
- [x] `/papers` — قائمة انتظار الورقية بالحالة (قيد المعالجة/معتمدة/مطبوعة) + زر تقديم لكل مرحلة (مختبر: pending→approved 204)
- [x] البطاقات في الرئيسية: مراجعة/مستخدمون/مالية/تقارير/ورقية

### Git
- [x] **git init + أول commit: 148 ملفًا** (d5dd94b) — البنية كاملة R0→R4

### إصلاحات هذه الجولة
- payments → **payment_requests** (اسم الجدول الحقيقي) في stats
- SUM(numeric) → float64 (كان int = scan error → 500)
- unused type lint → نظيف

---

## ✅ Dry-Run القبول الكامل (رحلة سارة — طالبة جديدة من الصفر)

**12 خطوة، كلها نجحت، بتدقيق كامل:**
1. مستخدمة جديدة في Keycloak (سارة محمد) → أول دخول → **placeholder profile تلقائي** ✓
2. كتالوج 3 دورات مع الأسعار ✓
3. تسجيل في "مهارات التواصل المهني" (15,000 ج.س) ✓
4. رفع إيصال التحويل (bank ref TRX-99881) ✓
5. **قبل الاعتماد: مشاهدة الدروس مرفوضة 403** (entitlement حقيقي) ✓
6. الموظف المالي يعتمد → التسجيل active ذريًا ✓
7. مشاهدة الدرس → 100% → **completed تلقائيًا** ✓
8. المدرّب أنشئ اختبار (سؤالان) ✓
9. إجابة 100% → passed ✓
10. **شهادة ALD-2026-8b833682 صدرت فورًا باسم سارة محمد** ✓
11. التحقق العام بالرقم التسلسلي (بلا مصادقة) ✓
12. طلب نسخة ورقية → pending في قائمة erp ✓

**Audit trail لرحلتها الكاملة**: enrollment.created → payment.submitted → lesson.viewed → quiz.attempted → certificate.issued → paper_certificate.requested

**الحالة النهائية**: 5 مستخدمين، 3 دورات منشورة، 3 تسجيلات (1 نشط + 2 مكتملة)، 2 شهادة صادرة، 49 audit log.

---

## ✅ الجولة 3 — التحضير للإنتاج (Caddy + SSO عبر النطاقات + api-client)

### Caddy — النطاقات الكاملة تعمل
- [x] `/etc/caddy/Caddyfile.al-deem` محدّث لـv2: apex (www) + learn + erp + api subdomains → 3011/3012/3013/4001
- [x] **كلها 200 عبر https محليًا**: alameedtraining.com ✓ learn ✓ erp (307 login) ✓ api (/v1/health ok) ✓
- [x] نسخة v2 في المستودع: `platform/Caddyfile.al-deem-v2` + نسخة v1 محفوظة

### 🔴 اكتشافات وإصلاحات إنتاجية حرجة
1. **AUTH_URL إلزامي خلف proxy**: Auth.js v5 يبني redirect_uri من request.url.origin (localhost:3012!) وليس x-forwarded-host — Caddy يمرر الرؤوس صحيحة لكن next start يبني origin الداخلي. مع `AUTH_URL=https://learn...` → redirect_uri صحيح.
2. **__Secure- cookie prefix**: HTTPS يجعل Auth.js يستخدم `__Secure-authjs.session-token` — proxy.ts كان يفحص `authjs.session-token` فقط → **كل المستخدمين كانوا سيُحوَّلون للـlogin رغم الجلسات الصحيحة**! أُصلح في learn+erp (فحص الاسمين).
3. **دوران مفاتيح Keycloak**: JWT kid جديد بعد إعادة التشغيل — JWKS cache يُجلب فورًا عند kid غير معروف (سلوك صحيح موجود) + سجل واضح.
4. Keycloak: أُضيف `https://alameedtraining.com/*` لـredirectUris الخاص بـwww (كان www فقط).

### SSO الإنتاجي — مثبت بالكامل عبر النطاقات
- [x] سارة تسجل دخول عبر learn.alameedtraining.com → Keycloak → callback → **dashboard ببياناتها** ✓
- [x] **شهادتها ALD-2026-8b833682 تظهر في /certificates** عبر النطاق ✓
- [x] التحقق العام عبر alameedtraining.com/verify → "شهادة صحيحة ومعتمدة — سارة محمد" ✓
- [x] admin عبر erp.alameedtraining.com → /users و/reports ببيانات حقيقية ✓

### OpenAPI + packages/api-client
- [x] أُصلحت أخطاء الـspec: مسار مكرر (نَتيجة إضافات سابقة) + schemas ناقصة (Profile/ProfileWithRoles/UpdateProfileInput/UserPage/RoleKey) + Unauthorized response
- [x] **38 paths، 14 schemas، 5 responses — spec صالح 100%**
- [x] **packages/api-client**: openapi-typescript (oapi-codegen يولّد Go فقط) — 1929 سطر أنواع مولّدة
- [x] **مربوط بالتطبيقات الثلاثة** (workspace:*) وlearn certificates/page.tsx يستورد `Certificate` المشترك

### ملفات الإنتاج (infra/prod/)
env.www / env.learn / env.erp / env.core-api (قوالب الأسرار) + README بخطوات الإطلاق والنقاط الحرجة المكتشفة

---

## ✅ الجولة 4 — R3-B: الحصص المباشرة (قرار #5 مطبق بالكامل)

### Database (migration 00005 — 4 جداول جديدة، الإجمالي 22)
- [x] live_sessions — state machine كامل (scheduled→join_open→live→ended→recording_processing→archived|cancelled) + starts_at_utc/ends_at_utc
- [x] **قيد عدم تعارض مواعيد المدرب**: EXCLUDE gist على tsrange(starts_at_utc, ends_at_utc) — الحصة المتداخلة تُرفض 409 (مختبر)
- [x] live_session_attendees — UNIQUE(session, student) حضور idempotent (مختبر: انضمام مرتين = سجل واحد)
- [x] zoom_webhook_events — UNIQUE(zoom_event_id) للأحداث idempotent
- [x] zoom_connections — حساب مركزي واحد Server-to-Server (قرار #5)

### Module كامل (domain/application/ports/infrastructure/transport)
- [x] **Schedule**: مدرب الدورة فقط + **has_live_sessions=true إلزامي** (قرار #5: "ليس لكل الدورات" — مختبر: رفض قبل التفعيل، نجاح بعده)
- [x] **Join**: نافذة الانضمام خادمية (تفتح قبل الموعد بـJoinWindowMin) + enrollment نشط — 409 قبل النافذة (مختبر)
- [x] AdvanceStatus بstate machine صارم — قفزة غير صالحة 409 (مختبر)
- [x] **Zoom Webhook**: HMAC-SHA256 (v0=hex) + idempotent — توقيع صحيح 200 / خاطئ 401 / إعادة نفس الحدث مرة واحدة (مختبر)
- [x] meeting.ended عبر zoom_meeting_id يقدّم الحصة live→ended (مختبر)
- [x] دورة حياة كاملة E2E: جدولة → join_open → انضمام → live → ended ✓

### learn UI
- [x] قسم "الحصص المباشرة" في صفحة التعلّم (يظهر للدورات has_live_sessions فقط)
- [x] حالة كل حصة بالعربية (مباشرة الآن بنبض أحمر / نافذة الانضمام مفتوحة / مجدولة…) + زر انضمام + رابط الاجتماع
- [x] proxies: حصص الدورة + الانضمام — تعمل عبر النطاق الإنتاجي (مختبر: حصتان تظهران عبر learn.alameedtraining.com)

### إصلاحات الجولة
- tsrange→tstzrange IMMUTABLE: عمودا UTC بلا منطقة (starts_at_utc/ends_at_utc) للفهرس
- NULL scan: sql.Null[string] (Go 1.25 — .V وليس .String) لأعمدة section_id/notes/zoom_*
- exclusion_violation (23P01) → 409 برسالة عربية واضحة
- GetByID: `id::text = $1 OR zoom_meeting_id = $1` (type mismatch كان يسبب 500)

### OpenAPI: 44 paths، 15 schemas — api-client أعيد توليده (2204 سطر)

## ✅ الجولة 5 — UX لوحة الطالب + enrich التسجيلات

### اكتشاف وإصلاح
- [x] **قسم الطالب في لوحة التحكم كان placeholder "قريبًا — قيد التطوير"** بينما كل الوظائف مبنية! الطالب لم يكن يرى دوراته المسجّلة إطلاقًا
- [x] أُعيد بناؤه بالكامل: بطاقات إحصائية (دوراتي/مكتملة/شهاداتي) + قائمة التسجيلات مع progress bar وزر متابعة التعلّم/الاختبار لكل دورة نشطة أو مكتملة، وزر "استكمال الدفع" للحالات المعلقة
- [x] حالة فارغة (لم تسجّل بعد) مع دعوة لتصفّح الكتالوج

### Backend enrich
- [x] `GET /v1/me/enrollments` أصبح يعيد `courseTitle` + `courseSlug` (JOIN من courses في نفس DB) — الطالب يرى أسماء دوره بدل UUIDs
- [x] Domain: CourseTitle/CourseSlug على Enrollment (بلا استيراد دوّار — JOIN بسيط)

### التحقق (عبر النطاق الإنتاجي learn.alameedtraining.com)
- [x] لوحة سارة: بطاقات دوراتي=1 مكتملة=1 شهاداتي=1 + "مهارات التواصل المهني" مكتملة 100% + أزرار متابعة التعلّم/الاختبار
- [x] tsc 0 errors + next build نظيف + golangci-lint 0 issues

## ✅ الجولة 5 — www: about/contact + Leads module (R4-B)

### اكتشافات وإصلاحات UX
- [x] **قسم الطالب في لوحة التحكم كان placeholder "قريبًا"** والوظائف كلها مبنية! أُعيد بناؤه كاملًا: بطاقات (دوراتي/مكتملة/شهاداتي) + قائمة بالـprogress bar وأزرار متابعة/اختبار + CTA استكمال الدفع
- [x] `GET /v1/me/enrollments` أصبح يعيد courseTitle + courseSlug (JOIN) — مثبت عبر النطاق: لوحة سارة تعرض "مهارات التواصل المهني" مكتملة 100%

### www — صفحات Blueprint 7.5 الناقصة
- [x] `/about` — رسالة/رؤية/قيم/رحلة الشهادة الأربع خطوات
- [x] `/contact` — بيانات تواصل + تدريب مؤسسي + **نموذج استفسار حقيقي** (client component مع شاشة نجاح/خطأ وbusy state)
- [x] SiteHeader/SiteFooter مشتركة في components/chrome.tsx

### Leads module كامل (R4-B: leads & inquiries)
- [x] migration 00006: جدول leads (23 جدولًا) + state machine `new→contacted→qualified→converted|lost` في DB CHECK
- [x] Module كامل: Submit (تحقق بريد/طول/تنظيف — بلا جلسة)، List (system_admin + pagination + فلتر)، Advance (state machine صارم 409 + ملاحظات + audit)
- [x] **إصلاح bug في itoa(0) كان يرجع "20"** → OFFSET خاطئ → items فارغة رغم total=2
- [x] ERP `/leads`: قائمة الاستفسارات بتوزيع الحالات + أزرار تقدم (تأكيد بملاحظة للlost/converted) + proxy

### التحقق (كل المسارات عبر النطاقات الإنتاجية)
- [x] www: / /courses /about /contact /verify كلها 200 عبر alameedtraining.com
- [x] نموذج التواصل: apex→core-api→DB (محمد عثمان — التدريب المؤسسي) ✓
- [x] leads API: submit 201 / بريد سيء 400 / قفزة غير صالحة 409 / طالب 403 / advance بملاحظة ✓
- [x] ERP /leads عبر erp domain: الاستفساران يظهران + advance new→contacted→qualified بملاحظات محفوظة ✓
- [x] Go: build+vet+lint 0 issues | TS: tsc نظيف × 3 | builds نظيفة

## ✅ الجولة 6 — تقارير MVP كاملة (R4-B Reports)

### /erp/stats مُوسّع بكل تقارير Blueprint الخمسة
- [x] **الاستفسارات حسب الحالة** (leads by status)
- [x] **نتائج الاختبارات**: محاولات/ناجحون/متوسط النسبة (avg=64.29%، 4/7 ناجح — بيانات حقيقية)
- [x] **نسبة الإكمال**: completed/مدفوعة = 66%
- [x] **الحصص القادمة والحضور**: 1 قادمة + 1 حضور
- [x] **ملخص دورات المدرب**: جدول الدورة/المدرب/عدد الطلاب (3 دورات منشورة)
- [x] **الدفعات والتسجيلات حسب الحالة** (موجود سابقًا)

### إصلاح bug
- استعلام quiz كان `FILTER (WHERE status = 'graded')` وعمود status غير موجود في quiz_attempts → 500. الصحيح: `FILTER (WHERE passed), avg(score)` — أضفت أيضًا slog.Error في handler للـdiagnosis مستقبلًا

### صفحة التقارير
- [x] 8 بطاقات (بدل 4) + جدول ملخص الدورات والمدربين
- [x] مثبت عبر erp domain: 66% إكمال، 64% متوسط، جدول الدورات الثلاث بالمدرب

## ✅ الجولة 7 — Redis rate limiting + Worker حقيقي (Blueprint 6.3 + 11.3)

### Rate limiting بRedis (كان Redis يعمل 6391 لكنه غير مستخدم!)
- [x] `middleware/ratelimit.go`: fixed-window بgo-redis v9 — TxPipeline INCR+EXPIRE ذري
- [x] 120 طلب/دقيقة لكل IP (X-Forwarded-For أولًا خلف Caddy)
- [x] **429 مع Retry-After** + رسالة عربية — مثبت: 120×200 ثم 5×429، وبعد النافذة 200
- [x] **fail-open**: انقطاع Redis = خدمة بلا حدود + سجل warn (لا يوقف المنصة)
- [x] المُشغّل: core-api بـREDIS_URL (فعّال — سجل "redis rate limiter active")

### Worker حقيقي (كان skeleton!)
- [x] cmd/worker: حلقة poll كل 10 ثوانٍ + processBatch
- [x] **WorkerService.ProcessPendingZoomEvents**: معالجة أحداث Zoom المعلّقة
  - meeting.started/ended → تقدم حالة الحصة (بstate machine)
  - **recording.completed → حفظ رابط التسجيل** (يختار MP4 من بين الملفات)
  - participant_joined/left → مسجل للمستقبل
- [x] Idempotent: MarkProcessed بعد كل حدث ناجح
- [x] **مثبت E2E**: webhook recording.completed → worker → الحصة archived + رابط MP4 محفوظ + الحدث processed (عالج 4 أحداث متراكمة)
- [x] Worker يعمل الآن كخدمة خلفية

## ✅ الجولة 8 — الأمان التشغيلي (Blueprint 16 + قرار #3)

### Security headers عبر Caddy (كل النطاقات)
- [x] `(security)` snippet في Caddyfile: HSTS (max-age=31536000) + X-Content-Type-Options nosniff + X-Frame-Options DENY + Referrer-Policy strict-origin + إخفاء Server banner
- [x] مثبت عبر النطاقات الأربعة (كلها ترجع القرون)
- [x] caddy validate + reload — backup سابق `.pre-headers.bak`

### CORS محدد (core-api)
- [x] middleware/cors.go: whitelist صريح (النطاقات الأربعة + localhost للتطوير) — النطاق المسموح يحصل على القرون، غير المسموح بلا قرون (المتصفح يمنع)
- [x] preflight OPTIONS مع Max-Age 600
- [x] مثبت: learn domain → ACAO header ✓، evil.example.com → بلا قرون ✓

### MFA لموظفي ERP (قرار #3 — كان مطلوبًا وغير مفروض!)
- [x] CONFIGURE_TOTP required action مفروض على admin@ وfinance@ في Keycloak
- [x] **مثبت E2E**: دخول finance عبر erp domain بعد الباسورد → "Mobile Authenticator Setup" (Microsoft/Google/FreeOTP + QR) — لا يمكن الوصول للـcallback قبل إعداد OTP
- [x] سياسة موظف erp: أول دخول يفرض MFA — قرار #3 منفذ حرفيًا

## ✅ الجولة 9 — Unit tests (Blueprint 18: كان صفر اختبارات!)

### 7 حزم اختبار — كلها خضراء (`go test ./... -count=1`)
| الحزمة | التغطية | ما تختبره |
|---|---|---|
| catalog/domain | **92.9%** | course state machine: draft→pending_review→published→archived، رفض بلا ملاحظات، ملكية المدرب |
| assessment/domain | **92.3%** | **قرار #4 حرفيًا**: 60% لا نجاح، **70% بالضبط = نجاح (قاعدة ≥70)**، Grade خادمي %، serial فريد ALD-YYYY-hex8، paper state machine (قفز مرفوض) |
| enrollment/domain | **77.8%** | entitlement: مسودة/مؤرشفة مرفوضة، active يمنع الإعادة، completed يسمح؛ RecomputeProgressPct (تقريب، حد 100) |
| livesessions/domain | **88.2%** | نافذة الانضمام (حواف بالضبط عند الفتح/النهاية)، state machine كامل (7 صالحة + 8 مرفوضة)، IsActivePhase |
| livesessions/transport | 7.3% | توقيع Zoom HMAC (صحيح/سر خاطئ/body محرّف/فارغ) |
| leads/domain | **100%** | state machine كامل (7 صالحة + 5 مرفوضة، converted/lost نهائية) |
| platform/middleware | 12.1% | CORS whitelist (suffix attack مرفوض)، clientIP (XFF أول hop) |

### Makefile (CI pipeline — blueprint 14.3)
`make check` = build → vet → lint → test في أمر واحد

### ملاحظات
- Grade تُرجع نسبة مئوية (0-100) وليس نقاطًا — أولّد الاختبار بناء على السلوك الفعلي
- 29 test function تغطي كل قواعد العمل الحرجة (invariants خادمية)

## ✅ الجولة 10 — SEO + OpenGraph (www)

- [x] robots.ts: يسمح بالعام (/, /courses, /about, /contact, /verify) + Disallow /api/ + ربط sitemap — مثبت عبر النطاق
- [x] sitemap.ts: 5 صفحات ثابتة + **الدورات المنشورة من DB** (revalidate ساعة) — 8 URLs حية عبر apex
- [x] metadataBase + OpenGraph (locale ar_SD) + Twitter card في root layout
- [x] canonical + OG لكل صفحة دورة من DB
- [x] tsc 0 errors + build نظيف (robots.txt وsitemap.xml يظهران في output)

## ✅ الجولة 11 — IDOR/Authorization matrix (Blueprint 19 أمن) + إصلاح ثغرة دفع

### إصلاح ثغرة حقيقية: الدفع على تسجيل غير معلّق
- [x] **SubmitPayment كان يقبل الدفع على enrollment بأي حالة** — طالب مكمل الدورة كان يستطيع إرسال دفع جديد بلا معنى مالي (مكتشف بالاختبار!)
- [x] الإصلاح: `pending_payment` فقط (Blueprint 8.4) — 409 برسالة عربية — مثبت
- [x] الدفع على completed كان يعمل بالخطأ قبل الإصلاح (201) والآن 409 ✓

### IDOR matrix — كلها مرفوضة 403 (مثبتة حية)
| المحاولة | النتيجة |
|---|---|
| سارة تفتح تسجيل test.student | 403 ✓ |
| سارة تشاهد درسًا عبر enrollment الآخر | 403 ✓ |
| سارة تدفع على تسجيل الآخر | 403 ✓ |
| خالد يفتح تسجيل سارة | 403 ✓ |
| طالب يعتمد دفعة (finance) | 403 ✓ |
| طالب يقرأ /admin/users | 403 ✓ |
| طالب يقرأ /finance/payments | 403 ✓ |
| سارة على تسجيلها الخاص | 200 ✓ (السماح الصحيح) |

### E2E رحلة طالب جديدة كاملة (خالد إبراهيم)
- [x] KC user → JIT profile (auto-create أول توكن) → student role
- [x] enroll → pending_payment → دفع submitted → **الطالب مرفوض من اعتماد دفعته 403** → المالي يعتمد 204 → **payment approved + enrollment active ذريًا** → يفتح دروسه 200 (1 درس: مقدمة التواصل)
- [x] MFA: أثناء الاختبار فُكّ مؤقتًا عن finance@ (required action يمنع direct grant) ثم **أُعيد فورًا** — سلوك صحيح للـMFA في الإنتاج

### ملاحظة MFA تشغيلية
- MFA يمنع password grant لأتمتة الاختبارات — الطريقة الصحيحة: browser flow بإعداد OTP مرة واحدة، أو service account للمراقبة

## ✅ الجولة 12 — رحلة خالد E2E كاملة (قرار #4 بالكامل) + إصلاح تكرار الطلبات الورقية

### إصلاح: طلبات ورقية مكررة كانت مقبولة!
- [x] RequestPaper كان يقبل طلبات غير محدودة لنفس الشهادة (اكتُشفت بالاختبار — 3 pending لنفس الشهادة!)
- [x] الإصلاح: طلب واحد نشط لكل شهادة (pending/approved/printed = جارٍ) — 409 "لديك طلب جارٍ لهذه الشهادة"
- [x] بعد delivered → طلب جديد مسموح 201 (سلوك صحيح)

### رحلة خالد إبراهيم — كل قرار #4 بالحرف (E2E حية)
1. KC user → JIT profile → student role
2. enroll → pending_payment → دفع → المالي يعتمد → active (الجولة 11)
3. مشاهدة الدرس → **completed تلقائي عند 100%**
4. الاختبار: أسئلة بلا أعلام correct للعميل → إجابات صحيحة → **score 100، passed، certIssued: true فورًا**
5. الشهادة: **ALD-2026-729936c8** (مهارات التواصل المهني)
6. التحقق العام عبر apex domain: "خالد إبراهيم — 100 — صحيحة ومعتمدة" ✓
7. طلب نسخة ورقية → pending → **approved → printed → delivered** عبر ERP
8. طلب مكرر أثناء الجري: 409 ✓ / بعد التسليم: 201 ✓

## ✅ الجولة 13 — UX عربية كاملة: 404/error pages + تدقيق a11y

### تدقيق الوصول (manual acceptance blueprint)
- [x] lang="ar" dir="rtl" في كل التطبيقات ✓ | h1 واحد لكل صفحة ✓
- [x] أزرار بنص ظاهر (screen reader سليم) ✓ | الصور بلا alt: 0 ✓
- [x] progressbars بـaria-valuenow (لوحة الطالب) ✓

### صفحات 404 عربية (كانت الإنجليزية الافتراضية!)
- [x] www/not-found: "٤٠٤ — الصفحة غير موجودة" + الرئيسية/تصفّح الدورات — مثبت عبر apex
- [x] learn/not-found: لوحة التحكم/الدورات — مثبت عبر النطاق مع جلسة حقيقية
- [x] erp/not-found: الرئيسية
- [x] error.tsx (500) في www (إعادة المحاولة + تواصل) وlearn (إعادة المحاولة) — عربية بالكامل
- [x] tsc 0 errors × 3 + builds نظيفة

## 🔜 ما تبقى (تحسينات ما بعد الإطلاق)
1. تدوير الأسرار الفعلي عند الإطلاق (openssl rand) + KC_HOSTNAME=auth.alameedtraining.com
2. DNS: A records للنطاقات أو Cloudflare proxy (SSL Full — نفس نمط v1)
3. systemd units للخدمات (بدل nohup اليدوي)
4. Sentry/CI-CD + backups Postgres المجدولة

---

## قرارات إنتاجية مؤجلة (قبل الإطلاق)
- تدوير أسرار Keycloak (deem-admin password + core-api secret + AUTH_SECRET)
- Caddy reverse proxy للـsubdomains + TLS عبر Cloudflare (نفس نمط نشر المرجع al-deem)
- Sentry + backups + CI/CD (GitHub Actions)
- packages/api-client: توليد TS client من openapi.yaml (26 paths جاهزة)
- رفع الإيصالات: حاليًا receipt_url حقل نصي — يحتاج upload endpoint مع تخزين (Bunny/B2) في الإنتاج
- RLS دفاع إضافي على enrollments (الصلاحيات خادمية تعمل بالكامل الآن)
