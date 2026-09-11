import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

async function accessToken() {
  const session = await auth();
  return (session as { accessToken?: string } | null)?.accessToken;
}

export async function GET(req: Request) {
  const token = await accessToken();
  if (!token) return NextResponse.json({ message: "سجّل الدخول" }, { status: 401 });
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ message: "courseId مطلوب" }, { status: 400 });
  const response = await fetch(`${API_BASE}/courses/${encodeURIComponent(courseId)}/outline`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: Request) {
  const token = await accessToken();
  if (!token) return NextResponse.json({ message: "سجّل الدخول" }, { status: 401 });
  const input = (await req.json().catch(() => null)) as { action?: string; courseId?: string; sectionId?: string; payload?: unknown } | null;
  if (!input?.action) return NextResponse.json({ message: "الإجراء مطلوب" }, { status: 400 });

  let path = "";
  let method = "POST";
  switch (input.action) {
    case "create": path = "/courses"; break;
    case "update": path = `/courses/${encodeURIComponent(input.courseId ?? "")}`; method = "PATCH"; break;
    case "section": path = `/courses/${encodeURIComponent(input.courseId ?? "")}/sections`; break;
    case "lesson": path = `/sections/${encodeURIComponent(input.sectionId ?? "")}/lessons`; break;
    case "submit": path = `/courses/${encodeURIComponent(input.courseId ?? "")}/submit`; break;
    case "schedule": path = "/live-sessions"; break;
    default: return NextResponse.json({ message: "إجراء غير صالح" }, { status: 400 });
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: input.action === "submit" ? undefined : JSON.stringify(input.payload ?? {}),
    cache: "no-store",
  });
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
