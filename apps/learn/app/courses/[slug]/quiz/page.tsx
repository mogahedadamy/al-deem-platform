// صفحة الاختبار — الطالب يجيب والتصحيح خادمي، النتيجة والشهادة فورًا.
import { auth } from "@/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, type MyEnrollment, type PublicCourse } from "@/lib/api";
import { QuizRunner } from "./quiz-client";

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
  return { title: course ? `اختبار ${course.title}` : "اختبار الدورة" };
}

export default async function QuizPage({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await auth();
  const course = await fetchCourse(slug);
  if (!course) notFound();

  const enrollments = session
    ? await apiGet<{ items: MyEnrollment[] }>(session, "/me/enrollments")
    : null;
  const myEnrollment = (enrollments?.items ?? []).find(
    (e) => e.courseId === course.id,
  );
  const entitled = myEnrollment?.status === "completed";

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="app-container max-w-3xl py-8">
          <nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل">
            <Link href={`/courses/${slug}/learn`} className="hover:text-primary">{course.title}</Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">الاختبار النهائي</span>
          </nav>
          <p className="app-kicker">تقييم نهائي</p>
          <h1 className="app-title">اختبار: {course.title}</h1>
          <p className="app-description">اجتياز الاختبار بنسبة 70% فأكثر يصدر شهادتك الرقمية تلقائيًا.</p>
        </div>
      </header>

      <div className="app-page max-w-3xl flex-1">
        {!session ? (
          <p className="py-12 text-center text-muted">
            <Link href="/login" className="font-semibold text-primary-dark underline">
              سجّل الدخول
            </Link>{" "}
            لأداء الاختبار.
          </p>
        ) : !entitled ? (
          <div className="app-alert border-amber-200 bg-amber-50 text-amber-900">
            <p className="font-bold text-amber-900">
              الاختبار متاح بعد إكمال جميع دروس الدورة
            </p>
            <Link
              href={`/courses/${slug}`}
              className="mt-4 inline-block rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-secondary-foreground"
            >
              صفحة الدورة والتسجيل
            </Link>
          </div>
        ) : (
          <QuizRunner enrollmentId={myEnrollment!.id} courseSlug={slug} />
        )}
      </div>
    </div>
  );
}
