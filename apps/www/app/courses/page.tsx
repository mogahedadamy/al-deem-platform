import type { Metadata } from "next";
import Link from "next/link";
import { listCategories, listCourses, RequestError } from "@/lib/api";
import { CourseCard, EmptyState, ErrorState } from "@/components/catalog";
import { SiteHeader } from "@/components/chrome";

export const metadata: Metadata = {
  title: "الدورات",
  description: "تصفح الدورات التدريبية المعتمدة في مركز الديم للتدريب.",
};

// فلاتر الفئة والمستوى — روابط (server-rendered، بدون JS إلزامي)
const LEVELS = [
  { value: "", label: "جميع المستويات" },
  { value: "beginner", label: "مبتدئ" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "متقدم" },
] as const;

type SearchParams = Promise<{
  category?: string;
  level?: string;
  q?: string;
  page?: string;
}>;

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  let courses: Awaited<ReturnType<typeof listCourses>> = { items: [], total: 0 };
  let categories: Awaited<ReturnType<typeof listCategories>> = { items: [] };
  let error: string | null = null;

  try {
    const [c, cats] = await Promise.all([
      listCourses({
        category: sp.category,
        level: sp.level,
        q: sp.q,
        page,
        pageSize: 12,
      }),
      listCategories(),
    ]);
    courses = c;
    categories = cats;
  } catch (e) {
    error = e instanceof RequestError ? e.message : "تعذر تحميل الدورات";
  }
  const { items, total } = courses;

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="h-16 md:h-20" aria-hidden="true" />
      {/* رأس الصفحة — بأسلوب المرجع */}
      <header className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-br from-muted/20 to-background">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20 h-72 w-72 rounded-full bg-gradient-primary blur-3xl" />
          <div className="absolute bottom-10 right-20 h-80 w-80 rounded-full bg-gradient-accent blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full bg-gradient-primary/10 px-5 py-2.5">
            <span className="text-sm font-semibold text-primary">
              دوراتنا التدريبية
            </span>
          </div>
          <nav className="mb-3 text-sm text-muted-foreground" aria-label="مسار التنقل">
            <Link href="/" className="hover:text-primary">
              الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">الدورات</span>
          </nav>
          <h1 className="animate-fade-in bg-gradient-primary bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            برامج تدريبية متميزة
          </h1>
          <p className="mt-2 max-w-2xl leading-7 text-muted">
            برامج معتمدة بقيادة مدربين محترفين — شهادة إلكترونية قابلة للتحقق
            لكل دورة مكتملة.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {error ? (
          <ErrorState message={error} />
        ) : items.length === 0 && !sp.q ? (
          <EmptyState
            title="لا توجد دورات منشورة بعد"
            hint="الدورات تظهر هنا فور اعتمادها من فريق المراجعة."
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="لا نتائج مطابقة"
            hint="جرّب كلمات بحث مختلفة أو أزل الفلاتر."
          />
        ) : (
          <>
            {/* الفلاتر */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Link
                href={{ pathname: "/courses", query: {} }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  !sp.category
                    ? "bg-secondary text-secondary-foreground"
                    : "border border-border text-muted hover:border-primary hover:text-primary"
                }`}
              >
                كل الفئات
              </Link>
              {categories.items.map((cat) => {
                const active = sp.category === cat.slug;
                return (
                  <Link
                    key={cat.slug}
                    href={{
                      pathname: "/courses",
                      query: { category: cat.slug, level: sp.level },
                    }}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-secondary text-secondary-foreground"
                        : "border border-border text-muted hover:border-primary hover:text-primary"
                    }`}
                  >
                    {cat.nameAr}
                  </Link>
                );
              })}
              <span className="mx-1 h-6 w-px bg-border" aria-hidden />
              {LEVELS.map((lv) => {
                const active = (sp.level ?? "") === lv.value;
                return (
                  <Link
                    key={lv.label}
                    href={{
                      pathname: "/courses",
                      query: {
                        category: sp.category,
                        ...(lv.value ? { level: lv.value } : {}),
                      },
                    }}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/15 text-primary-dark"
                        : "text-muted hover:text-primary"
                    }`}
                  >
                    {lv.label}
                  </Link>
                );
              })}
            </div>

            {/* الشبكة */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>

            {/* ترقيم الصفحات */}
            {totalPages > 1 && (
              <nav
                className="mt-10 flex items-center justify-center gap-2"
                aria-label="ترقيم الصفحات"
              >
                {page > 1 && (
                  <Link
                    href={{
                      pathname: "/courses",
                      query: { ...sp, page: page - 1 },
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary"
                  >
                    السابق
                  </Link>
                )}
                <span className="text-sm text-muted">
                  صفحة {page} من {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={{
                      pathname: "/courses",
                      query: { ...sp, page: page + 1 },
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary"
                  >
                    التالي
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
