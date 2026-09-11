import { auth } from "@/auth";
import { redirect } from "next/navigation";
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
      <p className="text-sm font-semibold text-primary-dark">مساحة المدرب</p>
      <h1 className="mt-2 text-3xl font-black text-secondary">إنشاء دورة جديدة</h1>
      <p className="mt-2 leading-7 text-muted">ابدأ بالمعلومات الأساسية، ثم أضف الأقسام والدروس قبل إرسال الدورة للمراجعة.</p>
      <NewCourseForm categories={categories} />
    </div>
  );
}
