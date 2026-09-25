// لوحة الطالب/المدرب — صفحة محمية تعرض دوراتي وتقدمي.
// البيانات من core-api عبر session token (ID Token / access token).
import { auth } from "@/auth";
import Link from "next/link";

export const metadata = { title: "لوحة التحكم" };

type MyEnrollment = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  status: string;
  progressPct: number;
  priceAmount: number;
  currency: string;
};

type ApiCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  level: string;
  priceAmount: number;
  currency: string;
  reviewNotes?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  pending_review: "بانتظار المراجعة",
  published: "منشورة",
  archived: "مؤرشفة",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    // proxy يحمي عادة — هذا صمام أمان إضافي
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">الجلسة غير نشطة</p>
        <Link href="/login" className="mt-4 inline-block text-primary-dark hover:text-primary">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const user = session.user as { name?: string | null; email?: string | null };
  const accessToken = (session as { accessToken?: string }).accessToken;

  // جلب /v1/me من core-api — الأدوار الحقيقية من DB (مصدر الحقيقة)
  let roles: string[] = [];
  let myCourses: ApiCourse[] = [];
  let myEnrollments: MyEnrollment[] = [];
  let myCertificateCount = 0;
  let apiError: string | null = null;

  if (accessToken) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";
    try {
      const meRes = await fetch(`${apiBase}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (meRes.ok) {
        const me = (await meRes.json()) as { roles?: string[] };
        roles = me.roles ?? [];
      } else {
        apiError = "تعذر التحقق من صلاحيات حسابك. أعد تسجيل الدخول أو حاول لاحقاً.";
      }
      const isInstructor = roles.some((r) =>
        ["instructor", "system_admin", "content_reviewer"].includes(r),
      );
      if (isInstructor) {
        const res = await fetch(`${apiBase}/me/courses`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { items: ApiCourse[] };
          myCourses = data.items;
        }
      }
      // دورات الطالب المسجّل فيها + شهاداته
      const enRes = await fetch(`${apiBase}/me/enrollments`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (enRes.ok) {
        const data = (await enRes.json()) as { items: MyEnrollment[] };
        myEnrollments = data.items;
      } else {
        apiError ??= "تعذر تحميل دوراتك حالياً. لم يتأثر حسابك أو تسجيلاتك.";
      }
      const certRes = await fetch(`${apiBase}/me/certificates`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (certRes.ok) {
        const data = (await certRes.json()) as { items: unknown[] };
        myCertificateCount = data.items.length;
      } else {
        apiError ??= "تعذر تحميل الشهادات حالياً. حاول التحديث بعد قليل.";
      }
    } catch {
      apiError = "تعذر تحميل بياناتك — حاول لاحقًا";
    }
  } else {
    apiError = "تعذر الحصول على رمز الوصول";
  }
  const isInstructor = roles.some((r) =>
    ["instructor", "system_admin", "content_reviewer"].includes(r),
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="app-container py-8 sm:py-10">
          <p className="app-kicker">لوحة التحكم</p>
          <h1 className="app-title">مرحبًا، {user.name ?? user.email}</h1>
          <p className="app-description">
            {isInstructor
              ? "مساحة المدرب: دوراتك، دروسك، وحالة المراجعة."
              : "مساحة الطالب: دوراتي، تقدمي، وشهاداتي."}
          </p>
        </div>
      </header>

      <div className="app-page flex-1">
        {apiError && (
          <p className="app-alert mb-6 border-amber-200 bg-amber-50 text-amber-800" role="alert">
            {apiError}
          </p>
        )}

        {isInstructor ? (
          <section aria-labelledby="my-courses">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="my-courses" className="text-xl font-black text-secondary">
                دوراتي ({myCourses.length})
              </h2>
              <div className="flex flex-wrap gap-2"><Link href="/instructor/sessions" className="app-button app-button-outline min-h-11 self-start text-sm">الحصص المباشرة</Link><Link href="/instructor/courses/new" className="app-button app-button-primary min-h-11 self-start sm:self-auto">
                + دورة جديدة
              </Link></div>
            </div>
            {myCourses.length === 0 ? (
              <div className="app-empty">
                <p className="font-semibold text-secondary">لم تنشئ دورات بعد</p>
                <p className="mt-1 text-sm text-muted">
                  ابدأ بإنشاء مسودتك الأولى وستظهر هنا.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {myCourses.map((c) => (
                  <li
                    key={c.id}
                    className="app-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-secondary">{c.title}</h3>
                      <p className="mt-1 line-clamp-1 text-sm text-muted">{c.summary}</p>
                      {c.reviewNotes && (
                        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          ملاحظات المراجعة: {c.reviewNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          c.status === "published"
                            ? "bg-emerald-50 text-emerald-700"
                            : c.status === "pending_review"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-secondary/5 text-secondary"
                        }`}
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                      <span className="text-sm font-bold text-secondary">
                        {c.priceAmount > 0 ? `${c.priceAmount} ${c.currency === "SDG" ? "ج.س" : c.currency}` : "مجانًا"}
                      </span>
                      {c.status === "draft" && (
                        <Link href={`/instructor/courses/${c.id}/edit`} className="app-button app-button-outline min-h-11 px-4 text-xs">
                          تحرير
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section aria-labelledby="student-courses" className="space-y-8">
            {/* بطاقات سريعة */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="app-card p-5 sm:p-6">
                <p className="text-sm font-bold text-muted">دوراتي</p>
                <p className="mt-2 text-3xl font-black text-secondary">{myEnrollments.length}</p>
              </div>
              <div className="app-card p-5 sm:p-6">
                <p className="text-sm font-bold text-muted">مكتملة</p>
                <p className="mt-2 text-3xl font-black text-secondary">{myEnrollments.filter((e) => e.status === "completed").length}</p>
              </div>
              <Link href="/certificates" className="app-card app-card-interactive border-primary/40 bg-primary-light/45 p-5 sm:p-6">
                <p className="text-sm font-bold text-muted">شهاداتي</p>
                <p className="mt-2 text-3xl font-black text-primary-dark">{myCertificateCount}</p>
              </Link>
            </div>

            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 id="student-courses" className="text-xl font-black text-secondary">دوراتي ({myEnrollments.length})</h2>
                <Link href="https://alameedtraining.com/courses" className="app-button app-button-outline min-h-11 self-start text-sm sm:self-auto">تصفّح الكتالوج ←</Link>
              </div>
              {myEnrollments.length === 0 ? (
                <div className="app-empty">
                  <p className="font-semibold text-secondary">لم تسجّل في دورات بعد</p>
                  <p className="mt-1 text-sm text-muted">
                    تصفّح الكتالوج واختر دورتك الأولى.
                  </p>
                  <Link
                    href="https://alameedtraining.com/courses"
                    className="app-button app-button-primary mt-4 min-h-11"
                  >
                    تصفّح الدورات
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {myEnrollments.map((e) => {
                    const active = e.status === "active" || e.status === "completed";
                    return (
                      <li
                        key={e.id}
                        className="app-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-secondary">{e.courseTitle}</h3>
                          <div className="mt-2 flex items-center gap-3">
                            <div
                              className="h-2 w-28 overflow-hidden rounded-full bg-border"
                              role="progressbar"
                              aria-valuenow={e.progressPct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${e.progressPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-muted">
                              {e.progressPct}%
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                e.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : e.status === "active"
                                    ? "bg-primary/10 text-primary-dark"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {e.status === "completed"
                                ? "مكتملة"
                                : e.status === "active"
                                  ? "نشطة"
                                  : "بانتظار اعتماد الدفع"}
                            </span>
                          </div>
                        </div>
                        {active ? (
                          <div className="flex shrink-0 gap-2">
                            <Link
                              href={`/courses/${e.courseSlug}/learn`}
                              className="app-button app-button-primary min-h-11 text-sm"
                            >
                              متابعة التعلّم ←
                            </Link>
                            {e.status === "completed" && (
                              <Link
                                href={`/courses/${e.courseSlug}/quiz`}
                                className="app-button app-button-outline min-h-11 text-sm hover:bg-secondary hover:text-secondary-foreground"
                              >
                                الاختبار
                              </Link>
                            )}
                          </div>
                        ) : (
                          <Link
                            href={`/courses/${e.courseSlug}`}
                            className="app-button min-h-11 shrink-0 bg-amber-600 text-sm text-white hover:bg-amber-700"
                          >
                            استكمال الدفع
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
