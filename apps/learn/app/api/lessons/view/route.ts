// Proxy — مشاهدة درس (entitlement خادمي + تسجيل المشاهدة + التقدم).
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function GET(req: Request) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "سجّل الدخول" },
      { status: 401 },
    );
  }
  const url = new URL(req.url);
  const enrollmentId = url.searchParams.get("enrollmentId");
  const lessonId = url.searchParams.get("lessonId");
  if (!enrollmentId || !lessonId) {
    return NextResponse.json(
      { error: "VALIDATION", message: "enrollmentId وlessonId مطلوبان" },
      { status: 400 },
    );
  }
  const res = await fetch(
    `${API_BASE}/me/enrollments/${encodeURIComponent(enrollmentId)}/lessons/${encodeURIComponent(lessonId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    // أسباب الرفض من الخادم: 403 غير مسجّل/غير نشط أو درس من دورة أخرى، 404 غير موجود
    const msg =
      res.status === 403
        ? "لا يمكنك مشاهدة هذا الدرس — تسجيلك غير نشط في الدورة"
        : res.status === 404
          ? "الدرس غير موجود"
          : "تعذر جلب الدرس";
    return NextResponse.json(
      { error: String(res.status), message: msg },
      { status: res.status },
    );
  }
  return NextResponse.json(await res.json());
}
