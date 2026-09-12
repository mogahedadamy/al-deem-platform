import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { listCategories, listCourses, RequestError } from "@/lib/api";
import { CourseCard, EmptyState, ErrorState } from "@/components/catalog";
import { Container, PageHero } from "@/components/ui";

export const metadata: Metadata = {
  title: "الدورات التدريبية",
  description: "تصفح برامج مركز العميد التدريبية واختر المستوى والمجال المناسب لهدفك.",
};

const LEVELS = [
  { value: "", label: "كل المستويات" },
  { value: "beginner", label: "مبتدئ" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "متقدم" },
] as const;

type SearchParams = Promise<{ category?: string; level?: string; q?: string; page?: string }>;

function filterHref(sp: Awaited<SearchParams>, patch: Record<string, string | undefined>) {
  const next = { q: sp.q, category: sp.category, level: sp.level, ...patch };
  return { pathname: "/courses", query: Object.fromEntries(Object.entries(next).filter(([, value]) => value)) };
}

export default async function CoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let courses: Awaited<ReturnType<typeof listCourses>> = { items: [], total: 0 };
  let categories: Awaited<ReturnType<typeof listCategories>> = { items: [] };
  let error: string | null = null;

  try {
    [courses, categories] = await Promise.all([
      listCourses({ category: sp.category, level: sp.level, q: sp.q, page, pageSize: 12 }),
      listCategories(),
    ]);
  } catch (reason) {
    error = reason instanceof RequestError ? reason.message : "تعذر تحميل الدورات";
  }

  const totalPages = Math.max(1, Math.ceil(courses.total / 12));

  return (
    <>
      <PageHero eyebrow="كتالوج البرامج" title="اختر المهارة التي تصنع خطوتك القادمة" description="ابحث في البرامج المهنية المتاحة، وقارن المستوى والمدة والرسوم قبل أن تبدأ.">
        <form action="/courses" method="get" role="search" className="mx-auto mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl border border-border bg-white p-2 shadow-md sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">ابحث باسم الدورة</span>
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={sp.q} placeholder="مثال: إدارة المشاريع أو اللغة الإنجليزية" className="h-12 w-full rounded-xl bg-transparent pr-12 pl-4 text-sm text-secondary outline-none" />
          </label>
          <button className="button button-primary h-12 sm:min-w-28" type="submit">بحث</button>
        </form>
      </PageHero>

      <section className="section-shell pt-8 md:pt-10">
        <Container>
          <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-black text-secondary"><SlidersHorizontal className="h-4 w-4 text-primary" /> تصفية النتائج</div>
            <div className="flex flex-wrap gap-2">
              <Link href={filterHref(sp, { category: undefined, page: undefined })} className={`inline-flex min-h-11 items-center rounded-full px-4 text-xs font-bold transition-colors ${!sp.category ? "bg-secondary text-white" : "border border-border text-muted-foreground hover:border-primary hover:text-primary-dark"}`}>كل الفئات</Link>
              {categories.items.map((category) => (
                <Link key={category.slug} href={filterHref(sp, { category: category.slug, page: undefined })} className={`inline-flex min-h-11 items-center rounded-full px-4 text-xs font-bold transition-colors ${sp.category === category.slug ? "bg-secondary text-white" : "border border-border text-muted-foreground hover:border-primary hover:text-primary-dark"}`}>{category.nameAr}</Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {LEVELS.map((level) => (
                <Link key={level.label} href={filterHref(sp, { level: level.value || undefined, page: undefined })} className={`inline-flex min-h-11 items-center rounded-full px-4 text-xs font-bold transition-colors ${(sp.level ?? "") === level.value ? "bg-primary-light text-primary-dark" : "text-muted-foreground hover:bg-surface-soft hover:text-secondary"}`}>{level.label}</Link>
              ))}
            </div>
          </div>

          {error ? <ErrorState message={error} /> : courses.items.length === 0 ? (
            <EmptyState title={sp.q || sp.category || sp.level ? "لا توجد نتائج مطابقة" : "لا توجد دورات منشورة بعد"} hint={sp.q || sp.category || sp.level ? "جرّب كلمة أخرى أو أزل بعض عوامل التصفية." : "ستظهر البرامج هنا فور اعتمادها."} />
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground">عرض <strong className="text-secondary">{courses.items.length}</strong> من <strong className="text-secondary">{courses.total}</strong> دورة</p>{sp.q && <p className="text-sm text-muted-foreground">نتائج البحث عن: <strong className="text-secondary">{sp.q}</strong></p>}</div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.items.map((course, index) => <CourseCard key={course.id} course={course} priority={index < 3} />)}</div>
              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-3" aria-label="ترقيم الصفحات">
                  {page > 1 && <Link href={filterHref(sp, { page: String(page - 1) })} className="button button-ghost">السابق</Link>}
                  <span className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-muted-foreground">صفحة {page} من {totalPages}</span>
                  {page < totalPages && <Link href={filterHref(sp, { page: String(page + 1) })} className="button button-secondary">التالي</Link>}
                </nav>
              )}
            </>
          )}
        </Container>
      </section>
    </>
  );
}
