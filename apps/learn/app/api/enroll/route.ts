// Server Actions proxies — تمرر access token من الجلسة (لا يُكشف للعميل أبدًا).
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(req: Request) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "سجّل الدخول أولًا" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.courseId) {
    return NextResponse.json({ error: "VALIDATION", message: "courseId مطلوب" }, { status: 400 });
  }
  const res = await fetch(`${API_BASE}/enrollments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ courseId: body.courseId }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? {}, { status: res.status });
}
