import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

async function token() {
  const session = await auth();
  return (session as { accessToken?: string } | null)?.accessToken;
}

export async function GET() {
  const accessToken = await token();
  if (!accessToken) return NextResponse.json({ message: "سجّل الدخول أولاً" }, { status: 401 });
  const response = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function PATCH(request: Request) {
  const accessToken = await token();
  if (!accessToken) return NextResponse.json({ message: "سجّل الدخول أولاً" }, { status: 401 });
  const body = await request.json().catch(() => null) as { fullName?: unknown; phone?: unknown; bio?: unknown } | null;
  if (!body || [body.fullName, body.phone, body.bio].some((value) => value !== undefined && typeof value !== "string")) {
    return NextResponse.json({ message: "بيانات الملف الشخصي غير صالحة" }, { status: 400 });
  }
  const response = await fetch(`${API_BASE}/me/profile`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
