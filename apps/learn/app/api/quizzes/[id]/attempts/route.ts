// Proxy — تقديم محاولة اختبار (التصحيح خادمي).
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "سجّل الدخول" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => null);
  if (!body?.enrollmentId || typeof body.answers !== "object") {
    return NextResponse.json(
      { error: "VALIDATION", message: "enrollmentId وanswers مطلوبان" },
      { status: 400 },
    );
  }
  const res = await fetch(
    `${API_BASE}/quizzes/${encodeURIComponent(id)}/attempts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        enrollmentId: body.enrollmentId,
        answers: body.answers,
      }),
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
