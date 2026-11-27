import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NewCourseForm } from "./course-form";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export const metadata = { title: "إنشاء دورة" };

export default async function NewCoursePage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/instructor/courses/new");
  const categoriesResponse = await fetch(`${API_BASE}/public/categories`, { next: { revalidate: 300 } }).catch(() => null);
  const categories = categoriesResponse?.ok
    ? ((await categoriesResponse.json()) as { items: { id: string; nameAr: string }[] }).items
    : [];
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 md:px-6">
      <nav className="mb-4 text-sm text-muted" aria-label="مسار التنقل"><Link href="/dashboard" className="inline-flex min-h-11 items-center font-bold hover:text-primary-dark">لوحة التحكم</Link><span className="mx-2" aria-hidden="true">/</span><span aria-current="page">دورة جديدة</span></nav>
      <p className="text-sm font-semibold text-primary-dark">مساحة المدرب</p>
      <h1 className="mt-2 text-3xl font-black text-secondary">إنشاء دورة جديدة</h1>
      <p className="mt-2 leading-7 text-muted">ابدأ بالمعلومات الأساسية، ثم أضف الأقسام والدروس قبل إرسال الدورة للمراجعة.</p>
      <ol className="mt-6 grid gap-2 text-sm sm:grid-cols-3" aria-label="خطوات إنشاء الدورة"><li className="rounded-xl bg-secondary px-4 py-3 font-bold text-white">1. المعلومات الأساسية</li><li className="rounded-xl bg-surface-soft px-4 py-3 text-muted">2. المنهج وروابط CDN</li><li className="rounded-xl bg-surface-soft px-4 py-3 text-muted">3. المراجعة والنشر</li></ol>
      <NewCourseForm categories={categories} />
    </div>
  );
}
