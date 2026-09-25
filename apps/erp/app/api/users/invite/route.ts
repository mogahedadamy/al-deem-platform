import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(request: Request) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) return NextResponse.json({ message: "سجّل الدخول أولاً" }, { status: 401 });
  const body = await request.json().catch(() => null) as { fullName?: unknown; email?: unknown; roleKey?: unknown } | null;
  if (!body || typeof body.fullName !== "string" || typeof body.email !== "string" || typeof body.roleKey !== "string") {
    return NextResponse.json({ message: "أدخل الاسم والبريد والدور المطلوب." }, { status: 400 });
  }
  const response = await fetch(`${API_BASE}/admin/invitations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
