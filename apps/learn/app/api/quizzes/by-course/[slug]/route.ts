// Proxy — جلب اختبار الدورة للطالب (الأسئلة بلا إجابات) عبر slug.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

// GET /api/quizzes/by-course/{slug} — quiz meta + الأسئلة الآمنة للمصادق عليهم
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "سجّل الدخول" },
      { status: 401 },
    );
  }
  // 1) meta بالـslug (عام) — يعرف quiz id
  const metaRes = await fetch(
    `${API_BASE}/public/courses/${encodeURIComponent(slug)}/quiz`,
    { cache: "no-store" },
  );
  if (metaRes.status === 404) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "لا اختبار لهذه الدورة" },
      { status: 404 },
    );
  }
  if (!metaRes.ok) {
    return NextResponse.json(
      { error: "INTERNAL", message: "تعذر جلب الاختبار" },
      { status: 500 },
    );
  }
  const meta = (await metaRes.json()) as { id: string };
  // 2) الأسئلة الآمنة (مصادق) — correct غير موجود بنيويًا
  const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(meta.id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: String(res.status), message: "تعذر جلب الأسئلة" },
      { status: res.status },
    );
  }
  return NextResponse.json(await res.json());
}
