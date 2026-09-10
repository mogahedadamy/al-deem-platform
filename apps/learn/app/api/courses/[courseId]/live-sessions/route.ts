// Proxy — حصص الدورة المباشرة للطالب المسجّل.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "سجّل الدخول" },
      { status: 401 },
    );
  }
  const res = await fetch(
    `${API_BASE}/courses/${encodeURIComponent(courseId)}/live-sessions`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (res.status === 403) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "سجّل في الدورة لرؤية حصصها المباشرة" },
      { status: 403 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: "INTERNAL", message: "تعذر جلب الحصص" },
      { status: 500 },
    );
  }
  return NextResponse.json(await res.json());
}
