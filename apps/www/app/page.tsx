import Link from "next/link";
import { listCourses } from "@/lib/api";
import { CourseCard } from "@/components/catalog";

// الصفحة الرئيسية — تعرض أحدث الدورات المنشورة مباشرة من قاعدة البيانات
export default async function Home() {
  let latest: Awaited<ReturnType<typeof listCourses>>["items"] = [];
  try {
    const res = await listCourses({ pageSize: 3 });
    latest = res.items;
  } catch {
    latest = []; // الموقع يبقى عاملاً حتى لو تعطل الـAPI مؤقتًا
  }

  return (
    <div className="flex flex-col flex-1">
      {/* ===== Hero ===== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center md:py-28">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-3xl font-black text-primary shadow-lg">
            دي
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.3] text-secondary md:text-5xl">
            مركز الديم للتدريب
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            البوابة الرسمية للمركز — دورات احترافية في الإدارة والمالية
            وتقنية المعلومات واللغات، بقيادة مدربين معتمدين وشهادات إلكترونية
            قابلة للتحقق.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/courses"
              className="flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground transition-transform hover:scale-105"
            >
              استكشف الدورات
            </Link>
            <a
              href="https://learn.alameedtraining.com"
              className="flex h-12 items-center justify-center rounded-full border border-border px-8 font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
            >
              منصة التعلم
            </a>
          </div>
        </div>
      </section>

      {/* ===== أحدث الدورات ===== */}
      {latest.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 py-14" aria-labelledby="latest">
          <div className="mb-6 flex items-center justify-between">
            <h2 id="latest" className="text-2xl font-black text-secondary">
              أحدث الدورات
            </h2>
            <Link
              href="/courses"
              className="text-sm font-semibold text-primary-dark hover:text-primary"
            >
              عرض الكل ←
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {/* ===== مزايا المركز ===== */}
      <section className="border-t border-border bg-surface" aria-labelledby="why">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 id="why" className="mb-8 text-center text-2xl font-black text-secondary">
            لماذا مركز الديم؟
          </h2>
          <div className="grid gap-8 text-center sm:grid-cols-3">
            <div className="flex flex-col items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary-dark">
                ✦
              </span>
              <h3 className="font-bold text-secondary">مدربون معتمدون</h3>
              <p className="text-sm leading-6 text-muted">
                خبراء مختارون بعناية في كل تخصص، مع مراجعة جودة لكل دورة قبل
                نشرها.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary-dark">
                ◈
              </span>
              <h3 className="font-bold text-secondary">شهادة إلكترونية</h3>
              <p className="text-sm leading-6 text-muted">
                شهادة رقمية معتمدة تصدر بعد اجتياز الاختبار، ويمكن طلب نسخة
                ورقية رسمية.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary-dark">
                ⌘
              </span>
              <h3 className="font-bold text-secondary">مرونة كاملة</h3>
              <p className="text-sm leading-6 text-muted">
                تعلّم في وقتك عبر دروس مسجلة، مع حصص مباشرة اختيارية حسب
                الدورة.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
