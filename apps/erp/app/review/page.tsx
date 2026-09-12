// مراجعة المحتوى — content_reviewer/system_admin: قائمة النشر والقرار.
import { auth } from "@/auth";
import Link from "next/link";
import { ReviewActions } from "./client";

export const metadata = { title: "مراجعة المحتوى" };

type Course = {
  id: string;
  title: string;
  summary: string;
  slug: string;
  status: string;
  level: string;
  description: string;
  durationHours: number;
  priceAmount: number;
  currency: string;
};

type Outline = { sections: { id: string; title: string; lessons: { id: string; title: string; type: string }[] }[] };

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export default async function ReviewPage() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;

  if (!token) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">سجّل الدخول أولًا</p>
      </div>
    );
  }

  const res = await fetch(`${API_BASE}/review/courses?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">
          مراجعة المحتوى لمراجعي المحتوى فقط — لا تملك الصلاحية.
        </p>
      </div>
    );
  }
  const data = (await res.json()) as { items: Course[]; total: number };
  const outlines = new Map<string, Outline>();
  await Promise.all(data.items.map(async (course) => {
    const response = await fetch(`${API_BASE}/courses/${course.id}/outline`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    if (response.ok) outlines.set(course.id, (await response.json()) as Outline);
  }));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="app-container py-8">
          <nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل">
            <Link href="/" className="hover:text-primary">الرئيسية</Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">مراجعة المحتوى</span>
          </nav>
          <p className="app-kicker">ضمان الجودة</p>
          <h1 className="app-title">دورات بانتظار المراجعة</h1>
          <p className="app-description">النشر يعرض الدورة للجمهور فورًا. الرفض يعيدها مسودة مع ملاحظاتك للمدرب.</p>
        </div>
      </header>

      <div className="app-page flex-1">
        {data.items.length === 0 ? (
          <div className="app-empty">
            <p className="font-semibold text-secondary">
              لا دورات بانتظار المراجعة ✓
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {data.items.map((c) => (
              <li
                key={c.id}
                className="app-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="font-bold text-secondary">{c.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {c.summary}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    المستوى: {c.level === "beginner" ? "مبتدئ" : c.level === "advanced" ? "متقدم" : "متوسط"} · {c.durationHours} ساعة · {c.priceAmount.toLocaleString("ar-EG")} {c.currency === "SDG" ? "ج.س" : c.currency}
                  </p>
                  {c.description && <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{c.description}</p>}
                  <details className="mt-3 rounded-lg bg-background px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-semibold text-secondary">مراجعة المنهج ({outlines.get(c.id)?.sections.reduce((count, section) => count + section.lessons.length, 0) ?? 0} درس)</summary>
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {(outlines.get(c.id)?.sections ?? []).map((section) => <div key={section.id}><p className="font-semibold text-secondary">{section.title}</p><ul className="mt-1 list-inside list-disc text-muted">{section.lessons.map((lesson) => <li key={lesson.id}>{lesson.title} — {lesson.type}</li>)}</ul></div>)}
                    </div>
                  </details>
                </div>
                <ReviewActions courseId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
