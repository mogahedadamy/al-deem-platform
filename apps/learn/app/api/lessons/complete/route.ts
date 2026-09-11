import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(req: Request) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "سجّل الدخول" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    enrollmentId?: string;
    lessonId?: string;
  } | null;
  if (!body?.enrollmentId || !body.lessonId) {
    return NextResponse.json({ error: "VALIDATION", message: "بيانات الدرس ناقصة" }, { status: 400 });
  }
  const response = await fetch(
    `${API_BASE}/me/enrollments/${encodeURIComponent(body.enrollmentId)}/lessons/${encodeURIComponent(body.lessonId)}/complete`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
