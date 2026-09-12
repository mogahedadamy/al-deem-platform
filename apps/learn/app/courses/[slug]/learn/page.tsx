// صفحة الدورة للطالب المسجّل — دروس مع مشغل فيديو وتتبع مشاهدة.
// Server: يجلب دروس الدورة عبر entitlement API (نشط فقط) — client للتشغيل.
import { auth } from "@/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, type MyEnrollment, type PublicCourse } from "@/lib/api";
import { LessonPlayer } from "./player-client";
import { LiveSessionsList } from "./live-sessions";

type Params = Promise<{ slug: string }>;

const API_PUB = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

async function fetchCourse(slug: string): Promise<PublicCourse | null> {
  const res = await fetch(`${API_PUB}/public/courses/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<PublicCourse>;
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const course = await fetchCourse(slug);
  return { title: course ? `${course.title} — التعلّم` : "دورة" };
}

type LessonItem = {
  lessonId: string;
  title: string;
  type: string;
  viewed: boolean;
};

export default async function LearnCoursePage({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await auth();
  const course = await fetchCourse(slug);
  if (!course) notFound();

  // تسجيل الطالب في هذه الدورة
  const enrollments = session
    ? await apiGet<{ items: MyEnrollment[] }>(session, "/me/enrollments")
    : null;
  const myEnrollment = (enrollments?.items ?? []).find(
    (e) => e.courseId === course.id,
  );

  const entitled =
    myEnrollment?.status === "active" || myEnrollment?.status === "completed";

  if (!entitled) {
    // غير مسجّل — صفحة الدورة العامة مع تدفق التسجيل (صفحة [slug] القائمة)
    return (
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-4xl px-6 py-10">
            <nav className="mb-3 text-sm text-muted">
              <Link href="/dashboard" className="hover:text-primary">
                لوحة التحكم
              </Link>
              <span className="mx-2">/</span>
              <span className="font-medium text-secondary">{course.title}</span>
            </nav>
            <h1 className="text-2xl font-black text-secondary">{course.title}</h1>
          </div>
        </header>
        <div className="mx-auto max-w-4xl flex-1 px-6 py-16 text-center">
          {myEnrollment ? (
            <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 px-6 py-8">
              <p className="font-bold text-amber-900">
                {myEnrollment.status === "pending_payment"
                  ? "تسجيلك بانتظار اعتماد الدفع"
                  : "تسجيلك غير نشط"}
              </p>
              <p className="mt-2 text-sm text-amber-800">
                صفحة الدورة الرئيسية تعرض حالة الدفع ورفع الإيصال.
              </p>
              <Link
                href={`/courses/${slug}`}
                className="mt-4 inline-block rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-secondary-foreground"
              >
                الذهاب لصفحة الدورة
              </Link>
            </div>
          ) : (
            <div className="mx-auto max-w-md rounded-xl border border-border bg-surface px-6 py-8">
              <p className="font-bold text-secondary">لست مسجلًا في هذه الدورة</p>
              <Link
                href={`/courses/${slug}`}
                className="mt-4 inline-block rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-secondary-foreground"
              >
                سجّل الآن
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // مسجّل ونشط — اجلب الدروس مع حالة المشاهدة (entitlement خادمي)
  const lessonsRes = await fetch(
    `${API_PUB}/me/enrollments/${myEnrollment!.id}/lessons?courseId=${course.id}`,
    {
      headers: {
        Authorization: `Bearer ${
          (session as { accessToken?: string } | null)?.accessToken
        }`,
      },
      cache: "no-store",
    },
  );
  const lessonsData = lessonsRes.ok
    ? ((await lessonsRes.json()) as { lessons: LessonItem[] })
    : { lessons: [] };
  const lessons = lessonsData.lessons;
  const viewedCount = lessons.filter((l) => l.viewed).length;
  const pct = lessons.length
    ? Math.round((viewedCount / lessons.length) * 100)
    : 0;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="app-container max-w-5xl py-8">
          <nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل">
            <Link href="/dashboard" className="hover:text-primary">لوحة التحكم</Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">{course.title}</span>
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-black text-secondary md:text-3xl">
              {course.title}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-secondary">
                {pct}%
              </span>
              <div
                className="h-2 w-32 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted">
            {viewedCount} من {lessons.length} درسًا
            {myEnrollment!.status === "completed" && " — مكتملة ✓"}
          </p>
        </div>
      </header>

      <div className="app-page max-w-5xl flex-1">
        {lessons.length === 0 ? (
          <p className="py-12 text-center text-muted">
            لم تُضف دروس الدورة بعد.
          </p>
        ) : (
          <LessonPlayer
            enrollmentId={myEnrollment!.id}
            lessons={lessons}
          />
        )}

        {/* الحصص المباشرة (قرار #5 — دورات has_live_sessions فقط) */}
        {course.hasLiveSessions && (
          <section className="mt-12" aria-labelledby="live-sessions">
            <h2 id="live-sessions" className="mb-4 text-xl font-bold text-secondary">
              الحصص المباشرة
            </h2>
            <LiveSessionsList courseId={course.id} />
          </section>
        )}
      </div>
    </div>
  );
}
