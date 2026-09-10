import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse, getCourseOutline, RequestError } from "@/lib/api";
import { EmptyState, ErrorState, formatPrice, LevelBadge } from "@/components/catalog";

type Params = Promise<{ slug: string }>;

// ===== generateMetadata (SEO لكل دورة) =====
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await getCourse(slug);
    return {
      title: course.title,
      description: course.summary,
    };
  } catch {
    return { title: "تعذر تحميل الدورة" };
  }
}

export default async function CourseDetailPage({ params }: { params: Params }) {
  const { slug } = await params;

  let course: Awaited<ReturnType<typeof getCourse>> | null = null;
  let outline: Awaited<ReturnType<typeof getCourseOutline>> | null = null;
  let error: string | null = null;

  try {
    [course, outline] = await Promise.all([
      getCourse(slug),
      getCourseOutline(slug),
    ]);
  } catch (e) {
    if (e instanceof RequestError && e.status === 404) notFound();
    error = e instanceof RequestError ? e.message : "تعذر تحميل الدورة";
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ErrorState message={error} />
      </div>
    );
  }
  if (!course) return null;

  const lessonCount = (outline?.sections ?? []).reduce(
    (acc, s) => acc + s.lessons.length,
    0,
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* ترويسة الدورة */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل">
            <Link href="/" className="hover:text-primary">
              الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <Link href="/courses" className="hover:text-primary">
              الدورات
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">{course.title}</span>
          </nav>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <LevelBadge level={course.level} />
                {course.hasLiveSessions && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-dark">
                    يتضمن بثًا مباشرًا
                  </span>
                )}
              </div>
              <h1 className="max-w-3xl text-3xl font-black leading-relaxed text-secondary md:text-4xl">
                {course.title}
              </h1>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">
                {course.summary}
              </p>
            </div>
            {/* بطاقة السعر والتسجيل */}
            <div className="shrink-0 rounded-xl border border-border bg-background p-6 md:w-72">
              <p className="text-2xl font-black text-secondary">
                {formatPrice(course.priceAmount, course.currency)}
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">المدة</dt>
                  <dd className="font-medium">{course.durationHours} ساعة</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">عدد الدروس</dt>
                  <dd className="font-medium">{lessonCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">الشهادة</dt>
                  <dd className="font-medium">إلكترونية معتمدة</dd>
                </div>
              </dl>
              <a
                href={`https://learn.alameedtraining.com/courses/${course.slug}`}
                className="mt-6 flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground transition-transform hover:scale-105"
              >
                التسجيل في الدورة
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          {/* الوصف */}
          <section aria-labelledby="about">
            <h2 id="about" className="mb-4 text-xl font-bold text-secondary">
              عن الدورة
            </h2>
            <p className="whitespace-pre-line leading-8 text-foreground">
              {course.description || course.summary}
            </p>
          </section>

          {/* مسار الدورة */}
          <section aria-labelledby="outline">
            <h2 id="outline" className="mb-4 text-xl font-bold text-secondary">
              مسار الدورة
            </h2>
            {outline && outline.sections.length > 0 ? (
              <ol className="space-y-4">
                {outline.sections.map((sec, i) => (
                  <li
                    key={sec.id}
                    className="rounded-xl border border-border bg-surface"
                  >
                    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                        {i + 1}
                      </span>
                      <h3 className="font-semibold text-secondary">
                        {sec.title}
                      </h3>
                    </div>
                    <ul className="divide-y divide-border">
                      {sec.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {lesson.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {lesson.isFreePreview && (
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary-dark">
                                معاينة مجانية
                              </span>
                            )}
                            <span className="text-muted">
                              {lesson.type === "video"
                                ? "فيديو"
                                : lesson.type === "text"
                                  ? "قراءة"
                                  : lesson.type === "quiz"
                                    ? "اختبار"
                                    : "واجب"}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="لم يُضف مسار الدورة بعد" />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
