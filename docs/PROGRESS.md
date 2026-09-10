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

## 🔜 ما تبقى للإطلاق (Beta/Production)
1. Caddy reverse proxy للـsubdomains (www/learn/erp.alameedtraining.com) + HTTPS
2. تدوير الأسرار (AUTH_SECRET، DB، Keycloak) من .env.example
3. packages/api-client من openapi.yaml (35 paths)
4. Sentry/CI-CD + backups Postgres المجدولة

---

## قرارات إنتاجية مؤجلة (قبل الإطلاق)
- تدوير أسرار Keycloak (deem-admin password + core-api secret + AUTH_SECRET)
- Caddy reverse proxy للـsubdomains + TLS عبر Cloudflare (نفس نمط نشر المرجع al-deem)
- Sentry + backups + CI/CD (GitHub Actions)
- packages/api-client: توليد TS client من openapi.yaml (26 paths جاهزة)
- رفع الإيصالات: حاليًا receipt_url حقل نصي — يحتاج upload endpoint مع تخزين (Bunny/B2) في الإنتاج
- RLS دفاع إضافي على enrollments (الصلاحيات خادمية تعمل بالكامل الآن)
