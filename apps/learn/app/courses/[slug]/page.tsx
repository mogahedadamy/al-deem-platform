// صفحة الدورة في learn — تفاصيل + outline + تدفق التسجيل والدفع.
// Server component: يجلب البيانات، وEnrollButton client للتفاعل.
import { auth } from "@/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  apiGet,
  type MyEnrollment,
  type MyPayment,
  type PublicCourse,
  type PublicOutline,
} from "@/lib/api";
import { EnrollButton, SubmitPaymentForm } from "./client";
import { paymentDetails } from "@/lib/payment-details";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const course = await fetchCourse(slug);
  return { title: course?.title ?? "دورة" };
}

const API_PUB = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

async function fetchCourse(slug: string): Promise<PublicCourse | null> {
  const res = await fetch(`${API_PUB}/public/courses/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<PublicCourse>;
}

async function fetchOutline(slug: string): Promise<PublicOutline | null> {
  const res = await fetch(
    `${API_PUB}/public/courses/${encodeURIComponent(slug)}/outline`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) return null;
  return res.json() as Promise<PublicOutline>;
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  active: "نشطة — تابع التعلم",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

export default async function CoursePage({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await auth();

  const [course, outline] = await Promise.all([fetchCourse(slug), fetchOutline(slug)]);
  if (!course) notFound();

  // حالة التسجيل الحالية (إن كان مسجلًا دخولًا)
  const enrollments = await apiGet<{ items: MyEnrollment[] }>(session, "/me/enrollments");
  const myEnrollment = (enrollments?.items ?? []).find(
    (e) => e.courseId === course.id,
  );
  const payments = await apiGet<{ items: MyPayment[] }>(session, "/me/payments");
  const latestPayment = (payments?.items ?? []).find(
    (p) => p.enrollmentId === myEnrollment?.id,
  );

  const lessonCount =
    outline?.sections.reduce((a, s) => a + s.lessons.length, 0) ?? 0;
  const details = paymentDetails();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="app-container py-8 sm:py-10">
          <nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل">
            <Link href="/" className="hover:text-primary">الرئيسية</Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">{course.title}</span>
          </nav>
          <p className="app-kicker">تفاصيل البرنامج</p>
          <h1 className="app-title max-w-3xl">{course.title}</h1>
          <p className="app-description text-base sm:text-lg">{course.summary}</p>
        </div>
      </header>

      <div className="app-page flex-1">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:gap-10">
          {/* مسار الدورة */}
          <section aria-labelledby="outline">
            <h2 id="outline" className="mb-4 text-xl font-black text-secondary">
              مسار الدورة ({lessonCount} درسًا)
            </h2>
            {outline && outline.sections.length > 0 ? (
              <ol className="space-y-4">
                {outline.sections.map((sec, i) => (
                  <li key={sec.id} className="app-card overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                        {i + 1}
                      </span>
                      <h3 className="font-semibold text-secondary">{sec.title}</h3>
                    </div>
                    <ul className="divide-y divide-border">
                      {sec.lessons.map((lesson) => {
                        const unlocked =
                          lesson.isFreePreview ||
                          myEnrollment?.status === "active" ||
                          myEnrollment?.status === "completed";
                        return (
                          <li key={lesson.id} className="flex items-center justify-between px-4 py-3 text-sm">
                            <span className={unlocked ? "font-medium text-foreground" : "text-muted"}>
                              {unlocked ? "" : "🔒 "}{lesson.title}
                            </span>
                            {lesson.isFreePreview && (
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary-dark">
                                معاينة مجانية
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted">لم يُضف مسار الدورة بعد.</p>
            )}
          </section>

          {/* بطاقة التسجيل/الحالة */}
          <aside>
            <div className="app-card p-5 sm:p-6">
              <p className="text-2xl font-black text-secondary">
                {course.priceAmount > 0
                  ? `${course.priceAmount} ${course.currency === "SDG" ? "ج.س" : course.currency}`
                  : "مجانًا"}
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">المدة</dt>
                  <dd className="font-medium">{course.durationHours} ساعة</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">الدروس</dt>
                  <dd className="font-medium">{lessonCount}</dd>
                </div>
                {course.hasLiveSessions && (
                  <div className="flex justify-between">
                    <dt className="text-muted">الحصص</dt>
                    <dd className="font-medium text-primary-dark">بث مباشر + مسجل</dd>
                  </div>
                )}
              </dl>

              {/* حالة التسجيل والتدفق */}
              <div className="mt-6">
                {!session ? (
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(`/courses/${slug}`)}`}
                    className="flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground transition-transform hover:scale-105"
                  >
                    سجّل الدخول للتسجيل
                  </Link>
                ) : !myEnrollment ? (
                  lessonCount > 0 ? (
                    <EnrollButton courseId={course.id} />
                  ) : (
                    <p className="rounded-lg bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900">
                      يفتح التسجيل بعد اكتمال مراجعة المنهج.
                    </p>
                  )
                ) : myEnrollment.status === "pending_payment" ? (
                  <div className="space-y-3">
                    <p className="rounded-lg bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800">
                      {STATUS_LABEL[myEnrollment.status]} — {myEnrollment.priceAmount}{" "}
                      {myEnrollment.currency === "SDG" ? "ج.س" : myEnrollment.currency}
                    </p>
                    {latestPayment?.status === "rejected" ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        <p className="font-semibold">رُفض الدفع:</p>
                        <p className="mt-1">{latestPayment.rejectionReason || "يرجى مراجعة بيانات التحويل ثم رفع إيصال جديد."}</p>
                      </div>
                    ) : latestPayment ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                        <p className="font-black">استلمنا إيصال التحويل</p>
                        <p className="mt-1 leading-6">الإيصال قيد المراجعة من الموظف المالي. سنرسل لك إشعاراً فور اتخاذ القرار.</p>
                      </div>
                    ) : null}
                    {(!latestPayment || latestPayment.status === "rejected") && (details ? <SubmitPaymentForm enrollmentId={myEnrollment.id} details={details} /> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">التسجيل متوقف مؤقتاً لهذه الدورة</p><p className="mt-1 leading-6">لم يكتمل إعداد بيانات الدفع الرسمية بعد. لن نطلب منك رفع إيصال قبل ظهور بيانات التحويل المعتمدة.</p><a href="https://alameedtraining.com/contact" className="mt-3 inline-block font-black underline underline-offset-4">تواصل مع فريق التسجيل</a></div>)}
                  </div>
                ) : myEnrollment.status === "active" || myEnrollment.status === "completed" ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
                      ✓ أنت مسجل — الدروس مفتوحة
                      {myEnrollment.status === "completed" && " (مكتملة)"}
                    </div>
                    <Link
                      href={`/courses/${slug}/learn`}
                      className="flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground transition-transform hover:scale-105"
                    >
                      متابعة التعلّم ←
                    </Link>
                    {myEnrollment.status === "completed" && (
                      <Link
                        href={`/courses/${slug}/quiz`}
                        className="flex h-12 items-center justify-center rounded-full border-2 border-secondary px-8 font-semibold text-secondary hover:bg-secondary hover:text-secondary-foreground"
                      >
                        الاختبار النهائي
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted">
                    {STATUS_LABEL[myEnrollment.status]}
                  </p>
                )}
              </div>

              <p className="mt-4 text-center text-xs leading-5 text-muted">
                الدفع عبر التحويل البنكي — ارفع إيصال التحويل ويعتمده الموظف
                المالي (24/7).
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
