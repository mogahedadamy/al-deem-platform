// Proxy — نشر/رفض دورة (content_reviewer).
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(req: Request) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "سجّل الدخول" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => null);
  if (!body?.courseId) {
    return NextResponse.json(
      { error: "VALIDATION", message: "courseId مطلوب" },
      { status: 400 },
    );
  }

  const isReject = Boolean(body.notes !== undefined);
  const res = await fetch(
    `${API_BASE}/review/courses/${encodeURIComponent(body.courseId)}/${isReject ? "reject" : "publish"}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(isReject ? { body: JSON.stringify({ notes: body.notes ?? "" }) } : {}),
      cache: "no-store",
    },
  );
  return new NextResponse(null, { status: res.status });
}
