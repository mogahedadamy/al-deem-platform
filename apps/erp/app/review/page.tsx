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
};

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

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <nav className="mb-2 text-sm text-muted">
            <Link href="/" className="hover:text-primary">
              الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">مراجعة المحتوى</span>
          </nav>
          <h1 className="text-2xl font-black text-secondary">
            دورات بانتظار المراجعة
          </h1>
          <p className="mt-1 text-sm text-muted">
            النشر يعرض الدورة للجمهور فورًا. الرفض يعيدها مسودة مع ملاحظاتك
            للمدرب.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <p className="font-semibold text-secondary">
              لا دورات بانتظار المراجعة ✓
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {data.items.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="font-bold text-secondary">{c.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {c.summary}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    المستوى: {c.level === "beginner" ? "مبتدئ" : c.level === "advanced" ? "متقدم" : "متوسط"}
                  </p>
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
