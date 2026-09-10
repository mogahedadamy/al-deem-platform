// Proxy للموظف المالي: رفض دفعة مع سبب إلزامي.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(req: Request) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "سجّل الدخول" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.paymentId || !body?.reason) {
    return NextResponse.json(
      { error: "VALIDATION", message: "paymentId وreason مطلوبان" },
      { status: 400 },
    );
  }
  const res = await fetch(
    `${API_BASE}/finance/payments/${encodeURIComponent(body.paymentId)}/reject`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: body.reason }),
      cache: "no-store",
    },
  );
  return new NextResponse(null, { status: res.status });
}
