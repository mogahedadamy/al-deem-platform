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
  const query = new URL(req.url).searchParams;
  const resource = query.get("resource");
  const courseId = query.get("courseId");
  const endpoint = resource === "sessions"
    ? "/live-sessions/mine"
    : courseId ? `/courses/${encodeURIComponent(courseId)}/outline` : null;
  if (!endpoint) return NextResponse.json({ message: "courseId مطلوب" }, { status: 400 });
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: Request) {
  const token = await accessToken();
  if (!token) return NextResponse.json({ message: "سجّل الدخول" }, { status: 401 });
  const input = (await req.json().catch(() => null)) as { action?: string; courseId?: string; sectionId?: string; lessonId?: string; sessionId?: string; payload?: unknown } | null;
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
    case "quiz": path = "/quizzes"; break;
    case "advanceSession": path = `/live-sessions/${encodeURIComponent(input.sessionId ?? "")}/advance`; break;
    case "updateSection": path = `/courses/${encodeURIComponent(input.courseId ?? "")}/sections/${encodeURIComponent(input.sectionId ?? "")}`; method = "PATCH"; break;
    case "deleteSection": path = `/courses/${encodeURIComponent(input.courseId ?? "")}/sections/${encodeURIComponent(input.sectionId ?? "")}`; method = "DELETE"; break;
    case "updateLesson": path = `/lessons/${encodeURIComponent(input.lessonId ?? "")}`; method = "PATCH"; break;
    case "deleteLesson": path = `/lessons/${encodeURIComponent(input.lessonId ?? "")}`; method = "DELETE"; break;
    default: return NextResponse.json({ message: "إجراء غير صالح" }, { status: 400 });
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: ["submit", "deleteSection", "deleteLesson"].includes(input.action) ? undefined : JSON.stringify(input.payload ?? {}),
    cache: "no-store",
  });
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
