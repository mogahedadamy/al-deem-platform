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
  return { title: "اختبار الدورة" };
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
  const entitled =
    myEnrollment?.status === "active" || myEnrollment?.status === "completed";

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <nav className="mb-2 text-sm text-muted">
            <Link href={`/courses/${slug}/learn`} className="hover:text-primary">
              {course.title}
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">الاختبار النهائي</span>
          </nav>
          <h1 className="text-2xl font-black text-secondary">
            اختبار: {course.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            اجتياز الاختبار بنسبة 70% فأكثر يصدر شهادتك الرقمية تلقائيًا.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {!session ? (
          <p className="py-12 text-center text-muted">
            <Link href="/login" className="font-semibold text-primary-dark underline">
              سجّل الدخول
            </Link>{" "}
            لأداء الاختبار.
          </p>
        ) : !entitled ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <p className="font-bold text-amber-900">
              الاختبار متاح للطلاب المسجّلين في الدورة فقط
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
