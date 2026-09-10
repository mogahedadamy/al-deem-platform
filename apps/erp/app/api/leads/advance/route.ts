// Proxy — تقدم حالة استفسار (system_admin).
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
  const body = (await req.json().catch(() => null)) as {
    leadId?: string;
    status?: string;
    notes?: string;
  } | null;
  if (!body?.leadId || !body?.status) {
    return NextResponse.json(
      { error: "VALIDATION", message: "بيانات ناقصة" },
      { status: 400 },
    );
  }
  const res = await fetch(
    `${API_BASE}/erp/leads/${encodeURIComponent(body.leadId)}/advance`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: body.status, notes: body.notes ?? "" }),
    },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
